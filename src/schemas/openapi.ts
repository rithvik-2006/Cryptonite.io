import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';

export const openapiOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    info: {
      title: 'Cryptonite API',
      description: 'Real-time meme coin aggregation service that tracks token prices from DexScreener, Jupiter, and GeckoTerminal. Provides WebSocket support for live updates.',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@cryptonite.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://cryptonite-io.onrender.com',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Tokens',
        description: 'Token data endpoints'
      }
    ],
    components: {
      schemas: {
        Token: {
          type: 'object',
          properties: {
            token_address: {
              type: 'string',
              description: 'Unique token contract address'
            },
            token_name: {
              type: 'string',
              description: 'Token name'
            },
            token_ticker: {
              type: 'string',
              description: 'Token ticker symbol'
            },
            price_sol: {
              type: 'number',
              description: 'Current price in SOL'
            },
            market_cap_sol: {
              type: 'number',
              description: 'Market capitalization in SOL'
            },
            volume_sol: {
              type: 'number',
              description: '24-hour trading volume in SOL'
            },
            liquidity_sol: {
              type: 'number',
              description: 'Total liquidity in SOL'
            },
            price_24hr_change: {
              type: 'number',
              description: '24-hour price change percentage'
            },
            transaction_count: {
              type: 'number',
              description: 'Number of transactions'
            },
            protocol: {
              type: 'string',
              description: 'Protocol name (e.g., raydium, jupiter)'
            },
            source: {
              type: 'string',
              enum: ['dexscreener', 'jupiter', 'geckoterminal'],
              description: 'Data source'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      }
    }
  }
};
