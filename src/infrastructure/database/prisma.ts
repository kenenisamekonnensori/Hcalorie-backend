import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { env } from '@/infrastructure/config/env.js';

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

const logLevels: Prisma.LogLevel[] =
  env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const getPrismaClient = () => prisma;

export const closePrismaClient = async () => {
  await prisma.$disconnect();
};
