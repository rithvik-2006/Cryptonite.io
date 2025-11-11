//app.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import socketPlugin from './plugins/socket-io';
import tokensRoutes from './routes/tokens.routes';
import { openapiOptions } from './schemas/openapi';

export function buildFastify() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    },
    trustProxy: true
  });

  // CORS
  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  });

  // Rate limit
  app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    skipOnError: true
  });

  // Swagger/OpenAPI specification
  app.register(swagger, openapiOptions);

  // Swagger UI + ReDoc
  app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    theme: {
      title: 'Cryptonite API Documentation'
    }
  });

  // Health check
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Server uptime in seconds' }
          }
        }
      }
    }
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));

  // WebSocket plugin
  app.register(socketPlugin);

  // API Routes
  app.register(tokensRoutes, { prefix: '/api' });

  return app;
}


//Development
// import Fastify from 'fastify';
// import config  from './config/config';
// import cors from '@fastify/cors';
// import rateLimit from '@fastify/rate-limit';
// import socketPlugin from './plugins/socket-io';
// import tokensRoutes from './routes/tokens.routes';
// // src/app.ts (or your plugin)
// const ORIGIN = process.env.CORS_ORIGIN || '*';


// export function buildFastify() {
//   const app = Fastify({
//     logger: {
//       level: process.env.LOG_LEVEL || 'info'
//     },
//     trustProxy: true
//   });

//   // CORS
//   // app.register(cors, { origin: true });
//   app.register(cors, { origin: ORIGIN });
//   // Rate limit only for API routes (not WebSocket)
//   app.register(rateLimit, {
//     global: false, // Don't apply globally
//     max: 100,
//     timeWindow: '1 minute',
//     skipOnError: true
//   });

//   // Health check (no rate limit)
//   app.get('/health', async () => ({ 
//     status: 'ok', 
//     timestamp: new Date().toISOString() 
//   }));

//   // WebSocket plugin
//   app.register(socketPlugin);

//   // API Routes with rate limiting
//   app.register(tokensRoutes, { prefix: '/api' });

//   return app;
// }
