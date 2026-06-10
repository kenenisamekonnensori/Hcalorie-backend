import cors from '@fastify/cors';
import Fastify from 'fastify';

import { apiRoutes } from '@/api/routes/index.js';
import { globalErrorHandler } from '@/api/middlewares/error-handler.js';
import { env } from '@/infrastructure/config/env.js';
import { createRequestId } from '@/shared/utils/request-id.js';
import prismaPlugin from './infrastructure/plugins/prisma-plugin.js';

export const buildApp = () => {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            level: env.LOG_LEVEL,
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:standard',
              },
            },
          }
        : {
            level: env.LOG_LEVEL,
          },
    genReqId: createRequestId,
    trustProxy: true,
  });

  app.setErrorHandler(globalErrorHandler);
  app.register(cors, { origin: true });
  app.register(prismaPlugin)
  app.register(apiRoutes);

  return app;
};

export const appConfig = env;
