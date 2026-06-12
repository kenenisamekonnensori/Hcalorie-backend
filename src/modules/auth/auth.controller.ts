import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { AuthService } from "./auth.service.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";


function handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ZodError) {
        return reply.status(400).send({
            error: "Validation Error",
            issues: error.flatten().fieldErrors,
        })
    }

    const e = error as { statusCode?: number, message?: string};
    return reply.status(e.statusCode ?? 500).send({
        error: e.message ?? "Internal server error"
    })
}

export class AuthController {
    constructor(
        private  service: AuthService
    ) {}

    register = async (request: FastifyRequest, reply: FastifyReply) => {

        try {
            const body = registerSchema.parse(request.body);
            const result = await this.service.register(body);
            return reply.status(200).send(result);
        } catch(err) {
            handleError(err, reply);
        }
        
    }

    login = async (request: FastifyRequest, reply: FastifyReply) => {
        
        try {
            const body = loginSchema.parse(request.body);
            const result = await this.service.login(body);
            return reply.status(200).send(result);
        } catch (err) {
            handleError(err, reply);
        }
    }

    logout = async (request: FastifyRequest, reply: FastifyReply) => {

        try {
            const body = refreshSchema.parse(request.body);
            const result = await this.service.logout(body.refresh)
            return reply.status(200).send(result);
        } catch (err) {
            handleError(err, reply);
        }
    }

    getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { userId } = request.user;
            const profile = await this.service.getProfile(userId);
            return reply.status(200).send(profile)
        } catch (err) {
            handleError(err, reply);
        }
    }
}