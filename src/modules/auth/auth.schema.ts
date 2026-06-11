import { z } from 'zod'

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be 8 characters"),
    name: z.string().optional()
})

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
})

export const refreshSchema = z.object({
    refresh: z.string().min(1)
})

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;