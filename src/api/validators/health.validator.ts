import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string(),
  uptime: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
