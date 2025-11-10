//services/cache.service.ts
import Redis from 'ioredis';
import config  from '../config/config';

class CacheService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = config.cacheTTL): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }
}

export default new CacheService();

