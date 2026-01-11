import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import { constructPipeline, Pipeline, PubSubSource, MongoDbSink, PubSubSink } from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { CUSTOM_PLATFORM, CUSTOM_PLATFORM_ACCOUNT, Pps, ppsSchema } from './types';
import { mapResponseToService, mapResponseToSource } from '@tw/utils/module/surveys';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { resolveIntegration } from './utils/integrations';
import { getOrder2 } from '@tw/utils/module/getOrder';
import { handleError } from './utils/errors';
import { keyWordsFound } from '@tw/utils/module/surveys/attributionQuestionRegex';

export async function customPps(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received pps', body.shop, JSON.stringify(body));
  try {
    body = await validatePps(body);
    // const order = await getOrder2(body.shop, body.order_id);
    logger.info(`Pps validated: shop: ${body.shop} order_id: ${body.order_id}`);
    // if (!order) {
    //   logger.error(`Order not found for shop: ${body.shop} order_id: ${body.order_id}`);
    //   res.status(404).send('Order not found');
    //   return;
    // }
    body.user = req.user;
    await callPubSub('api-custom-pps', body);
    res.status(200).send({ success: true, message: 'pps received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const ppsMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-pps',
  }).index({ shop: 1, platform: 1, platform_account_id: 1, order_id: 1 }, { unique: true });

  const surveyStatsSink = new PubSubSink({ topicName: 'survey-stats' });

  const p = new Pipeline(
    'api-custom-pps-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-pps-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (pps: Pps) => {
      const integrationId = await resolveIntegration({
        shop: pps.shop,
        asset: 'pps',
        channel: pps?.platform ?? CUSTOM_PLATFORM,
        account: pps?.platform_account_id ?? CUSTOM_PLATFORM_ACCOUNT,
      });
      return { ...pps, integration_id: integrationId };
    });

  p.apply(
    MongoDbSink.createUpdateOneTransform((pps: Pps) => ({
      shop: pps.shop,
      platform: pps.platform ?? CUSTOM_PLATFORM,
      platform_account_id: pps.platform_account_id ?? CUSTOM_PLATFORM_ACCOUNT,
      order_id: pps.order_id,
    })),
  ).addSink(ppsMongoSink);

  p.filter((pps: Pps) => {
    return pps.include_in_attribution ?? keyWordsFound(pps.question_text || '', pps.shop);
  })
    .apply((pps: Pps) => {
      return surveyStatsSink.createRecord({
        data: {
          shopDomain: pps.shop,
          order_id: pps.order_id,
          surveyTotalPrice: pps.total_price,
          createdAt: pps.created_at,
          source: pps.source || mapResponseToService(pps.response || ''),
          survey_platform: 'API',
          receivedAt: new Date().toISOString(),
          campaignId:
            (pps.source || mapResponseToSource(pps.response || '')) === 'other'
              ? pps.response
              : 'PPS Survey',
        },
      });
    })
    .addSink(surveyStatsSink);

  p.filter((pps: Pps) => {
    return !!pps.question_id;
  })
    .apply((pps: Pps & { integration_id: string }) => {
      return {
        integration_id: pps.integration_id,
        provider_id: pps.platform,
        account_id: pps.platform_account_id,
        type: 'PPS API',
        survey_id: pps.order_id,
        updated_at: new Date().toISOString(),
        order_id: pps.order_id,
        order_total: pps.total_price,
        question_id: pps.question_id,
        question: pps.question_text,
        response: pps.response,
        response_id: pps.response_id,
        response_date_time: pps.created_at,
        source: pps.source ?? mapResponseToSource(pps.response || ''),
        tw_service: pps.source ?? mapResponseToService(pps.response || ''),
        question_type: 'PPS API',
        survey_platform: pps.platform,
      };
    })
    .extend(createSonicStreamPipeline({ name: 'pps' }));

  return p.pipeline;
});

async function validatePps(pps: Pps): Promise<Pps> {
  return await ppsSchema.parse(pps);
}
