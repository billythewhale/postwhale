import { timelineObject } from '@tw/utils/module/timeline';
import { Order } from '../types';
import { BLACKLIST_CUSTOMER_IDS, BLACKLIST_EMAILS, BLACKLIST_PHONES } from './constants';
import { getSecret } from '@tw/utils/module/secrets';
import { Redis } from 'ioredis';
import { DCL } from '@tw/utils/module/dcl';



const redisClient = new Redis(getSecret('FUSION_REDIS_HOST'));

const blacklistDCL = new DCL({
  name: 'fusion-blacklist',
  remoteClsEngine: 'redis',
  remoteClsArgs: {
    redisHost: getSecret('FUSION_REDIS_HOST'),
  },
  ttlMs: 1000 * 60 * 5, // 5 minutes
  fetchMethod: async (shop: string, value: string, type: 'email' | 'phone' | 'customerId') => {
    return await redisClient.sismember(`fusion-orders-blacklist:${shop}:${type}`, value);
  },
  encodeKey: (shop: string, value: string, type: 'email' | 'phone' | 'customerId') => `fusion-dcl-blacklist:${shop}:${type}:${value}`,
})

export function hasValue(value: any): Boolean {
  return value !== undefined && value !== null;
}

export function mapTimelineToCH(timeline: timelineObject) {
  return {
    timestamp: timeline.date,
    value: timeline.value,
    valueType: 'currency',
    source: timeline.type ?? 'API',
  };
}

export async function isEmailBlacklisted(order: Order) {
  const isBlacklisted = await blacklistDCL.fetchMethod(order.shop, order.customer?.email ?? '', 'email');
  return isBlacklisted;
}

export async function isPhoneBlacklisted(order: Order) {
  const isBlacklisted = await blacklistDCL.fetchMethod(order.shop, order.customer?.phone ?? '', 'phone');
  return isBlacklisted;
}

export async function isCustomerIdBlacklisted(order: Order) {
  const isBlacklisted = await blacklistDCL.fetchMethod(
    order.shop,
    order.customer?.id ?? '',
    'customerId',
  );
  return isBlacklisted;
}

export async function addToRedisBlacklist(
  shop: string,
  value: string,
  type: 'email' | 'phone' | 'customerId',
) {
  const redisKey = `fusion-orders-blacklist:${shop}:${type}`;
  await redisClient.sadd(redisKey, value);
}