import { Redis } from 'ioredis';

import { env } from '@/infrastructure/config/env.js';

type RedisGlobal = typeof globalThis & {
  redis?: InstanceType<typeof Redis>;
};

const globalForRedis = globalThis as RedisGlobal;

const createRedisClient = () =>
  new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export const getRedisClient = () => redis;

export const closeRedisClient = async () => {
  if (redis.status !== 'end') {
    await redis.quit();
  }
};
