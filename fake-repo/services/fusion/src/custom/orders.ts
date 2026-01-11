import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import {
  constructPipeline,
  Pipeline,
  PubSubSource,
  MongoDbSink,
  PubSubSink,
  PubSubSinkInput,
  NonRetryableError,
} from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { shopDataDcl } from '@tw/utils/module/dcl';
import moment from 'moment-timezone';
import { CUSTOM_MSP_ACCOUNT, CUSTOM_MSP_PLATFORM, Order, orderSchema, Shipping } from './types';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { resolveIntegration } from './utils/integrations';
import { PixelMetaData, PixelConversionEvent, GenericConversion } from '@tw/types/module/pixel';
import { handleError, formatZodError } from './utils/errors';
import { ShopWithSensory } from '@tw/types';
import { MongoError } from 'mongodb';
import { callServiceEndpoint } from '@tw/utils/module/callServiceEndpoint';
import { getTimelineValue } from '@tw/utils/module/timeline';
import {
  isEmailBlacklisted,
  isPhoneBlacklisted,
  isCustomerIdBlacklisted,
  addToRedisBlacklist,
} from './utils/util';
import { validateBulkBody } from './utils/bulkUtils';

async function bulkCustomOrders(req: Request, res: Response) {
  let {
    body: { orders, shop },
  } = req;
  const { success, message } = validateBulkBody(orders);
  if (!success) {
    return res.status(400).send({ success: false, message });
  }
  const errors: { order_id: string; error: string }[] = [];
  for (const order of orders) {
    try {
      try {
        order.shop = shop; // security only checks the payload level shop
        const validatedOrder = await validateOrder(order);
        if (moment.utc(validatedOrder.created_at).isAfter(moment.utc())) {
          errors.push({ order_id: validatedOrder.order_id, error: 'Order received in the future' });
          continue;
        }
        order.user = req.user;
        await callPubSub('api-custom-orders', validatedOrder, {}, { forceCloud: true });
      } catch (error) {
        errors.push({ order_id: order.order_id, error: formatZodError(error as any) });
      }
    } catch (error) {
      return handleError(error, res);
    }
  }
  logger.info(
    `${orders?.length} orders received with ${errors?.length} errors`,
    JSON.stringify(errors),
  );
  if (errors?.length) {
    return res.status(400).send({ success: false, message: 'Validation errors', errors });
  }
  return res.status(200).send({ success: true, message: `${orders.length} orders received` });
}

export async function customOrders(req: Request, res: Response, bulk?: boolean) {
  if (bulk) {
    return bulkCustomOrders(req, res);
  } else {
    let { body } = req;
    logger.info('Received order', body.shop, JSON.stringify(body));
    try {
      body = await validateOrder(body);
      logger.info(`Order validated: shop: ${body.shop} order_id: ${body.order_id}`);
      body.user = req.user;
      if (moment.utc(body.created_at).isAfter(moment.utc())) {
        return res.status(400).send({
          success: false,
          message:
            "Order received in the future. \ncreated_at can't be in the future. \nthis might be a timezone issue",
        });
      }
      await callPubSub('api-custom-orders', body, {}, { forceCloud: true });
      return res.status(200).send({ success: true, message: 'Order received' });
    } catch (error) {
      return handleError(error, res);
    }
  }
}

type ExtraFields = {
  integration_id: string;
  timezone: string;
  event_date: string;
  previous_version: Order | null;
};

