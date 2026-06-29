import { fromNodeHeaders } from 'better-auth/node';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { auth, type AuthSession } from '@/shared/lib/auth.js';

const activeSubscriptionStatuses = ['active', 'trialing'] as const;

const getSession = async (request: FastifyRequest) =>
  auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

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
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `${request.protocol}://${request.headers.host}`);
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
