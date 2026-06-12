import type { PrismaClient } from "@/generated/prisma/client.js";
import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import { hashPassword, verifyPassword } from "@/shared/utils/password.js";
import { emitWarning } from "process";
import { relative } from "path";

const REFRESH_TOKEN_TTL_DAYS = 30;

export class AuthService {
    constructor (
        private prisma: PrismaClient,
        private fastify: FastifyInstance
    ) {}

    private signAccessToken (userId: string, email: string): string {
        return this.fastify.jwt.sign({userId, email})
    }

    private signRefreshToken(): string {
        return crypto.randomBytes(64).toString("hex");
    }

    private async storeRefreshToken(userId: string, token: string): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

        await this.prisma.token.create(
            {data: {userId, token, type: "REFRESH", expiresAt}}
        )
    }

    private generateTokenPair(userId: string, email: string) {
        return {
            accessToken: this.signAccessToken(userId, email),
            refreshToken: this.signRefreshToken()
        }
    }

    async register(input: RegisterInput) {
        const existing = this.prisma.user.findUnique({
            where: {email: input.email}
        })

        if (existing && existing !== null) {
            throw { statausCode: 409, message: "email already in use"}
        }

        const passwordHashed = await hashPassword(input.password);

        const user = await this.prisma.user.create({
            data: {email: input.email, name: input.name ?? null, passwordHash: passwordHashed}
        })

        const tokens = this.generateTokenPair(user.id, user.email);
        await this.storeRefreshToken(user.id, tokens.refreshToken);

        return {
            user: {id: user.id, email: user.email, name: user.name},
            ...tokens
        }
    }

    async login(input: LoginInput) {

        const user =await this.prisma.user.findUnique({
            where: {email: input.email}
        })

        if (!user || !user.passwordHash) {
            throw { statusCode: 401, message: "Invalid credential"}
        }

        const valid = await verifyPassword(input.password, user.passwordHash);
        if(!valid) {
            throw {statusCode: 401, message: "Invalid Credential"}
        }

        const token = this.generateTokenPair(user.id, user.email);
        await this.storeRefreshToken(user.id, token.refreshToken)

        return {
            user: {id: user.id, email: user.email, name: user.name},
            ...token
        }

    }

    async refresh(refreshToken: string) {
        const stored = await this.prisma.token.findUnique({
            where: {token: refreshToken},
            include: {user: true},
        })

        if (!stored || stored.type !== "REFRESH" || stored.expiresAt < new Date() ){
            if (stored) await this.prisma.token.delete({ where: {id: stored.id}});
            throw {statusCode: 401, message: "Invalid refresh token or expired"}
        }

        await this.prisma.token.delete({where: {id: stored.id}})

        const token = this.generateTokenPair(stored.user.id, stored.user.email);
        await this.storeRefreshToken(stored.user.id, token.refreshToken);

        return {
            user: {id: stored.user.id, email: stored.user.email, name: stored.user.name},
            ...token,
        }
    }

    async handleGoogleCallBack(googleUser: {
        id: string,
        name: string,
        email: string
    }) {
        const user = await this.prisma.user.upsert({
            where: {googleId: googleUser.id},
            update: { name: googleUser.name},
            create: {
                email: googleUser.email,
                name: googleUser.name,
                googleId: googleUser.id,
            }
        })

        const token = this.generateTokenPair(user.id, user.email);
        await this.storeRefreshToken(user.id, token.refreshToken);

        return {
            user: {email: user.email, id: user.id, name: user.name},
            ...token,
        }
    }

    async logout(refreshToken: string): Promise<void> {
        await this.prisma.token.deleteMany({ where: {token: refreshToken}});
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: {id: userId},
            select: {id: true, email: true, name: true, createdAt: true},
        })

        if (!user) throw {statusCode: 404, message: "User not found"}

        return true
    }

}

