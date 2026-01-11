import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import { constructPipeline, Pipeline, PubSubSource, MongoDbSink } from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { Ad, adsSchema, CUSTOM_CHANNEL, CUSTOM_CHANNEL_ACCOUNT } from './types';
import { HydraApp } from '@tw/types';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { resolveIntegration } from './utils/integrations';
import { handleError } from './utils/errors';
import { shopDataDcl } from '@tw/utils/module/dcl';
import moment from 'moment-timezone';

// Extended Ad type that includes user info from the request
type AdWithUser = Ad & { user?: HydraApp; integration_id?: string };

// Helper to get provider_id - use fusion_provider_id from Hydra claim if available, otherwise fall back to channel
function getProviderId(ad: AdWithUser): string {
  // @ts-ignore - TODO: add to the actual type later.
  return ad.user?.ext?.claims?.fusion_provider_id || ad.channel;
}

export async function customAds(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received Ad', body.shop, JSON.stringify(body));
  try {
    body = await validateAds(body);
    logger.info(
      `Ad validated: shop: ${body.shop} campaign_id: ${body?.campaign?.id} adset_id: ${body?.adset?.id} ad_id: ${body?.ad?.id}`,
    );
    body.user = req.user;
    await callPubSub('api-custom-ads', body);
    res.status(200).send({ success: true, message: 'Ad received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const adsMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-ads',
  }).index(
    { shop: 1, channel: 1, event_date: 1, 'campaign.id': 1, 'adset.id': 1, 'ad.id': 1 },
    { unique: true, name: 'unique_ads' },
  );

  const p = new Pipeline(
    'api-custom-ads-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-ads-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply((data) => {
      if (data.shop.includes('/')) {
        return;
      }
      return data;
    })
    .apply(async (ad: AdWithUser) => {
      // @ts-ignore
      const fusionProviderId = ad.user?.ext?.claims?.fusion_provider_id;
      const channel = fusionProviderId ?? ad.channel ?? CUSTOM_CHANNEL;
      const integration = await resolveIntegration({
        shop: ad.shop,
        asset: 'ads',
        channel,
        account: ad.channel_account_id ?? CUSTOM_CHANNEL_ACCOUNT,
        newIntegrationProviderId: fusionProviderId ? 'api-app' : 'api',
      });
      return { ...ad, integration_id: integration };
    });

  p.apply(
    MongoDbSink.createUpdateOneTransform((ad: Ad) => ({
      shop: ad.shop,
      channel: ad.channel,
      event_date: ad.event_date,
      'campaign.id': ad.campaign?.id,
      'adset.id': ad.adset?.id,
      'ad.id': ad.ad?.id,
    })),
  ).addSink(adsMongoSink);

  p.filter((ad: AdWithUser) => ad.ad?.id !== undefined && ad.ad !== null && ad.ad.id !== '')
    .apply((ad: AdWithUser) => {
      return {
        provider_id: getProviderId(ad),
        integration_id: ad.integration_id,
        account_id: ad.channel_account_id ?? CUSTOM_CHANNEL_ACCOUNT,
        currency: ad.currency,

        campaign_id: ad?.campaign?.id ?? '',
        campaign_name: ad?.campaign?.name ?? '',
        campaign_status: ad?.campaign?.status ?? '',

        adset_id: ad?.adset?.id ?? '',
        adset_name: ad?.adset?.name ?? '',
        adset_status: ad?.adset?.status ?? '',

        ad_id: ad!.ad!.id,
        ad_name: ad?.ad?.name ?? '',
        ad_status: ad?.ad?.status ?? '',
        ad_thumbnail: ad?.ad?.ad_image_url ?? ad?.ad?.thumbnail ?? '',
      };
    })
    .extend(createSonicStreamPipeline({ name: 'ads-attributes' }));

  p.filter(
    (ad: AdWithUser) => ad.adset?.id !== undefined && ad.adset !== null && ad.adset.id !== '',
  )
    .apply((ad: AdWithUser) => {
      return {
        provider_id: getProviderId(ad),
        integration_id: ad.integration_id,
        account_id: ad.channel_account_id ?? CUSTOM_CHANNEL_ACCOUNT,
        currency: ad.currency,

        campaign_id: ad?.campaign?.id ?? '',
        campaign_name: ad?.campaign?.name ?? '',
        campaign_status: ad?.campaign?.status ?? '',

        adset_id: ad?.adset?.id ?? '',
        adset_name: ad?.adset?.name ?? '',
        adset_status: ad?.adset?.status ?? '',
      };
    })
    .extend(createSonicStreamPipeline({ name: 'adsets-attributes' }));

  p.filter(
    (ad: AdWithUser) =>
      ad.campaign?.id !== undefined && ad.campaign !== null && ad.campaign.id !== '',
  )
    .apply((ad: AdWithUser) => {
      return {
        provider_id: getProviderId(ad),
        integration_id: ad.integration_id,
        account_id: ad.channel_account_id ?? CUSTOM_CHANNEL_ACCOUNT,
        currency: ad.currency,

        campaign_id: ad?.campaign?.id ?? '',
        campaign_name: ad?.campaign?.name ?? '',
        campaign_status: ad?.campaign?.status ?? '',
      };
    })
    .extend(createSonicStreamPipeline({ name: 'campaigns-attributes' }));

  p.apply((ad: AdWithUser) => {
    return {
      provider_id: getProviderId(ad),
      integration_id: ad.integration_id,
      account_id: ad.channel_account_id ?? CUSTOM_CHANNEL_ACCOUNT,
      event_date: ad.event_date,
      currency: ad.currency,
      campaign_id: ad?.campaign?.id ?? '',
      adset_id: ad?.adset?.id ?? '',
      ad_id: ad?.ad?.id ?? '',
      clicks: ad.metrics.clicks,
      conversion_value: ad.metrics.conversion_value,
      impressions: ad.metrics.impressions,
      purchases: ad.metrics.conversions,
      spend: ad.metrics.spend,
      visits: ad.metrics.visits,
    };
  }).extend(createSonicStreamPipeline({ name: 'ads-metrics' }));

  p.apply(async (ad: AdWithUser) => {
    const shopDoc = await shopDataDcl.fetchMethod({ shopId: ad.shop });
    const { customExpenseAttributionType, customExpenseSmartAttribution } = shopDoc;
    const hourlyWeights =
      customExpenseAttributionType &&
      customExpenseAttributionType === 'smart' &&
      customExpenseSmartAttribution
        ? Object.values(customExpenseSmartAttribution).map((value, index) => {
            return value - (customExpenseSmartAttribution[index - 1] ?? 0);
          })
        : Array.from({ length: 24 }, () => 1 / 24);
    return Array.from({ length: 24 }, (_, i) => {
      return {
        provider_id: getProviderId(ad),
        integration_id: ad.integration_id,
        account_id: ad.channel_account_id ?? CUSTOM_CHANNEL_ACCOUNT,
        event_date: ad.event_date,
        event_hour: moment.utc(ad.event_date).add(i, 'hours').tz(shopDoc.timezone).format('HH'),
        currency: ad.currency,
        campaign_id: ad?.campaign?.id ?? '',
        adset_id: ad?.adset?.id ?? '',
        ad_id: ad?.ad?.id ?? '',
        clicks: (ad.metrics.clicks ?? 0) / 24,
        conversion_value: (ad.metrics.conversion_value ?? 0) / 24,
        impressions: (ad.metrics.impressions ?? 0) / 24,
        purchases: (ad.metrics.conversions ?? 0) / 24,
        spend: (ad.metrics.spend ?? 0) * hourlyWeights[i],
        visits: (ad.metrics.visits ?? 0) / 24,
      };
    });
  }).extend(createSonicStreamPipeline({ name: 'ads-metrics-hourly' }));

  return p.pipeline;
});

async function validateAds(ad: any): Promise<Ad> {
  return await adsSchema.parse(ad);
}
