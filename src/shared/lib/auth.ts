import { stripe } from '@better-auth/stripe';
import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import Stripe from 'stripe';

import { env } from '@/infrastructure/config/env.js';
import { prisma } from '@/infrastructure/database/prisma.js';

const baseURL = env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`;
const isProduction = env.NODE_ENV === 'production';

const plugins: BetterAuthPlugin[] = [];

if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRO_MONTHLY_PRICE_ID) {
  const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia',
  });

  plugins.push(
    stripe({
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'pro',
            priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID,
            annualDiscountPriceId: env.STRIPE_PRO_YEARLY_PRICE_ID,
            limits: {
              aiFoodScansPerMonth: 500,
              mealHistoryDays: 3650,
              advancedNutritionInsights: true,
              exportReports: true,
            },
          },
        ],
      },
    })
  );
}

export const auth = betterAuth({
  appName: 'HCalorie',
  baseURL,
  secret:
    env.BETTER_AUTH_SECRET ??
    'development-only-change-this-better-auth-secret',
  trustedOrigins: env.CORS_ORIGINS,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account',
          },
        }
      : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 10,
  },
  advanced: {
    useSecureCookies: isProduction,
    trustedProxyHeaders: true,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
    },
  },
  plugins,
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
