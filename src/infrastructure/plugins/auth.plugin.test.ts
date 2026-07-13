import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/infrastructure/config/env.js';

const { redisMock, authHandlerMock, getSessionMock } = vi.hoisted(() => ({
  redisMock: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  },
  authHandlerMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('@/infrastructure/cache/redis.js', () => ({
  getRedisClient: () => redisMock,
}));

vi.mock('better-auth/node', () => ({
  fromNodeHeaders: (headers: unknown) => headers,
}));

vi.mock('@/shared/lib/auth.js', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
    handler: authHandlerMock,
  },
}));

import authPlugin, { buildAuthRequestUrl } from '@/infrastructure/plugins/auth.plugin.js';

const authBaseUrl = new URL(env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`);

describe('auth plugin', () => {
  beforeEach(() => {
    redisMock.incr.mockReset().mockResolvedValue(1);
    redisMock.expire.mockReset().mockResolvedValue(1);
    redisMock.ttl.mockReset().mockResolvedValue(env.AUTH_RATE_LIMIT_WINDOW_SECONDS);
    authHandlerMock.mockReset().mockResolvedValue(
      new Response('ok', {
        status: 200,
      })
    );
    getSessionMock.mockReset();
  });

  it('builds auth handler URLs from configured base URL', () => {
    const url = buildAuthRequestUrl('/api/auth/session?include=user');

    expect(url.origin).toBe(authBaseUrl.origin);
    expect(url.pathname).toBe('/api/auth/session');
    expect(url.searchParams.get('include')).toBe('user');
  });

  it('forwards non-mutating auth requests', async () => {
    const app = Fastify();

    await app.register(rawBody, {
      global: false,
      runFirst: true,
      encoding: 'utf8',
    });
    await app.register(authPlugin);

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(authHandlerMock).toHaveBeenCalledTimes(1);
  });

  it('blocks auth requests when rate limit is exceeded', async () => {
    redisMock.incr.mockResolvedValue(env.AUTH_RATE_LIMIT_MAX + 1);
    redisMock.ttl.mockResolvedValue(15);

    const app = Fastify();

    await app.register(rawBody, {
      global: false,
      runFirst: true,
      encoding: 'utf8',
    });
    await app.register(authPlugin);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'user@example.com', password: 'pw' },
    });

    await app.close();

    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBe('15');
    expect(authHandlerMock).not.toHaveBeenCalled();
  });
});
