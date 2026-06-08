import type { FastifyPluginAsync } from 'fastify';

import { buildHealthResponse } from '@/api/controllers/health.controller.js';

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => buildHealthResponse());
};
