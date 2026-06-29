import type { PrismaClient } from "@/generated/prisma/client.js";
import type { AuthSession } from "@/shared/lib/auth.js";
import type { FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    requireAuth: (request: import("fastify").FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePremium: (request: import("fastify").FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    auth?: AuthSession;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}
