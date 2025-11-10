import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (app) => {
  await app.register(rateLimit, {
    global: true,
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),      // requests per window
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
    ban: 0,                                              // set >0 to temp-ban abusive clients
    cache: 10000,                                        // internal LRU size
    allowList: (req, key) => false                       // return true to skip limiting
  });
});
