import { shopDataDcl } from '@tw/utils/module/dcl';
import { Integration } from '@tw/types/module/services/account-manager/Integration';
import { callServiceEndpoint } from '@tw/utils/module/callServiceEndpoint';
import { logger } from '@tw/utils/module/logger';
import { CUSTOM_PLATFORM, CUSTOM_PLATFORM_ACCOUNT } from '../types';
import { NonRetryableError, RetryLaterError } from '@tw/saber';
import { v5 } from 'uuid';
import { addTaskToQueue } from '@tw/utils/module/cloudTasks';
import { Request, Response } from 'express';
import { getRedisClient } from '@tw/utils/module/redisClient';
import { getSecret } from '@tw/utils/module/secrets';
import { ShopWithSensory } from '@tw/types';
import { ServicesIds } from '@tw/types/module/services/general';

const redisClient = getRedisClient(getSecret('REDIS_HOST'), {
  singleClient: true,
});

export async function resolveIntegration(args: {
  shop: string;
  asset: string;
  channel: string;
  account: string;
  newIntegrationProviderId?: Extract<ServicesIds, 'api' | 'api-app'>;
}) {
  const {
    shop,
    channel = CUSTOM_PLATFORM,
    asset,
    account = CUSTOM_PLATFORM_ACCOUNT,
    newIntegrationProviderId = 'api',
  } = args;
  if (shop.includes('/')) {
    throw new NonRetryableError(`Shop ${shop} URL is not valid`);
  }
  let DCLargs = { shopId: shop, includeSensory: true };
  const provider_account_id = `${asset}:${channel}:${account}`;
  let shopDoc = await shopDataDcl.fetchMethod(DCLargs);
  if (Object.keys(shopDoc).length === 0) {
    throw new NonRetryableError('Shop not found');
  }

  let api = shopDoc.sensory?.[newIntegrationProviderId];
  let creds = api?.credentials?.[0]?.id;

  if (!api?.credentials?.length && !api?.integrations?.length) {
    const redisKey = `api-creds-integration-${shop}`;
    const lockAcquired = await testAndAcquireLock(redisKey);
    if (!lockAcquired) {
      throw new RetryLaterError(`api-creds-integration-${shop} is in progress, retrying later,`);
    }
    const newCreds = await callServiceEndpoint('account-manager', 'integrations/newCreds', {
      providerId: 'api', // this is a fake credentials to use as a foreign key to the integration
      buId: shop,
      credentials: {
        tw_buid: shop,
      },
      id: v5(shop, v5.DNS),
    });
    creds = newCreds.data.id;
    shopDoc = (await shopDataDcl.fetch({ params: [DCLargs], forceFetch: true })).value;
  }

  if (!api?.credentials) {
    shopDoc = await shopDataDcl.fetchMethod(DCLargs);
    api = shopDoc.sensory?.[newIntegrationProviderId];
  }

  let integration = api?.integrations?.find(
    (integration) => integration?.provider_account === provider_account_id,
  );

  if (!integration) {
    if ((api?.integrations || []).length >= 100) {
      logger.warn(
        {
          shop,
          asset,
          channel,
          account,
          provider_account_id,
          integrationsLength: api?.integrations?.length,
        },
        'too many integration_ids error',
      );
      throw new NonRetryableError('too many integration_ids error');
    }
    const redisKey = `integration-${shop}-${asset}-${channel}-${account}`;
    const lockAcquired = await testAndAcquireLock(redisKey);
    if (!lockAcquired) {
      const invalidateValue = await redisClient.get(`${redisKey}-invalidate`);
      if (invalidateValue === '1') {
        shopDoc = (await shopDataDcl.fetch({ params: [DCLargs], skipLru: true })).value;
        integration = (shopDoc.sensory?.[newIntegrationProviderId]?.integrations || [])?.find(
          (integration) => integration?.provider_account === provider_account_id,
        );
      } else {
        throw new RetryLaterError(
          `integration-${shop}-${asset}-${channel}-${account} is in progress, retrying later,`,
        );
      }
    } else {
      try {
        await addTaskToQueue(
          'custom-api-integration-queue',
          'fusion',
          'register-integrations',
          {
            bu_id: shop,
            integration: {
              provider_id: newIntegrationProviderId,
              provider_account_id,
              provider_account_name: provider_account_id,
              extra_params: { timezone: shopDoc.timezone, currency: shopDoc.currency },
              timezone: shopDoc.timezone,
              currency: shopDoc.currency,
              credentials_id: creds,
              policy_id: 'default',
            },
          },
          {
            log: true,
            forceCloud: true,
          },
        );
        logger.info('Integration added to queue');
      } catch (e) {
        logger.warn(`Error while adding ${provider_account_id} task to queue`, JSON.stringify(e));
        logger.info(redisKey, 'failed to add task to queue, releasing lock');
        await releaseLock(redisKey);
      }
      throw new RetryLaterError(
        `provider_account_id: ${provider_account_id} added task to queue, retrying later,`,
      );
    }
  }

  if (!integration?.id || integration?.id == '') {
    throw new Error('Integration not found');
  }
  return integration?.id;
}

