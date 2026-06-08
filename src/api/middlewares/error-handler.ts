import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { logger } from '@/infrastructure/logging/logger.js';

type KnownError = FastifyError & {
  statusCode?: number;
  validation?: unknown;
  code?: string;
};

type ErrorMetadata = {
  message: string;
  statusCode?: number;
  validation?: unknown;
  code?: string;
};

const getErrorMetadata = (error: unknown): ErrorMetadata => {
  if (!(error instanceof Error)) {
    return { message: 'Unknown error' };
  }

  const knownError = error as Partial<KnownError>;
  const metadata: ErrorMetadata = { message: error.message };

  if (knownError.statusCode !== undefined) {
    metadata.statusCode = knownError.statusCode;
  }

  if (knownError.validation !== undefined) {
    metadata.validation = knownError.validation;
  }

  if (knownError.code !== undefined) {
    metadata.code = knownError.code;
  }

  return metadata;
};

export const globalErrorHandler: FastifyInstance['errorHandler'] = async (
  error: unknown,
  _request,
  reply,
) => {
  const metadata = getErrorMetadata(error);
  const isZodError = error instanceof ZodError;
  const statusCode = metadata.statusCode ?? (isZodError ? 400 : 500);
  const payload = isZodError
    ? {
        message: error.message,
        issues: error.issues,
      }
    : metadata.validation
      ? {
          message: metadata.message,
          issues: metadata.validation,
        }
      : {
          message: statusCode >= 500 ? 'Internal server error' : metadata.message,
          code: metadata.code,
        };

  logger.error({ err: error, statusCode }, 'request failed');

  await reply.status(statusCode).send(payload);
};
