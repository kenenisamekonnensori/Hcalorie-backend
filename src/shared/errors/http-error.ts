export interface HttpError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const createHttpError = (
  message: string,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details?: unknown,
): HttpError => Object.assign(new Error(message), { statusCode, code, details });
