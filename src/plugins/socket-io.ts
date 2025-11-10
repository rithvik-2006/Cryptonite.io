import fp from 'fastify-plugin';
import { Server as IOServer } from 'socket.io';
import { TokenData } from '../types/token.types';
import aggregationService from '../services/aggregation.service';

declare module 'fastify' {
  interface FastifyInstance {
    io: IOServer;
  }
}

export default fp(async (fastify) => {
  const io = new IOServer(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  fastify.decorate('io', io);

  io.on('connection', (socket) => {
    fastify.log.info({ id: socket.id }, 'WS client connected');

    socket.on('subscribe', async () => {
      const tokens = await aggregationService.aggregateTokens();
      socket.emit('initial-data', tokens);
    });

    socket.on('disconnect', () => {
      fastify.log.info({ id: socket.id }, 'WS client disconnected');
    });
  });

  // periodic broadcasts (keeps your “initial load → WS updates” flow)
  const interval = setInterval(async () => {
    try {
      const tokens: TokenData[] = await aggregationService.aggregateTokens(true);
      io.emit('price-update', tokens);
    } catch (err) {
      fastify.log.error({ err }, 'Periodic update failed');
    }
  }, 30_000);

  fastify.addHook('onClose', async () => {
    clearInterval(interval);
    io.close();
  });
});