constructPipeline(async () => {
  const ordersMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-orders',
  })
    .index({ shop: 1, order_id: 1 }, { name: 'shop_order_id' })
    .index({ shop: 1, 'customer.id': 1, created_at: -1 })
    .index({ shop: 1, 'customer.email': 1, created_at: -1 })
    .index({
      integration_id: 1,
      'customer.id': 1,
      'customer.email': 1,
      'customer.phone': 1,
      created_at: -1,
    })
    .index({ integration_id: 1, order_id: 1 }, { name: 'integration_id_order_id', unique: true })
    .index({ integration_id: 1, 'customer.id': 1 }, { name: 'integration_id_customer_id' })
    .index({ integration_id: 1, 'customer.email': 1 }, { name: 'integration_id_customer_email' })
    .index({ integration_id: 1, 'customer.phone': 1 }, { name: 'integration_id_customer_phone' })
    .index({ shop: 1, tripleCoo: 1 }, { name: 'shop_tripleCoo' })
    .index({ integration_id: 1, tw_ingest_time: -1 }, { name: 'integration_id_tw_ingest_time' })
    .on('error', (err) => {
      if (err instanceof MongoError && err.code === 11000) {
        return;
      } else {
        throw err;
      }
    });
  if (!ordersMongoSink.collection) {
    await ordersMongoSink.start();
  }

  const pixelSink = new PubSubSink({ topicName: 'new-custom-api-incoming' });
  const shippingPubSubSink = new PubSubSink({ topicName: 'api-custom-shipping' });

  const p = new Pipeline(
    'api-custom-orders-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-orders-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (order: Order) => {
      const integrationId = await resolveIntegration({
        shop: order.shop,
        asset: 'orders',
        channel: order?.platform ?? CUSTOM_MSP_PLATFORM,
        account: order?.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      });
      return { ...order, integration_id: integrationId };
    })
    .apply(async (order) => {
      const { timezone } = await shopDataDcl.fetchMethod({
        shopId: order.shop,
      });
      return {
        ...order,
        timezone,
        event_date: moment.utc(order.created_at).tz(timezone).format('YYYY-MM-DD'),
      };
    })
    .apply(
      async (order: Order & { timezone: string; event_date: string; integration_id: string }) => {
        const previousVersion = (
          await ordersMongoSink.collection.findOne({
            integration_id: order.integration_id,
            order_id: order.order_id,
          })
        )?.data as Order;

        const missingRefunds = (previousVersion?.refunds || []).filter(
          (refund) => !(order.refunds || []).some((r) => r.refund_id === refund.refund_id),
        );
        if (missingRefunds?.length) {
          order.refunds.push(...missingRefunds);
        }

        return {
          ...order,
          ...(previousVersion && { previous_version: previousVersion }),
        };
      },
    );

  p.apply(
    MongoDbSink.createUpdateOneTransform((order: Order & { integration_id: string }) => ({
      integration_id: order.integration_id,
      order_id: order.order_id,
      $and: [
        {
          $or: [
            { platform: order.platform ?? CUSTOM_MSP_PLATFORM },
            { platform: { $exists: false } },
          ],
        },
        {
          $or: [
            { platform_account_id: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT },
            { platform_account_id: { $exists: false } },
          ],
        },
      ],
    })),
  )
    .addSink(ordersMongoSink)
    .onFinalize('custom-carts-new-customer-pipeline')
    .apply((data: any) => data.updateOne?.update.$set)
    .apply(async (order: Order & ExtraFields) => {
      const {
        order_id: orderId,
        shop,
        customer: { email, id: customerId, phone },
      } = order;
      const isSubscription = !!order.subscription_id;

      if (
        await Promise.all([
          isEmailBlacklisted(order),
          isPhoneBlacklisted(order),
          isCustomerIdBlacklisted(order),
        ]).then((results) => results.some((result) => result))
      ) {
        return {
          ...order,
          tw_is_first_order: false,
          ...(isSubscription && { tw_is_new_customer_in_subscription: false }),
        };
      }

      const customerOrdersBeforeMerge = await ordersMongoSink.collection
        .find(
          {
            integration_id: order.integration_id,
            $or: [
              { 'customer.id': order.customer?.id },
              ...(!!order.customer?.email ? [{ 'customer.email': order.customer.email }] : []),
              ...(!!order.customer?.phone ? [{ 'customer.phone': order.customer.phone }] : []),
            ],
          },
          {
            projection: {
              order_id: 1,
              'customer.id': 1,
              'customer.email': 1,
              'customer.phone': 1,
              integration_id: 1,
              tw_is_first_order: 1,
              tw_is_first_order_in_subscription: 1,
            },
          },
        )
        .toArray();

      if (customerOrdersBeforeMerge.length >= 100) {
        const results = (await ordersMongoSink.collection
          .aggregate([
            {
              $match: {
                integration_id: order.integration_id,
                $or: [
                  { 'customer.id': order.customer?.id },
                  ...(!!order.customer?.email ? [{ 'customer.email': order.customer.email }] : []),
                  ...(!!order.customer?.phone ? [{ 'customer.phone': order.customer.phone }] : []),
                ],
              },
            },
            {
              $facet: {
                customerIdCount: [
                  { $match: { 'customer.id': order.customer?.id } },
                  { $count: 'count' },
                ],
                ...(order.customer?.email
                  ? {
                      emailCount: [
                        {
                          $match: {
                            'customer.email': order.customer.email,
                          },
                        },
                        { $count: 'count' },
                      ],
                    }
                  : {}),
                ...(order.customer?.phone
                  ? {
                      phoneCount: [
                        {
                          $match: {
                            'customer.phone': order.customer.phone,
                          },
                        },
                        { $count: 'count' },
                      ],
                    }
                  : {}),
              },
            },
          ])
          .toArray()) as any;
        const [{ customerIdCount, emailCount, phoneCount }] = results;
        if (customerIdCount && customerIdCount[0].count >= 100) {
          await addToRedisBlacklist(order.shop, order.customer?.id ?? '', 'customerId');
        }
        if (emailCount && emailCount[0].count >= 100) {
          await addToRedisBlacklist(order.shop, order.customer?.email ?? '', 'email');
        }
        if (phoneCount && phoneCount[0].count >= 100) {
          await addToRedisBlacklist(order.shop, order.customer?.phone ?? '', 'phone');
        }
        return {
          ...order,
          tw_is_first_order: false,
          ...(isSubscription && { tw_is_first_order_in_subscription: false }),
        };
      }

      const customerOrdersBeforeMergeMap = new Map(
        customerOrdersBeforeMerge.map((order) => [order.order_id, order]),
      );
      const pipeline = [
        {
          $match: {
            integration_id: order.integration_id,
            $or: [
              { 'customer.id': customerId },
              ...(!!email ? [{ 'customer.email': email }] : []),
              ...(!!phone ? [{ 'customer.phone': phone }] : []),
            ],
          },
        },
        {
          $addFields: {
            customer_email: '$customer.email',
            customer_id: '$customer.id',
            customer_phone: '$customer.phone',
            prev_tw_is_first_order: {
              $ifNull: ['$tw_is_first_order', false],
            },
            ...(isSubscription && {
              prev_tw_is_first_order_in_subscription: {
                $ifNull: ['$tw_is_first_order_in_subscription', false],
              },
            }),
          },
        },
        {
          $setWindowFields: {
            partitionBy: '',
            sortBy: {
              created_at: 1,
            },
            output: {
              order_number: {
                $documentNumber: {},
              },
            },
          },
        },
        ...(isSubscription
          ? [
              {
                $setWindowFields: {
                  partitionBy: '$subscription_id',
                  sortBy: { created_at: 1 },
                  output: { in_subscription_number: { $documentNumber: {} } },
                },
              },
            ]
          : []),
        {
          $addFields: {
            tw_is_first_order: {
              $eq: ['$order_number', 1], // Set tw_is_first_order to true if order_number is 1
            },
            ...(isSubscription && {
              tw_is_first_order_in_subscription: {
                $eq: ['$in_subscription_number', 1],
              },
            }),
          },
        },
        {
          $match: {
            $or: [
              {
                $expr: {
                  $ne: ['$tw_is_first_order', '$prev_tw_is_first_order'],
                },
              },
              { $expr: { $eq: ['$order_id', orderId] } }, // Include the original order in the update
              ...(isSubscription
                ? [
                    {
                      $expr: {
                        $ne: [
                          '$tw_is_first_order_in_subscription',
                          '$prev_tw_is_first_order_in_subscription',
                        ],
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        {
          $project: {
            order_id: 1,
            tw_is_first_order: 1,
            ...(isSubscription && {
              tw_is_first_order_in_subscription: 1,
            }),
          },
        },
        {
          $merge: {
            into: 'custom-orders',
            on: '_id',
            whenMatched: 'merge',
            whenNotMatched: 'discard',
          },
        },
      ];
      await ordersMongoSink.collection
        .aggregate(pipeline, { readPreference: 'primaryPreferred' })
        .toArray();
      const customerOrdersAfterMerge = await ordersMongoSink.collection
        .find({
          integration_id: order.integration_id,
          $or: [
            { 'customer.id': customerId },
            ...(!!email ? [{ 'customer.email': email }] : []),
            ...(!!phone ? [{ 'customer.phone': phone }] : []),
          ],
        })
        .toArray();

      const ordersToUpdate = customerOrdersAfterMerge.filter((order) => {
        const orderBeforeMerge = customerOrdersBeforeMergeMap.get(order.order_id);
        return (
          orderBeforeMerge?.tw_is_first_order !== order.tw_is_first_order ||
          order.order_id === orderId ||
          orderBeforeMerge?.tw_is_first_order_in_subscription !==
            order.tw_is_first_order_in_subscription
        );
      });
      return ordersToUpdate as any;
    })
    .apply((order: Order & ExtraFields & { tw_is_first_order_in_subscription: boolean }) => {
      return {
        ...order,
        integration_id: order.integration_id,
        account_id: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        provider_account: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        source_name: order.source_name,
        bu_id: order.shop,
        provider_id: order.platform ?? CUSTOM_MSP_PLATFORM,
        order_id: order.order_id.toString(),
        created_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        processed_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        event_date:
          order.event_date ??
          moment
            .utc(order.created_at)
            .tz((order as any).timezone ?? (order as any).shopDoc?.timezone ?? 'America/New_York')
            .format('YYYY-MM-DD'),
        order_name: order.name ?? order.order_id.toString(),
        fulfillment_status: order.status,
        customer_id: order.customer?.id,
        customer_first_name: order.customer?.first_name,
        customer_last_name: order.customer?.last_name,
        customer_email: order.customer?.email,
        line_items: (order.line_items || []).map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name ?? item.name,
          product_type: item.product_type,
          vendor: item.vendor,
          product_tags: item.product_tags,
          title: item.product_name ?? item.name,
          line_item_id: item.id,
          name: item.product_name ?? item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          variant_id: item.variant_id,
          variant_name: item.variant_name,
          tax_lines: item.tax_lines,
        })),
        shipping_address1: order.shipping_address?.address_1,
        shipping_address2: order.shipping_address?.address_2,
        shipping_city: order.shipping_address?.city,
        shipping_country: order.shipping_address?.country,
        shipping_country_code: order.shipping_address?.country_code,
        shipping_zip: order.shipping_address?.zip,
        shipping_province:
          order.shipping_address?.state_code ?? order.shipping_address?.province_code,
        shipping_lines: order.shipping_lines,
        tw_shipping_price: order.shipping_price,
        total_discounts: order.discount_amount ?? order.total_discounts,
        total_price: order.order_revenue,
        total_tax: order.taxes,
        taxes_included: order.taxes_included,
        tax_lines: order.tax_lines,
        tw_total_items: (order.line_items || []).reduce((acc, item) => acc + item.quantity, 0),
        tw_ignore_order: order.void,
        tw_custom_expenses: order.custom_expenses,
        is_subscription_order: !!order.subscription_id,
        gross_product_sales: (order.line_items || []).reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        ),
        payment_gateway_names: order.payment_gateway_names,
        tw_payment_gateway_names: order.payment_gateway_names?.[0],
        tw_total_refund: (order.refunds || [])
          .filter((refund) => !refund.void)
          .reduce((acc, refund) => acc + Math.abs(refund.total_refund) * -1, 0),
        tags: [
          ...(order.tags || []),
          ...(order.subscription_id
            ? order.tw_is_first_order_in_subscription
              ? ['Subscription First Order', 'Subscription']
              : ['Subscription', 'Subscription Recurring Order']
            : []),
        ],
      };
    })
    .extend(createSonicStreamPipeline({ name: 'orders' }));

  p.filter(
    (order: Order & { integration_id: string }) => !!order.payment_gateway_names?.length,
  ).apply(async (order: Order & { integration_id: string }) => {
    const promises = (order.payment_gateway_names || []).map(async (name) => {
      return callServiceEndpoint(
        'shopify',
        'update-segment',
        {
          attributes: {
            shopId: order.shop,
            integrationId: order.integration_id,
            dataType: 'payment_gateway_costs',
            msp: 'custom-msp',
          },
          data: { name: name },
        },
        { method: 'POST', deployment: 'webhooks' },
      );
    });
    await Promise.all(promises || []);
  });

  p.apply(
    async (order: Order & { timezone: string; event_date: string; integration_id: string }) => {
      return (order.refunds || []).map((refund) => ({
        integration_id: order.integration_id,
        account_id: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        provider_account: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        bu_id: order.shop,
        provider_id: CUSTOM_MSP_PLATFORM,
        order_id: order.order_id.toString(),
        refund_id: refund.refund_id.toString(),
        created_at: moment.utc(refund.refunded_at).format('YYYY-MM-DD HH:mm:ss'),
        processed_at: moment.utc(refund.refunded_at).format('YYYY-MM-DD HH:mm:ss'),
        order_processed_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        event_date: moment(refund.refunded_at).tz(order.timezone).format('YYYY-MM-DD'),
        order_date:
          order.event_date ??
          moment
            .utc(order.created_at)
            .tz(order.timezone ?? (order as any).shopDoc?.timezone ?? 'America/New_York')
            .format('YYYY-MM-DD'),
        total_refund: Math.abs(refund.total_refund) * -1,
        refund_line_item: (refund.line_items || []).map((item) => ({
          refund_line_item_id: item.id,
          line_item_id: item.line_item_id?.toString(),
          quantity: item.quantity,
          product_id: item.product_id,
          variant_id: item.variant_id,
          price: item.price,
          currency: item.currency,
          total_discount: item.total_discount,
          tax_lines: item.tax_lines,
        })),
        total_refund_tax: refund.total_tax_refund,
        total_refund_shipping: refund.total_shipping_refund,
        tags: refund.tags,
        tw_ignore_order: (refund.void || order.void) ?? false,
      }));
    },
  ).extend(createSonicStreamPipeline({ name: 'refunds' }));

  p.apply(
    async (order: Order & { event_date: string; integration_id: string; timezone: string }) => {
      return (order.line_items || []).map((item) => ({
        integration_id: order.integration_id,
        account_id: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        provider_account: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        bu_id: order.shop,
        provider_id: CUSTOM_MSP_PLATFORM,
        order_id: order.order_id.toString(),
        event_date:
          order.event_date ??
          moment
            .utc(order.created_at)
            .tz(order.timezone ?? (order as any).shopDoc?.timezone ?? 'America/New_York')
            .format('YYYY-MM-DD'),
        created_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        processed_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        tw_ignore_order: order.void,
        line_item_id: item.id,
        name: item.name,
        price: item.price,
        product_id: item.product_id,
        title: item.name,
        quantity: item.quantity,
        sku: item.sku,
        variant_id: item.variant_id,
        variant_title: item.variant_name,
        tax_lines: item.tax_lines,
        gross_sales: item.price * item.quantity,
        currency: order.currency,
      }));
    },
  ).extend(createSonicStreamPipeline({ name: 'orders-shopify-line-items' }));

  p.apply(async (order: Order & ExtraFields) => {
    return (order.previous_version?.line_items || [])
      ?.filter((item) =>
        order.line_items.some((li) => li.id === item.id && li.variant_id !== item.variant_id),
      )
      .map((item) => ({
        integration_id: order.integration_id,
        account_id: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        provider_account: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        bu_id: order.shop,
        provider_id: CUSTOM_MSP_PLATFORM,
        order_id: order.order_id.toString(),
        event_date:
          order.event_date ??
          moment
            .utc(order.created_at)
            .tz(order.timezone ?? (order as any).shopDoc?.timezone ?? 'America/New_York')
            .format('YYYY-MM-DD'),
        created_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        processed_at: moment.utc(order.created_at).format('YYYY-MM-DD HH:mm:ss'),
        tw_ignore_order: true,
        line_item_id: item.id,
        name: item.name,
        price: item.price,
        product_id: item.product_id,
        title: item.name,
        quantity: item.quantity,
        sku: item.sku,
        variant_id: item.variant_id,
        variant_title: item.variant_name,
        tax_lines: item.tax_lines,
        gross_sales: item.price * item.quantity,
        currency: order.currency,
      }));
  }).extend(createSonicStreamPipeline({ name: 'orders-shopify-line-items' }));

  p.filter((order: Order) => moment(order.created_at).isAfter(moment().subtract(15, 'day')))
    // .filter((order: Order) => !order.subscription_id)
    .apply(async (order: Order & { integration_id: string }) => {
      let shopDoc = await shopDataDcl.fetchMethod({
        shopId: order.shop,
      });
      if (!shopDoc) {
        throw new NonRetryableError('Shop not found');
      }
      let cogs = 0;

      const { msp } = shopDoc;

      try {
        cogs = (
          await callServiceEndpoint('api-fetcher', 'orders/calc-costs', {
            order,
            shopId: order.shop,
            orderId: order.order_id,
            integrationId: order.integration_id,
          })
        ).data;
      } catch (e) {
        logger.error('Error calculating cogs', e);
      }

      return pixelSink.createRecord({
        data: {
          //@ts-ignore
          order: {
            id: order.order_id,
            shopCode: '',
            shopDomain: order.shop,
            platform: msp,
            app_id: 0,
            created_at: order.created_at,
            client_details: {},
            processed_at: order.created_at,
            cogs,
            currency: order.currency,
            customer: {
              id: order.customer?.id,
              first_name: order.customer?.first_name,
              last_name: order.customer?.last_name,
              email: order.customer?.email,
              phone: order.customer?.phone,
            },
            checkout_token: '',
            cart_token: '',
            discount_codes: (order.discount_codes || []).map((code) => {
              return {
                code: code.code?.trim() ?? '',
              };
            }),
            landing_site: '',
            landing_site_ref: '',
            line_items: (order.line_items || []).map((item) => ({
              id: item.id,
              gift_card: false,
              name: item.name,
              price: item.price,
              product_id: item.product_id,
              quantity: item.quantity,
              tax_code: '',
              title: item.name,
              total_discount: '',
              variant_id: item.variant_id,
            })),
            order_status_url: '',
            name: order.name,
            payment_gateway_names: [],
            referring_site: '',
            shipping_address: {
              zip: order.shipping_address?.zip,
              city: order.shipping_address?.city,
              country_code: order.shipping_address?.country_code,
              province_code:
                order.shipping_address?.state_code ?? order.shipping_address?.province_code,
            },
            source_name: '',
            tags: (order.tags || []).join(','),
            total_price: order.order_revenue,
          } as GenericConversion,
          pixelMetaData: {
            integrationId: (order as Order & { integration_id: string }).integration_id,
            platform: order.platform ?? CUSTOM_MSP_PLATFORM,
            accountId: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
          } as PixelMetaData,
        } as PixelConversionEvent,
      });
    })
    .addSink(pixelSink);

  p.filter((order: Order) => !!order.shipping_costs)
    .apply((order: Order) => {
      return shippingPubSubSink.createRecord({
        data: {
          shop: order.shop,
          platform: order.platform ?? CUSTOM_MSP_PLATFORM,
          platform_account_id: order.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
          order_id: order.order_id,
          shipping_costs: order.shipping_costs,
        },
      });
    })
    .addSink(shippingPubSubSink);

  return p.pipeline;
});

async function validateOrder(order: any): Promise<Order> {
  return await orderSchema.parse(order);
}
