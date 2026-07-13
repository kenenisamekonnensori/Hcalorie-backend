import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const csv = (value: string | undefined) =>
  value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  CORS_ORIGINS: z.string().transform(csv).default('http://localhost:3000,http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().min(1).optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && !value.BETTER_AUTH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['BETTER_AUTH_SECRET'],
      message: 'BETTER_AUTH_SECRET is required in production',
    });
  }

  if (value.NODE_ENV === 'production' && !value.BETTER_AUTH_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['BETTER_AUTH_URL'],
      message: 'BETTER_AUTH_URL is required in production',
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsedEnv.data;
