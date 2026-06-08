import { buildApp } from '@/app.js';
import { closePrismaClient } from '@/infrastructure/database/prisma.js';
import { closeQueueInfrastructure } from '@/infrastructure/queue/queues.js';
import { closeRedisClient } from '@/infrastructure/cache/redis.js';
import { env } from '@/infrastructure/config/env.js';

const app = buildApp();

const shutdown = async () => {
  app.log.info('shutting down');

  try {
    await app.close();
    await Promise.all([closeQueueInfrastructure(), closeRedisClient(), closePrismaClient()]);
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'shutdown failed');
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

await app.listen({
  host: env.HOST,
  port: env.PORT,
});

app.log.info({ host: env.HOST, port: env.PORT }, 'server started');
