import Redis from 'ioredis';
import config from '../config/config';

class CacheService {
  private client: Redis;

  constructor() {
    const redisUrl = config.redis.url;
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Connected to Redis (Cache)');
    });
  }

  // Exposed for route-level or direct access
  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = config.cacheTTL): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const ping = await this.client.ping();
      return ping === 'PONG';
    } catch {
      return false;
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;
