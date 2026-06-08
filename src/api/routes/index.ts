import type { FastifyPluginAsync } from 'fastify';

import { healthRoute } from '@/api/routes/health.route.js';

export const apiRoutes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoute);
};
