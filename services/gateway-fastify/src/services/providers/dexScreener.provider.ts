import httpClient from '../../utils/httpClient';
import { TokenData } from '../../types/token.types';
import { MarketProvider } from './provider.interface';
import { RateLimiter, exponentialBackoff } from '../../utils/rateLimiter';
import config from '../../config/config';

export class DexScreenerProvider implements MarketProvider {
  public name = 'dexscreener';
  private baseURL = 'https://api.dexscreener.com/latest/dex';
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.dexScreener);
  }

  async searchTokens(query: string): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const response = await httpClient.get(`${this.baseURL}/search`, {
            params: { q: query }
          });
          return this.transformData(response.data.pairs || []);
        } catch (err: any) {
          console.error(`[DexScreener] searchTokens failed for ${query}:`, err.message);
          return [];
        }
      });
    });
  }

  async fetchTrending(): Promise<TokenData[]> {
    // DexScreener has no dedicated trending endpoint on the free API, 
    // so we search for 'SOL' to get trending Solana pools.
    return this.searchTokens('SOL');
  }

  async fetchToken(address: string): Promise<TokenData | null> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const response = await httpClient.get(`${this.baseURL}/tokens/${address}`);
          const tokens = this.transformData(response.data.pairs || []);
          return tokens.length > 0 ? tokens[0] : null;
        } catch (err: any) {
          console.error(`[DexScreener] fetchToken failed for ${address}:`, err.message);
          return null;
        }
      });
    });
  }

  async fetchMarkets(): Promise<TokenData[]> {
    // Queries popular token queries to retrieve hundreds of live markets.
    const queries = ['SOL', 'ETH', 'USDT', 'USDC'];
    const results = await Promise.allSettled(queries.map(q => this.searchTokens(q)));
    const allTokens: TokenData[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled') {
        allTokens.push(...res.value);
      }
    }
    return allTokens;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await httpClient.get(`${this.baseURL}/tokens/So11111111111111111111111111111111111111112`);
      return response.status === 200;
    } catch (err: any) {
      console.error('[DexScreener] healthCheck failed:', err.message);
      return false;
    }
  }

  private transformData(pairs: any[]): TokenData[] {
    return pairs.map(pair => {
      const priceSol = parseFloat(pair.priceNative || '0');
      const priceUsd = parseFloat(pair.priceUsd || '1');
      return {
        token_address: pair.baseToken?.address || '',
        token_name: pair.baseToken?.name || '',
        token_ticker: pair.baseToken?.symbol || '',
        price_sol: priceSol,
        market_cap_sol: pair.marketCap ? pair.marketCap / priceUsd : 0,
        volume_sol: pair.volume?.h24 ? pair.volume.h24 / priceUsd : 0,
        liquidity_sol: pair.liquidity?.base || 0,
        transaction_count: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
        price_1hr_change: pair.priceChange?.h1 || 0,
        price_24hr_change: pair.priceChange?.h24 || 0,
        price_7d_change: pair.priceChange?.h7d || 0,
        protocol: pair.dexId || 'Unknown',
        source: 'dexscreener',
        last_updated: Date.now()
      };
    });
  }
}
export default new DexScreenerProvider();
