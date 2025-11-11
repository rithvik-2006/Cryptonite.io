//config.ts

  
export default {
  port: process.env.PORT || 3000,
  redis: {
    url: process.env.REDIS_URL || '', // TCP connection string
  },
  cacheTTL: parseInt(process.env.CACHE_TTL || '30'),
  apiRateLimits: {
    dexScreener: 300,
    jupiter: 600,
    geckoTerminal: 300
  }
};

//Developement
// export default {
//     port: process.env.PORT || 3000,
//     redis: {
//       host: process.env.REDIS_HOST || 'localhost',
//       port: parseInt(process.env.REDIS_PORT || '6379'),
//     },
//     cacheTTL: parseInt(process.env.CACHE_TTL || '30'),
//     apiRateLimits: {
//       dexScreener: 300, // per minute
//       jupiter: 600,
//       geckoTerminal: 300
//     }
//   };