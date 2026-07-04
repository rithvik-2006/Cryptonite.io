import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet'; // We need to install this
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import routes from './routes';
import { setupWebsockets } from './websockets';

const server = fastify({ logger: true });

async function bootstrap() {
    try {
        await server.register(cors, { origin: '*' });
        await server.register(helmet);
        
        await server.register(rateLimit, {
            max: 100,
            timeWindow: '1 minute'
        });

        await server.register(swagger, {
            swagger: {
                info: {
                    title: 'Cryptonite Gateway API',
                    description: 'Fastify Gateway API for Cryptonite Phase 1',
                    version: '1.0.0'
                },
                consumes: ['application/json'],
                produces: ['application/json']
            }
        });

        await server.register(swaggerUi, {
            routePrefix: '/docs',
        });

        await server.register(routes);

        setupWebsockets(server);

        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
        await server.listen({ port, host: '0.0.0.0' });
        
        server.log.info(`Swagger UI available at http://localhost:${port}/docs`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

bootstrap();
