import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export default fp(async (app) => {
  await app.register(cors, {
    origin: true, // or a string/array for allowlist
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
});
