import { describe, expect, it } from 'vitest';

import { buildApp } from '@/app.js';

describe('health route', () => {
  it('returns the application health payload', async () => {
    const app = buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toMatchObject({
        status: 'ok',
        service: 'hcalorie-backend',
      });
    } finally {
      await app.close();
    }
  });
});
