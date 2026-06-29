import type { PrismaClient } from "@/generated/prisma/client.js";


export class UserRepository {
    constructor(
        private prisma: PrismaClient
    ) {}

    async createToken (userId: string, token: string, type: "REFRESH", expiresAt: Date) {
        return this.prisma.token.create({data: {userId, token, type, expiresAt}})
    }
}
