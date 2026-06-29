import type { FastifyPluginAsync } from 'fastify';

import { accountRoute } from '@/api/routes/account.route.js';
import { healthRoute } from '@/api/routes/health.route.js';

export const apiRoutes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoute);
  await app.register(accountRoute);
};
