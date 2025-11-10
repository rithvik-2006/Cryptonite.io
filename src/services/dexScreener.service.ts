//services/dexScreener.service.ts
import axios from 'axios';
import { TokenData } from '../types/token.types';
import { RateLimiter, exponentialBackoff } from '../utils/rateLimiter';
import config  from '../config/config';

class DexScreenerService {
  private baseURL = 'https://api.dexscreener.com/latest/dex';
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.dexScreener);
  }

  // async searchTokens(query: string): Promise<TokenData[]> {
  //   return this.rateLimiter.throttle(async () => {
  //     return exponentialBackoff(async () => {
  //       const response = await axios.get(`${this.baseURL}/search`, {
  //         params: { q: query }
  //       });

  //       return this.transformData(response.data.pairs || []);
  //     });
  //   });
  // }

  async searchTokens(query: string): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      try {
        const { data } = await axios.get<{ pairs?: any[] }>(
          `${this.baseURL}/search`,
          { params: { q: query } }
        );
        
        return this.transformData(data?.pairs ?? []);
      } catch (err) {
        console.error("searchTokens failed:", err);
        return []; // fallback, but you lose retries
      }
    });
  }
  
  async getTokensByAddress(addresses: string[]): Promise<TokenData[]> {
    const tokens: TokenData[] = [];
    
    for (const address of addresses) {
      const tokenData = await this.rateLimiter.throttle(async () => {
        return exponentialBackoff(async () => {
          const response = await axios.get(`${this.baseURL}/tokens/${address}`);
          return this.transformData(response.data.pairs || []);
        });
      });
      tokens.push(...tokenData);
    }

    return tokens;
  }

  private transformData(pairs: any[]): TokenData[] {
    return pairs.map(pair => ({
      token_address: pair.baseToken?.address || '',
      token_name: pair.baseToken?.name || '',
      token_ticker: pair.baseToken?.symbol || '',
      price_sol: parseFloat(pair.priceNative || 0),
      market_cap_sol: pair.marketCap ? pair.marketCap / parseFloat(pair.priceUsd || 1) : 0,
      volume_sol: pair.volume?.h24 ? pair.volume.h24 / parseFloat(pair.priceUsd || 1) : 0,
      liquidity_sol: pair.liquidity?.base || 0,
      transaction_count: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
      price_1hr_change: pair.priceChange?.h1 || 0,
      price_24hr_change: pair.priceChange?.h24 || 0,
      price_7d_change: pair.priceChange?.h7d || 0,
      protocol: pair.dexId || 'Unknown',
      source: 'dexscreener',
      last_updated: Date.now()
    }));
  }
}

export default new DexScreenerService();
