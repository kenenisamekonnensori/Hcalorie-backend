import cors from '@fastify/cors';
import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';

import { apiRoutes } from '@/api/routes/index.js';
import { globalErrorHandler } from '@/api/middlewares/error-handler.js';
import { env } from '@/infrastructure/config/env.js';
import { createRequestId } from '@/shared/utils/request-id.js';
import authPlugin from './infrastructure/plugins/auth.plugin.js';
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
  app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed'), false);
    },
  });
  app.register(rawBody, {
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });
  app.register(prismaPlugin);
  app.register(authPlugin);
  app.register(apiRoutes);

  return app;
};

export const appConfig = env;
