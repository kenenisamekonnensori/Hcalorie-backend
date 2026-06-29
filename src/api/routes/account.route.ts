import type { FastifyPluginAsync } from 'fastify';

const premiumStatuses = ['active', 'trialing'] as const;

export const accountRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/me',
    {
      preHandler: app.requireAuth,
    },
    async (request) => {
      const subscription = await app.prisma.subscription.findFirst({
        where: {
          referenceId: request.auth!.user.id,
          status: {
            in: [...premiumStatuses],
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

      return {
        user: request.auth!.user,
        session: request.auth!.session,
        premium: {
          active: Boolean(subscription),
          plan: subscription?.plan ?? null,
          status: subscription?.status ?? null,
          periodEnd: subscription?.periodEnd ?? null,
        },
      };
    }
  );

  app.get(
    '/api/premium/features',
    {
      preHandler: app.requirePremium,
    },
    async () => ({
      features: {
        aiFoodScansPerMonth: 500,
        mealHistoryDays: 3650,
        advancedNutritionInsights: true,
        exportReports: true,
      },
    })
  );
};
