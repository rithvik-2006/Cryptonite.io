//app.ts

import Fastify from 'fastify';
import config  from './config/config';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import socketPlugin from './plugins/socket-io';
import tokensRoutes from './routes/tokens.routes';
// src/app.ts (or your plugin)
const ORIGIN = process.env.CORS_ORIGIN || '*';


export function buildFastify() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    },
    trustProxy: true
  });

  // CORS
  // app.register(cors, { origin: true });
  app.register(cors, { origin: ORIGIN });
  // Rate limit only for API routes (not WebSocket)
  app.register(rateLimit, {
    global: false, // Don't apply globally
    max: 100,
    timeWindow: '1 minute',
    skipOnError: true
  });

  // Health check (no rate limit)
  app.get('/health', async () => ({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }));

  // WebSocket plugin
  app.register(socketPlugin);

  // API Routes with rate limiting
  app.register(tokensRoutes, { prefix: '/api' });

  return app;
}
