import { fromNodeHeaders } from 'better-auth/node';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { getRedisClient } from '@/infrastructure/cache/redis.js';
import { env } from '@/infrastructure/config/env.js';
import { auth, type AuthSession } from '@/shared/lib/auth.js';

const activeSubscriptionStatuses = ['active', 'trialing'] as const;
const AUTH_RATE_LIMIT_KEY_PREFIX = 'auth:route-rate-limit';
const AUTH_ROUTE_METHODS = new Set(['POST']);
const authBaseUrl = new URL(env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`);

const getSession = async (request: FastifyRequest) =>
  auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

const getClientIp = (request: FastifyRequest): string => request.ip;

export const buildAuthRequestUrl = (requestUrl: string): URL => new URL(requestUrl, authBaseUrl);

const enforceAuthRateLimit = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!AUTH_ROUTE_METHODS.has(request.method)) {
    return;
  }

  const redis = getRedisClient();
  const requestPath = request.url.split('?')[0] ?? request.url;
  const key = `${AUTH_RATE_LIMIT_KEY_PREFIX}:${getClientIp(request)}:${requestPath}`;
  const windowSeconds = env.AUTH_RATE_LIMIT_WINDOW_SECONDS;
  const maxRequests = env.AUTH_RATE_LIMIT_MAX;

  try {
    const requestCount = await redis.incr(key);

    if (requestCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (requestCount <= maxRequests) {
      return;
    }

    const ttlSeconds = await redis.ttl(key);
    const retryAfter = ttlSeconds > 0 ? ttlSeconds : windowSeconds;
    reply.header('Retry-After', String(retryAfter));
    reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Try again later.',
      retryAfter,
    });
  } catch (error) {
    request.log.error({ err: error }, 'authentication rate limit failed');
    reply.status(503).send({
      error: 'Authentication Unavailable',
      message: 'Authentication is temporarily unavailable.',
    });
  }
};

const sendUnauthorized = (reply: FastifyReply) =>
  reply.status(401).send({
    error: 'Unauthorized',
    message: 'Sign in to continue.',
  });

const sendPaymentRequired = (reply: FastifyReply) =>
  reply.status(402).send({
    error: 'Payment Required',
    message: 'Upgrade to HCalorie Pro to use this feature.',
  });

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await getSession(request);

    if (!session) {
      return sendUnauthorized(reply);
    }

    request.auth = session;
  });

  fastify.decorate('requirePremium', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.auth ?? (await getSession(request));

    if (!session) {
      return sendUnauthorized(reply);
    }

    request.auth = session;

    const subscription = await fastify.prisma.subscription.findFirst({
      where: {
        referenceId: session.user.id,
        status: {
          in: [...activeSubscriptionStatuses],
        },
        OR: [
          { periodEnd: null },
          {
            periodEnd: {
              gt: new Date(),
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return sendPaymentRequired(reply);
    }
  });

  fastify.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    config: {
      rawBody: true,
    },
    preHandler: enforceAuthRateLimit,
    async handler(request, reply) {
      try {
        const url = buildAuthRequestUrl(request.url);
        const body =
          request.method === 'GET' || request.method === 'HEAD'
            ? undefined
            : request.rawBody ?? (request.body ? JSON.stringify(request.body) : undefined);

        const requestInit: RequestInit = {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
        };

        if (body !== undefined) {
          requestInit.body = body;
        }

        const response = await auth.handler(new Request(url.toString(), requestInit));

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));

        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        request.log.error({ err: error }, 'authentication request failed');
        return reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        });
      }
    },
  });
});

export default authPlugin;
export type { AuthSession };
