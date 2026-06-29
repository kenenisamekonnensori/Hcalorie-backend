import fp from 'fastify-plugin';
import { prisma } from '../database/prisma.js';


export default fp(async (fastify) => {
    await prisma.$connect();

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
        await prisma.$disconnect();
    })
})
