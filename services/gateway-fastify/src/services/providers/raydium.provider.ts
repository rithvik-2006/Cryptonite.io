import httpClient from '../../utils/httpClient';
import { TokenData } from '../../types/token.types';
import { MarketProvider } from './provider.interface';
import { RateLimiter, exponentialBackoff } from '../../utils/rateLimiter';
import config from '../../config/config';

export class RaydiumProvider implements MarketProvider {
  public name = 'raydium';
  private rateLimiter: RateLimiter;
  private baseURL = 'https://api.geckoterminal.com/api/v2';

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.geckoTerminal);
  }

  async fetchTrending(): Promise<TokenData[]> {
    return this.fetchMarkets();
  }

  async fetchToken(address: string): Promise<TokenData | null> {
    // Falls back to direct search/retrieval for Raydium
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const res = await httpClient.get(`${this.baseURL}/networks/solana/tokens/${address}/pools`, {
            params: { include: 'base_token', page: 1 }
          });
          const pools = res.data.data || [];
          const included = res.data.included || [];
          const raydiumPools = pools.filter((p: any) => p.relationships?.dex?.data?.id === 'solana_raydium');
          const tokens = this.transformPools(raydiumPools, included);
          return tokens.length > 0 ? tokens[0] : null;
        } catch (err: any) {
          console.error(`[Raydium] fetchToken failed for ${address}:`, err.message);
          return null;
        }
      });
    });
  }

  async fetchMarkets(): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const res = await httpClient.get(`${this.baseURL}/networks/solana/dexes/raydium/pools`, {
            params: { include: 'base_token', page: 1 }
          });
          const pools = res.data.data || [];
          const included = res.data.included || [];
          return this.transformPools(pools, included);
        } catch (err: any) {
          console.error('[Raydium] fetchMarkets failed:', err.message);
          return [];
        }
      });
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await httpClient.get(`${this.baseURL}/networks/solana/dexes/raydium`);
      return response.status === 200;
    } catch (err: any) {
      console.error('[Raydium] healthCheck failed:', err.message);
      return false;
    }
  }

  private transformPools(pools: any[], included: any[]): TokenData[] {
    const tokens: TokenData[] = [];
    const seenAddresses = new Set<string>();
    const tokenMap = new Map<string, any>();

    included.forEach((item: any) => {
      if (item.type === 'token') {
        tokenMap.set(item.id, item);
      }
    });

    for (const pool of pools) {
      const attrs = pool.attributes || {};
      const baseTokenId = pool.relationships?.base_token?.data?.id;
      const baseToken = tokenMap.get(baseTokenId);
      
      if (!baseToken) continue;

      const tokenAddress = baseToken.attributes?.address;
      if (!tokenAddress || seenAddresses.has(tokenAddress)) continue;
      seenAddresses.add(tokenAddress);

      const usdPrice = parseFloat(attrs.base_token_price_usd || '0');
      tokens.push({
        token_address: tokenAddress,
        token_name: attrs.name?.split(' / ')[0] || baseToken.attributes?.name || 'Unknown',
        token_ticker: baseToken.attributes?.symbol || 'UNKNOWN',
        price_sol: usdPrice / 145.0,
        market_cap_sol: parseFloat(attrs.market_cap_usd || '0') / 145.0,
        volume_sol: parseFloat(attrs.volume_usd?.h24 || '0') / 145.0,
        liquidity_sol: parseFloat(attrs.reserve_in_usd || '0') / 145.0,
        transaction_count: (attrs.transactions?.h24?.buys || 0) + (attrs.transactions?.h24?.sells || 0),
        price_1hr_change: parseFloat(attrs.price_change_percentage?.h1 || '0'),
        price_24hr_change: parseFloat(attrs.price_change_percentage?.h24 || '0'),
        price_7d_change: parseFloat(attrs.price_change_percentage?.h7d || '0'),
        protocol: 'Raydium',
        source: 'raydium',
        last_updated: Date.now()
      });
    }
    return tokens;
  }
}
export default new RaydiumProvider();
