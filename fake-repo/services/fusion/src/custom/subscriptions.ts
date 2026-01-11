import { shopDataDcl } from '@tw/utils/module/dcl';
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
  CUSTOM_PLATFORM,
  CUSTOM_PLATFORM_ACCOUNT,
  Subscription,
  subscriptionSchema,
} from './types';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { resolveIntegration } from './utils/integrations';
import moment from 'moment-timezone';
import { PixelMetaData, PixelConversionEvent, GenericConversion } from '@tw/types/module/pixel';
import { handleError } from './utils/errors';

export async function customSubscriptions(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received subscription', body.shop, JSON.stringify(body));
  try {
    body = await validateSubscription(body);
    logger.info(
      `Subscription validated: shop: ${body.shop} subscription_id: ${body.subscription_id}`,
    );
    body.user = req.user;
    await callPubSub('api-custom-subscriptions', body);
    res.status(200).send({ success: true, message: 'Subscription received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const subscriptionsMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-subscriptions',
  })
    .index({ integration_id: 1, subscription_id: 1 }, { unique: true })
    .index({ integration_id: 1, tw_ingest_time: -1 }, { name: 'integration_id_tw_ingest_time' });

  const pixelSink = new PubSubSink({ topicName: 'new-custom-api-incoming' });

  const p = new Pipeline(
    'api-custom-subscriptions-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-subscriptions-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (subscription: Subscription) => {
      const integrationId = await resolveIntegration({
        shop: subscription.shop,
        asset: 'subscriptions',
        channel: subscription?.platform ?? CUSTOM_PLATFORM,
        account: subscription?.platform_account_id ?? CUSTOM_PLATFORM_ACCOUNT,
      });
      return { ...subscription, integration_id: integrationId };
    });

  p.apply(
    MongoDbSink.createUpdateOneTransform(
      (subscription: Subscription & { integration_id: string }) => ({
        integration_id: subscription.integration_id,
        subscription_id: subscription.subscription_id,
      }),
    ),
  ).addSink(subscriptionsMongoSink);

  p.apply((subscription: Subscription) => {
    return {
      ...subscription,
      bu_id: subscription.shop,
      integration_id: (subscription as Subscription & { integration_id: string }).integration_id,
      provider_account: subscription.platform_account_id ?? CUSTOM_PLATFORM_ACCOUNT,
      account_id: subscription.platform_account_id ?? CUSTOM_PLATFORM_ACCOUNT,
      provider_id: subscription.platform ?? CUSTOM_PLATFORM,
      customer_id: subscription.customer.id,
      subscription_items: subscription.subscription_items.map((item) => {
        return {
          ...item,
          discount_amount_off: item.discount?.amount_off ?? 0,
          discount_percent_off: item.discount?.percent_off ?? 0,
          discount_codes: [],
        };
      }),
      canceled_at: subscription.cancelled_at ?? subscription.canceled_at,
      cancellation_comments:
        subscription.cancelation_comments ?? subscription.cancellation_comments,
      cancellation_reason: subscription.cancelation_reason ?? subscription.cancellation_reason,
      discount_codes: [],
    };
  }).extend(createSonicStreamPipeline({ name: 'subscriptions' }));

  p.filter((subscription: Subscription) => {
    return moment(subscription.created_at).isAfter(moment().subtract(15, 'day'));
  })
    .apply(async (subscription: Subscription) => {
      let shopDoc = await shopDataDcl.fetchMethod({
        shopId: subscription.shop,
      });
      if (!shopDoc) {
        throw new NonRetryableError('Shop not found');
      }
      const { msp } = shopDoc;

      let totalDiscounts = 0;
      const mrrWithDiscount = subscription.subscription_items
        .filter((item) => item.status === 'active')
        .reduce((acc, item) => {
          const intervalDivisor =
            item.interval === 'year'
              ? (1 / 12) * item.interval_count
              : item.interval === 'month'
              ? item.interval_count
              : item.interval === 'week'
              ? (((1 / 7) * 365) / 12) * item.interval_count
              : item.interval === 'day'
              ? 365 / 12 / item.interval_count
              : item.interval_count;
          const totalPrice = item.price * item.quantity;
          const discountValue =
            (item.discount?.amount_off ?? 0) +
            ((item.discount?.percent_off ?? 0) / 100) * totalPrice * intervalDivisor;

          totalDiscounts += discountValue;

          return acc + Math.max(totalPrice * intervalDivisor - discountValue, 0);
        }, 0);

      return pixelSink.createRecord({
        data: {
          //@ts-ignore
          order: {
            id: subscription.subscription_id,
            shopCode: '',
            shopDomain: subscription.shop,
            platform: msp,
            app_id: null,
            created_at: subscription.created_at,
            processed_at: subscription.created_at,
            cogs: 0,
            currency: subscription.currency,
            customer: {
              id: subscription.customer.id,
              email: subscription.customer.email,
              phone: subscription.customer.phone,
              first_name: subscription.customer.first_name,
              last_name: subscription.customer.last_name,
            },
            checkout_token: '',
            cart_token: '',
            discount_codes: null,
            landing_site: '',
            landing_site_ref: '',
            cartToken: '',
            checkout: '',
            ip: '',
            userAgent: '',
            line_items: [],
            order_status_url: '',
            name: subscription.subscription_id,
            payment_gateway_names: null,
            referring_site: '',
            shipping_address: {},
            source_name: '',
            tags: '',
            total_discounts: totalDiscounts,
            mrr: mrrWithDiscount,
          } as GenericConversion,
          pixelMetaData: {
            integrationId: (subscription as Subscription & { integration_id: string })
              .integration_id,
            platform: subscription.platform ?? CUSTOM_PLATFORM,
            accountId: subscription.platform_account_id ?? CUSTOM_PLATFORM_ACCOUNT,
            isSubscription: true,
          } as PixelMetaData,
        } as PixelConversionEvent,
      });
    })
    .addSink(pixelSink);

  return p.pipeline;
});

async function validateSubscription(subscription: any): Promise<Subscription> {
  return await subscriptionSchema.parse(subscription);
}
