// import { FastifyRequest, FastifyReply } from 'fastify';
// import aggregationService from '../services/aggregation.service';
// import { FilterParams, PaginationParams } from '../types/token.types';

// class TokenController {
//   getTokens = async (req: FastifyRequest, reply: FastifyReply) => {
//     try {
//       const q = (req.query ?? {}) as Record<string, string>;

//       const filters: FilterParams = {
//         timePeriod: (q.timePeriod as any) || '24h',
//         sortBy: (q.sortBy as any) || 'volume',
//         sortOrder: (q.sortOrder as any) || 'desc',
//       };

//       const pagination: PaginationParams = {
//         limit: q.limit ? parseInt(q.limit) : 20,
//         cursor: q.cursor,
//       };

//       const tokens = await aggregationService.aggregateTokens();
//       const result = aggregationService.filterAndSort(tokens, filters, pagination);

//       return reply.send({
//         success: true,
//         data: result.tokens,
//         pagination: {
//           nextCursor: result.nextCursor,
//           hasMore: result.hasMore,
//         },
//         fromCache: true, // mirrors your current response field
//       });
//     } catch (err: any) {
//       return reply.status(500).send({ success: false, error: err.message });
//     }
//   };

//   getTokenByAddress = async (
//     req: FastifyRequest<{ Params: { address: string } }>,
//     reply: FastifyReply
//   ) => {
//     try {
//       const { address } = req.params;
//       const tokens = await aggregationService.aggregateTokens();
//       const token = tokens.find((t) => t.token_address === address);

//       if (!token) {
//         return reply.status(404).send({ success: false, error: 'Token not found' });
//       }

//       return reply.send({ success: true, data: token });
//     } catch (err: any) {
//       return reply.status(500).send({ success: false, error: err.message });
//     }
//   };
// }

// export default new TokenController();


import { FastifyRequest, FastifyReply } from 'fastify';
import aggregationService from '../services/aggregation.service';
import { FilterParams, PaginationParams } from '../types/token.types';

class TokenController {
  getTokens = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const q = (req.query ?? {}) as Record<string, string>;

      const filters: FilterParams = {
        timePeriod: (q.timePeriod as any) || '24h',
        sortBy: (q.sortBy as any) || 'volume',
        sortOrder: (q.sortOrder as any) || 'desc',
      };

      const pagination: PaginationParams = {
        limit: q.limit ? parseInt(q.limit, 10) : 20,
        cursor: q.cursor,
      };

      const tokens = await aggregationService.aggregateTokens();
      const result = aggregationService.filterAndSort(tokens, filters, pagination);

      return reply.send({
        success: true,
        data: result.tokens,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
        fromCache: true,
      });
    } catch (err: any) {
      req.log.error({ err }, 'Error fetching tokens');
      return reply.status(500).send({ 
        success: false, 
        error: err.message || 'Internal server error' 
      });
    }
  };

  getTokenByAddress = async (
    req: FastifyRequest<{ Params: { address: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { address } = req.params;
      
      if (!address || address.trim() === '') {
        return reply.status(400).send({ 
          success: false, 
          error: 'Token address is required' 
        });
      }

      const tokens = await aggregationService.aggregateTokens();
      const token = tokens.find((t) => t.token_address === address);

      if (!token) {
        return reply.status(404).send({ 
          success: false, 
          error: 'Token not found' 
        });
      }

      return reply.send({ success: true, data: token });
    } catch (err: any) {
      req.log.error({ err, address: req.params.address }, 'Error fetching token');
      return reply.status(500).send({ 
        success: false, 
        error: err.message || 'Internal server error' 
      });
    }
  };
}

export default new TokenController();
