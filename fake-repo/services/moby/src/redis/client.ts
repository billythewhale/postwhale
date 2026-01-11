import { getRedisClient } from '@tw/utils/module/redisClient';
import { getSecret } from '@tw/utils/module/secrets';

let redisClientInstance: ReturnType<typeof getRedisClient> | null = null;

export async function getClient() {
  if (!redisClientInstance) {
    const redisHost = getSecret('REDIS_HOST') || 'localhost';
    redisClientInstance = getRedisClient(redisHost, {
      singleClient: true,
      name: 'moby-redis-client',
      forceCloud: true,
    });
  }
  if (!redisClientInstance.isOpen) {
    await redisClientInstance.connect();
  }
  return redisClientInstance;
}
