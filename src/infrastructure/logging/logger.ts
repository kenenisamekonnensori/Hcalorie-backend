import pino from 'pino';

import { env } from '@/infrastructure/config/env.js';

let loggerInstance: ReturnType<typeof pino> | undefined;

export const createLogger = () => {
  if (loggerInstance) {
    return loggerInstance;
  }

  const options: Parameters<typeof pino>[0] = {
    level: env.LOG_LEVEL,
  };

  if (env.NODE_ENV === 'development') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:standard',
      },
    };
  }

  loggerInstance = pino(options);

  return loggerInstance;
};

export const logger = createLogger();
