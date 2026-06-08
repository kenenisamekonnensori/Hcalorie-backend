import dayjs from 'dayjs';

import { SERVICE_NAME } from '@/shared/constants/app.js';

import { healthResponseSchema, type HealthResponse } from '@/api/validators/health.validator.js';

export const buildHealthResponse = (): HealthResponse =>
  healthResponseSchema.parse({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: dayjs().toISOString(),
    uptime: process.uptime(),
  });