export async function registerIntegration(req: Request, res: Response) {
  const body: { bu_id: string; integration: any } = req.body;
  logger.info('registerIntegration: Registering integration', JSON.stringify(body));

  let shopDoc = await shopDataDcl.fetchMethod({
    shopId: body.bu_id,
    includeSensory: true,
  });
  if (Object.keys(shopDoc).length === 0) {
    throw new NonRetryableError('Shop not found');
  }
  const channel = body.integration.provider_id as ServicesIds;
  let apiIntegrations = shopDoc.sensory?.[channel]?.integrations || [];
  const existingIntegration = (apiIntegrations || []).find(
    (integration) => integration?.provider_account === body.integration.provider_account_id,
  );
  if (existingIntegration) {
    logger.info('registerIntegration: Integration already exists');
    res.send('ok');
    return;
  }
  try {
    const [integration] = (
      await callServiceEndpoint('account-manager', 'integrations/connect-int', body)
    ).data as unknown as Integration[];
    logger.info('registerIntegration: Integration connected', JSON.stringify(integration));
    shopDoc = await forceFetchShopData(body.bu_id);
    apiIntegrations = shopDoc.sensory?.[channel]?.integrations || [];
    if ((apiIntegrations || []).find((i) => i?.id === integration.id)) {
      const [asset, channel, account] = body.integration.provider_account_id.split(':');
      const redisKey = `integration-${body.bu_id}-${asset}-${channel}-${account}`;
      await raiseInvalidateFlag(redisKey);
      //NOTE: leave lock in redis acquired by the caller so that it doesn't attempt to acquire it again and recreate the integration
      res.send('ok');
      return;
    }
  } catch (e: any) {
    if (e?.message?.includes('already exists')) {
      logger.info('registerIntegration: Integration already exists');
      shopDoc = await forceFetchShopData(body.bu_id);
      const [asset, channel, account] = body.integration.provider_account_id.split(':');
      const redisKey = `integration-${body.bu_id}-${asset}-${channel}-${account}`;
      await raiseInvalidateFlag(redisKey);
      res.send('ok');
      return;
    } else {
      logger.warn('registerIntegration: Error while connecting integration', JSON.stringify(e));
      res.status(500).send('Error while connecting integration');
      return;
    }
  }
}

async function testAndAcquireLock(redisKey: string): Promise<boolean> {
  const lockValue = await redisClient.set(redisKey, 1, { EX: 300, NX: true }); //5 minutes
  if (lockValue === null) {
    return false;
  }
  return lockValue === 'OK';
}

async function releaseLock(redisKey: string): Promise<void> {
  await redisClient.del(redisKey);
}

async function raiseInvalidateFlag(redisKey: string): Promise<void> {
  await redisClient.set(`${redisKey}-invalidate`, 1, { EX: 300 }); //5 minutes
}

async function forceFetchShopData(shopId: string): Promise<ShopWithSensory> {
  return (await shopDataDcl.fetch({ params: [{ shopId, includeSensory: true }], forceFetch: true }))
    .value;
}
