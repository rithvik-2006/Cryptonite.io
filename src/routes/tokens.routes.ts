import { FastifyInstance } from 'fastify';
import tokenController from '../controllers/token.controller';

export default async function tokensRoutes(app: FastifyInstance) {
  app.get('/tokens', tokenController.getTokens);
  app.get('/tokens/:address', tokenController.getTokenByAddress);
}
