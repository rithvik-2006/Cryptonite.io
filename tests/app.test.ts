import { buildFastify } from '../src/app';
import { FastifyInstance } from 'fastify';

describe('Cryptonite API Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildFastify();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ========== HEALTH CHECK TESTS ==========
  describe('GET /health', () => {
    it('should return 200 status code', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return correct health check structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
    });

    it('should have status "ok"', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
    });

    it('should return valid timestamp', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = JSON.parse(response.body);
      const timestamp = new Date(body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  // ========== TOKEN API TESTS ==========
  describe('GET /api/tokens', () => {
    it('should return 200 status code', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return success true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens'
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return data array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens'
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return pagination info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens'
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toHaveProperty('nextCursor');
      expect(body.pagination).toHaveProperty('hasMore');
    });

    it('should respect limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=5'
      });

      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it('should have valid token structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=1'
      });

      const body = JSON.parse(response.body);
      if (body.data.length > 0) {
        const token = body.data[0];
        expect(token).toHaveProperty('token_address');
        expect(token).toHaveProperty('token_name');
        expect(token).toHaveProperty('price_sol');
        expect(token).toHaveProperty('market_cap_sol');
        expect(token).toHaveProperty('volume_sol');
        expect(token).toHaveProperty('source');
      }
    });
  });

  // ========== SORTING TESTS ==========
  describe('Token Sorting', () => {
    it('should sort by volume descending by default', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=10'
      });

      const body = JSON.parse(response.body);
      if (body.data.length > 1) {
        for (let i = 0; i < body.data.length - 1; i++) {
          expect(body.data[i].volume_sol).toBeGreaterThanOrEqual(
            body.data[i + 1].volume_sol
          );
        }
      }
    });

    it('should sort by price ascending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?sortBy=price&order=asc&limit=10'
      });

      const body = JSON.parse(response.body);
      if (body.data.length > 1) {
        for (let i = 0; i < body.data.length - 1; i++) {
          expect(body.data[i].price_sol).toBeLessThanOrEqual(
            body.data[i + 1].price_sol
          );
        }
      }
    });

    it('should sort by market cap descending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?sortBy=marketCap&order=desc&limit=10'
      });

      const body = JSON.parse(response.body);
      if (body.data.length > 1) {
        for (let i = 0; i < body.data.length - 1; i++) {
          expect(body.data[i].market_cap_sol).toBeGreaterThanOrEqual(
            body.data[i + 1].market_cap_sol
          );
        }
      }
    });
  });

  // ========== SINGLE TOKEN TESTS ==========
  describe('GET /api/tokens/:address', () => {
    let testTokenAddress: string;

    beforeAll(async () => {
      // Get a valid token address first
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=1'
      });
      const body = JSON.parse(response.body);
      if (body.data.length > 0) {
        testTokenAddress = body.data[0].token_address;
      }
    });

    it('should return 200 for valid token address', async () => {
      if (!testTokenAddress) {
        return; // Skip if no tokens available
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/tokens/${testTokenAddress}`
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return single token object', async () => {
      if (!testTokenAddress) {
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/tokens/${testTokenAddress}`
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');
    });

    it('should return 404 for invalid token address', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens/invalid_address_xyz123'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return error message for 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens/invalid_address_xyz123'
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('not found');
    });
  });

  // ========== EDGE CASE TESTS ==========
  describe('Edge Cases', () => {
    it('should handle non-existent endpoint with 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/nonexistent'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?sortBy=invalid&order=invalid'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
    });

    it('should handle extreme limit values', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=999999'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should handle zero limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=0'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(0);
    });

    it('should handle negative limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=-10'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ========== PERFORMANCE TESTS ==========
  describe('Performance', () => {
    it('should respond within 2 seconds', async () => {
      const start = Date.now();
      await app.inject({
        method: 'GET',
        url: '/api/tokens'
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
