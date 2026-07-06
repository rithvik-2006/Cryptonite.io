import httpClient from '../../utils/httpClient';
import { TokenData } from '../../types/token.types';
import { MarketProvider } from './provider.interface';
import { RateLimiter, exponentialBackoff } from '../../utils/rateLimiter';
import config from '../../config/config';

export class JupiterProvider implements MarketProvider {
  public name = 'jupiter';
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.jupiter);
  }

  async fetchTrending(): Promise<TokenData[]> {
    return this.fetchMarkets();
  }

  async fetchToken(address: string): Promise<TokenData | null> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          // Get metadata from verified token list
          const tokensRes = await httpClient.get<any[]>('https://tokens.jup.ag/tokens?tags=verified');
          const tokenMeta = tokensRes.data.find(t => t.address.toLowerCase() === address.toLowerCase());
          if (!tokenMeta) return null;

          // Fetch price from Jupiter Pricing API V3
          const headers: Record<string, string> = {};
          if (process.env.JUPITER_API_KEY) {
            headers['x-api-key'] = process.env.JUPITER_API_KEY;
          }
          const priceRes = await httpClient.get<any>(`https://api.jup.ag/price/v3?ids=${address}`, { headers });
          const priceInfo = priceRes.data?.[address];
          const priceUsd = typeof priceInfo?.usdPrice === 'number' ? priceInfo.usdPrice : parseFloat(priceInfo?.usdPrice || '0');

          return {
            token_address: tokenMeta.address,
            token_name: tokenMeta.name,
            token_ticker: tokenMeta.symbol,
            price_sol: priceUsd / 145.0, // convert price to SOL
            market_cap_sol: (tokenMeta.daily_volume || 0) / 145.0,
            volume_sol: (tokenMeta.daily_volume || 0) / 145.0,
            liquidity_sol: 100000, // Jupiter list doesn't expose liquidity directly
            transaction_count: 500,
            price_1hr_change: 0,
            price_24hr_change: 0,
            price_7d_change: 0,
            protocol: 'Jupiter',
            source: 'jupiter',
            last_updated: Date.now()
          };
        } catch (err: any) {
          console.error(`[Jupiter] fetchToken failed for ${address}:`, err.message);
          return null;
        }
      });
    });
  }

  async fetchMarkets(): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          // Fetch verified tokens list
          const tokensRes = await httpClient.get<any[]>('https://tokens.jup.ag/tokens?tags=verified');
          const topTokens = tokensRes.data
            .filter(t => t.daily_volume > 0)
            .sort((a, b) => (b.daily_volume || 0) - (a.daily_volume || 0))
            .slice(0, 50); // Get top 50 by daily volume

          if (topTokens.length === 0) return [];

          const addresses = topTokens.map(t => t.address).join(',');
          
          // Fetch prices for all top 50 in a single request (V3 endpoint)
          const headers: Record<string, string> = {};
          if (process.env.JUPITER_API_KEY) {
            headers['x-api-key'] = process.env.JUPITER_API_KEY;
          }
          const priceRes = await httpClient.get<any>(`https://api.jup.ag/price/v3?ids=${addresses}`, { headers });
          const prices = priceRes.data || {};

          const results: TokenData[] = [];
          for (const token of topTokens) {
            const priceInfo = prices[token.address];
            if (!priceInfo) continue;
            const priceUsd = typeof priceInfo.usdPrice === 'number' ? priceInfo.usdPrice : parseFloat(priceInfo.usdPrice || '0');

            results.push({
              token_address: token.address,
              token_name: token.name,
              token_ticker: token.symbol,
              price_sol: priceUsd / 145.0,
              market_cap_sol: (token.daily_volume || 0) / 145.0,
              volume_sol: (token.daily_volume || 0) / 145.0,
              liquidity_sol: 250000,
              transaction_count: 1000,
              price_1hr_change: 0,
              price_24hr_change: 0,
              price_7d_change: 0,
              protocol: 'Jupiter',
              source: 'jupiter',
              last_updated: Date.now()
            });
          }
          return results;
        } catch (err: any) {
          console.error('[Jupiter] fetchMarkets failed:', err.message);
          return [];
        }
      });
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await httpClient.get('https://tokens.jup.ag/tokens?tags=verified');
      return response.status === 200;
    } catch (err: any) {
      console.error('[Jupiter] healthCheck failed:', err.message);
      return false;
    }
  }
}
export default new JupiterProvider();
