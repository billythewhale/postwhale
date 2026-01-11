import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import { constructPipeline, Pipeline, PubSubSource, MongoDbSink, PubSubSink } from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { resolveIntegration } from './utils/integrations';
import { handleError } from './utils/errors';
import { Customer, customerSchema } from './types/customers';
import { CUSTOM_MSP_PLATFORM, CUSTOM_MSP_ACCOUNT } from './types/constants';

export async function customCustomers(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received customers', body.shop, JSON.stringify(body));
  try {
    body = await validateCustomers(body);
    logger.info(`Customers validated: shop: ${body.shop} customer_id: ${body.customer_id}`);
    body.user = req.user;
    await callPubSub('api-custom-customers', body);
    res.status(200).send({ success: true, message: 'customers received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const customerMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-customers',
  })
    .index({ integration_id: 1, customer_id: 1 }, { unique: true, name: 'integration_customer_id' })
    .index({ shop: 1, customer_id: 1 }, { name: 'shop_customer_id' })
    .index({ integration_id: 1, tw_ingest_time: -1 }, { name: 'integration_id_tw_ingest_time' });

  const p = new Pipeline(
    'api-custom-customers-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-customers-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (customer: Customer) => {
      const integrationId = await resolveIntegration({
        shop: customer.shop,
        asset: 'orders',
        channel: customer?.platform ?? CUSTOM_MSP_PLATFORM,
        account: customer?.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      });
      return { ...customer, integration_id: integrationId };
    });

  p.apply(
    MongoDbSink.createUpdateOneTransform((customer: Customer & { integration_id: string }) => ({
      integration_id: customer.integration_id,
      customer_id: customer.customer_id,
    })),
  ).addSink(customerMongoSink);

  p.apply((customer: Customer & { integration_id: string }) => {
    return {
      ...customer,
      provider_id: customer.platform,
      account_id: customer.platform_account_id,
      integration_id: customer.integration_id,
      province: customer.state,
      province_code: customer.state_code,
      phone_number: customer.phone,
      provider_last_order_id: customer.last_order_id,
      provider_amount_spent: customer.amount_spent,
      provider_number_of_orders: customer.orders,
      updated_at: new Date().toISOString(),
    };
  }).extend(createSonicStreamPipeline({ name: 'customers' }));

  return p.pipeline;
});

async function validateCustomers(customer: Customer): Promise<Customer> {
  return await customerSchema.parse(customer);
}
