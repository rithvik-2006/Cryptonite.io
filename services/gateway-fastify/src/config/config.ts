export default {
  port: parseInt(process.env.PORT || '8080'),
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  cacheTTL: parseInt(process.env.CACHE_TTL || '30'),
  apiRateLimits: {
    dexScreener: 300,
    jupiter: 600,
    geckoTerminal: 60
  }
};
