import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import {
  constructPipeline,
  Pipeline,
  PubSubSource,
  MongoDbSink,
  PubSubSink,
  NonRetryableError,
} from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import {
  CUSTOM_MSP_PLATFORM,
  CUSTOM_PLATFORM_ACCOUNT,
  OrdersEnrichment,
  ordersEnrichmentSchema,
} from './types';
import { shopDataDcl } from '@tw/utils/module/dcl';
import { handleError } from './utils/errors';
import { MongoError } from 'mongodb';
import { resolveIntegration } from './utils/integrations';
import { createSonicStreamPipeline } from '@tw/sonic-tools';

export async function customOrderEnrichment(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received orders enrichment', body.shop, JSON.stringify(body));
  try {
    body = await validateOrderEnrichment(body);
    logger.info(`Order Enrichment validated: shop: ${body.shop} order_id: ${body.order_id}`);
    body.user = req.user;
    await callPubSub('api-custom-orders-enrichment', body);
    res.status(200).send({ success: true, message: 'orders enrichment received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const ordersEnrichmentMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-orders-enrichment',
  })
    .index({ shop: 1, platform: 1, order_id: 1 }, { unique: true })
    .on('error', (err) => {
      if (err instanceof MongoError && err.code === 11000) {
        return;
      } else {
        throw err;
      }
    });

  const woocommerceMongodbSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'woocommerce-pipeline' },
    collection: 'orders',
  });

  const bigcommerceMongodbSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'bigcommerce-pipeline' },
    collection: 'orders',
  });

  const shippingPubSubSink = new PubSubSink({ topicName: 'api-custom-shipping' });

  const p = new Pipeline(
    'api-custom-orders-enrichment-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-orders-enrichment-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (ordersEnrichment: OrdersEnrichment) => {
      const shopDoc = await shopDataDcl.fetchMethod({
        shopId: ordersEnrichment.shop,
      });
      if (Object.keys(shopDoc).length === 0) {
        throw new NonRetryableError('Shop not found');
      }
      const { msp, currency } = shopDoc;

      return { ...ordersEnrichment, msp, currency };
    });

  p.filter((ordersEnrichment) => ordersEnrichment.platform !== 'amazon')
    .apply(
      MongoDbSink.createUpdateOneTransform(
        (ordersEnrichment: OrdersEnrichment & { msp: string; currency: string }) => ({
          shop: ordersEnrichment.shop,
          platform: ordersEnrichment.msp,
          order_id: ordersEnrichment.order_id,
        }),
      ),
    )
    .addSink(ordersEnrichmentMongoSink);

  p.filter((ordersEnrichment) => !!ordersEnrichment.shipping_costs)
    .apply((ordersEnrichment) => {
      return shippingPubSubSink.createRecord({
        data: {
          shop: ordersEnrichment.shop,
          platform: ordersEnrichment.msp,
          platform_account_id: CUSTOM_PLATFORM_ACCOUNT,
          order_id: ordersEnrichment.order_id,
          shipping_costs: ordersEnrichment.shipping_costs,
        },
      });
    })
    .addSink(shippingPubSubSink);

  const shopifyPubsubSink = new PubSubSink({ topicName: 'MONGO_TO_CH_EVENT' });
  const woocommercePubsubSink = new PubSubSink({ topicName: 'woo-order-update' });
  const bigcommercePubsubSink = new PubSubSink({ topicName: 'bigcommerce-order-update' });

  const { shopify, woocommerce, bigcommerce, amazon, _rest } = p.split(
    (ordersEnrichment) => ordersEnrichment.platform || ordersEnrichment.msp,
    ['shopify', 'woocommerce', 'bigcommerce', 'amazon'],
    'split-by-platform',
  );

  amazon
    .apply(async (ordersEnrichment: OrdersEnrichment) => {
      const integrationId = await resolveIntegration({
        shop: ordersEnrichment.shop,
        asset: 'orders-enrichment',
        channel: ordersEnrichment.platform ?? 'amazon',
        account: CUSTOM_PLATFORM_ACCOUNT,
      });
      return { ...ordersEnrichment, integration_id: integrationId };
    })
    .apply(
      MongoDbSink.createUpdateOneTransform((ordersEnrichment) => ({
        shop: ordersEnrichment.shop,
        order_id: ordersEnrichment.order_id,
        platform: 'amazon',
      })),
    )
    .addSink(ordersEnrichmentMongoSink)
    .onFinalize('Amazon_orders_enrichment_mongo2chPubsubSink')
    .apply((data: any) => data.updateOne?.update.$set)
    .apply((ordersEnrichment: OrdersEnrichment & { integration_id: string }) => {
      return {
        integration_id: ordersEnrichment.integration_id,
        order_id: ordersEnrichment.order_id,
        provider_id: 'amazon',
        tw_custom_expenses: ordersEnrichment.custom_expenses,
        tw_custom_gross_sales: ordersEnrichment.custom_gross_sales,
        tw_custom_net_revenue: ordersEnrichment.custom_net_revenue,
        tw_custom_gross_profit: ordersEnrichment.custom_gross_profit,
        tw_custom_total_items_quantity: ordersEnrichment.total_items_quantity,
        tw_custom_orders_quantity: ordersEnrichment.orders_quantity,
        tw_custom_status: ordersEnrichment.custom_status,
        tw_custom_number: ordersEnrichment.custom_number,
        tw_custom_string: ordersEnrichment.custom_string,
        currency: ordersEnrichment.currency,
      };
    })
    .extend(createSonicStreamPipeline({ name: 'amazon-orders-custom-metrics' }));

  shopify
    .filter((ordersEnrichment) => !!+ordersEnrichment.order_id)
    .apply((ordersEnrichment: OrdersEnrichment) => {
      return {
        shopId: ordersEnrichment.shop,
        id: Number(ordersEnrichment.order_id),
        sk: Number(ordersEnrichment.order_id) % 120,
        ...(ordersEnrichment.custom_expenses !== undefined && {
          tw_custom_expenses: ordersEnrichment.custom_expenses,
        }),
        ...(ordersEnrichment.custom_gross_sales !== undefined && {
          tw_custom_gross_sales: ordersEnrichment.custom_gross_sales,
        }),
        ...(ordersEnrichment.custom_net_revenue !== undefined && {
          tw_custom_net_revenue: ordersEnrichment.custom_net_revenue,
        }),
        ...(ordersEnrichment.custom_gross_profit !== undefined && {
          tw_custom_gross_profit: ordersEnrichment.custom_gross_profit,
        }),
        ...(ordersEnrichment.total_items_quantity !== undefined && {
          tw_custom_total_items_quantity: ordersEnrichment.total_items_quantity,
        }),
        ...(ordersEnrichment.orders_quantity !== undefined && {
          tw_custom_orders_quantity: ordersEnrichment.orders_quantity,
        }),
        ...(ordersEnrichment.custom_status !== undefined && {
          tw_custom_status: ordersEnrichment.custom_status,
        }),
        ...(ordersEnrichment.custom_number !== undefined && {
          tw_custom_number: ordersEnrichment.custom_number,
        }),
        ...(ordersEnrichment.custom_string !== undefined && {
          tw_custom_string: ordersEnrichment.custom_string,
        }),
      };
    })
    .apply((data) => {
      return {
        updateOne: {
          filter: { shopId: data.shopId, id: data.id, sk: data.sk },
          update: { $set: data },
          upsert: false,
        },
      };
    })
    .addSink(
      new MongoDbSink({
        connectorArgs: {
          url: getSecret('SHOPIFY_MONGO_URL'),
          db: 'shopify',
        },
        collection: 'orders',
        timestamps: true,
        dedupe: true,
      }),
    )
    .onFinalize('Shopify_orders_mongo2chPubsubSink')
    .apply((data: any) => data.updateOne?.update.$set)
    .apply((data) => {
      return shopifyPubsubSink.createRecord({
        data: { ...data, dataType: 'orders' },
      });
    })
    .addSink(shopifyPubsubSink);

  woocommerce
    .apply((ordersEnrichment: OrdersEnrichment) => {
      return {
        provider_account: ordersEnrichment.shop,
        id: Number(ordersEnrichment.order_id),
        ...(ordersEnrichment.custom_expenses !== undefined && {
          tw_custom_expenses: ordersEnrichment.custom_expenses,
        }),
        ...(ordersEnrichment.custom_gross_sales !== undefined && {
          tw_custom_gross_sales: ordersEnrichment.custom_gross_sales,
        }),
        ...(ordersEnrichment.custom_net_revenue !== undefined && {
          tw_custom_net_revenue: ordersEnrichment.custom_net_revenue,
        }),
        ...(ordersEnrichment.custom_gross_profit !== undefined && {
          tw_custom_gross_profit: ordersEnrichment.custom_gross_profit,
        }),
        ...(ordersEnrichment.total_items_quantity !== undefined && {
          tw_custom_total_items_quantity: ordersEnrichment.total_items_quantity,
        }),
        ...(ordersEnrichment.orders_quantity !== undefined && {
          tw_custom_orders_quantity: ordersEnrichment.orders_quantity,
        }),
        ...(ordersEnrichment.custom_status !== undefined && {
          tw_custom_status: ordersEnrichment.custom_status,
        }),
        ...(ordersEnrichment.custom_number !== undefined && {
          tw_custom_number: ordersEnrichment.custom_number,
        }),
        ...(ordersEnrichment.custom_string !== undefined && {
          tw_custom_string: ordersEnrichment.custom_string,
        }),
      };
    })
    .apply(
      MongoDbSink.createUpdateOneTransform((data) => ({
        provider_account: data.provider_account,
        id: data.id,
      })),
    )
    .addSink(woocommerceMongodbSink)
    .onFinalize('WooCommerce_orders_mongo2chPubsubSink')
    .apply((data: any) => data.updateOne?.update.$set)
    .apply((data) => {
      return woocommercePubsubSink.createRecord({
        data: { ...data, dataType: 'orders' },
      });
    })
    .addSink(woocommercePubsubSink);

  bigcommerce
    .apply((ordersEnrichment: OrdersEnrichment) => {
      return {
        provider_account: ordersEnrichment.shop,
        id: Number(ordersEnrichment.order_id),
        ...(ordersEnrichment.custom_expenses !== undefined && {
          tw_custom_expenses: ordersEnrichment.custom_expenses,
        }),
        ...(ordersEnrichment.custom_gross_sales !== undefined && {
          tw_custom_gross_sales: ordersEnrichment.custom_gross_sales,
        }),
        ...(ordersEnrichment.custom_net_revenue !== undefined && {
          tw_custom_net_revenue: ordersEnrichment.custom_net_revenue,
        }),
        ...(ordersEnrichment.custom_gross_profit !== undefined && {
          tw_custom_gross_profit: ordersEnrichment.custom_gross_profit,
        }),
        ...(ordersEnrichment.total_items_quantity !== undefined && {
          tw_custom_total_items_quantity: ordersEnrichment.total_items_quantity,
        }),
        ...(ordersEnrichment.orders_quantity !== undefined && {
          tw_custom_orders_quantity: ordersEnrichment.orders_quantity,
        }),
        ...(ordersEnrichment.custom_status !== undefined && {
          tw_custom_status: ordersEnrichment.custom_status,
        }),
        ...(ordersEnrichment.custom_number !== undefined && {
          tw_custom_number: ordersEnrichment.custom_number,
        }),
        ...(ordersEnrichment.custom_string !== undefined && {
          tw_custom_string: ordersEnrichment.custom_string,
        }),
      };
    })
    .apply(
      MongoDbSink.createUpdateOneTransform((data) => ({
        provider_account: data.provider_account,
        id: data.id,
      })),
    )
    .addSink(bigcommerceMongodbSink)
    .onFinalize('BigCommerce_orders_mongo2chPubsubSink')
    .apply((data: any) => data.updateOne?.update.$set)
    .apply((data) => {
      return bigcommercePubsubSink.createRecord({
        data: { ...data, dataType: 'orders' },
      });
    })
    .addSink(bigcommercePubsubSink);

  return p.pipeline;
});

async function validateOrderEnrichment(
  ordersEnrichment: OrdersEnrichment,
): Promise<OrdersEnrichment> {
  return await ordersEnrichmentSchema.parseAsync(ordersEnrichment);
}
