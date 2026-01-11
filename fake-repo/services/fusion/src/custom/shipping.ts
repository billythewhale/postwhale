import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import { constructPipeline, Pipeline, PubSubSource, MongoDbSink, PubSubSink } from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { CUSTOM_MSP_ACCOUNT, CUSTOM_MSP_PLATFORM, Shipping, shippingSchema } from './types';
import { resolveIntegration } from './utils/integrations';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { handleError } from './utils/errors';

export async function customShipping(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received shipping', body.shop, JSON.stringify(body));
  try {
    body = await validateShipping(body);
    logger.info(`Shipping validated: shop: ${body.shop} order_id: ${body.order_id}`);
    body.user = req.user;
    await callPubSub('api-custom-shipping', body);
    res.status(200).send({ success: true, message: 'shipping received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const shippingMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-shipping',
  }).index({ shop: 1, platform: 1, platform_account_id: 1, order_id: 1 }, { unique: true });

  const p = new Pipeline(
    'api-custom-shipping-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-shipping-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (shipping: Shipping) => {
      const integrationId = await resolveIntegration({
        shop: shipping.shop,
        asset: 'shipping',
        channel: shipping?.platform ?? CUSTOM_MSP_PLATFORM,
        account: shipping?.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      });
      return { ...shipping, integration_id: integrationId };
    });

  p.apply(
    MongoDbSink.createUpdateOneTransform((shipping: Shipping) => ({
      shop: shipping.shop,
      platform: shipping.platform ?? CUSTOM_MSP_PLATFORM,
      platform_account_id: shipping.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      order_id: shipping.order_id,
    })),
  ).addSink(shippingMongoSink);

  p.apply((shipping: Shipping) => {
    return {
      integration_id: (shipping as Shipping & { integration_id: string }).integration_id,
      account_id: shipping.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      provder_account: shipping.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      bu_id: shipping.shop,
      provider_id: CUSTOM_MSP_PLATFORM,
      order_id: shipping.order_id.toString(),
      shipping_cost: shipping.shipping_costs,
    };
  }).extend(createSonicStreamPipeline({ name: 'shipping-csv' }));

  return p.pipeline;
});

async function validateShipping(shipping: Shipping): Promise<Shipping> {
  return await shippingSchema.parse(shipping);
}
