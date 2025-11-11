//services/geckoTerminal.service.ts
import axios, { AxiosInstance } from 'axios';
import { TokenData } from '../types/token.types';
import { RateLimiter, exponentialBackoff } from '../utils/rateLimiter';
import config from '../config/config';

class GeckoTerminalService {
  private baseURL = 'https://api.geckoterminal.com/api/v2';
  private rateLimiter: RateLimiter;
  private axiosInstance: AxiosInstance;
  private network = 'solana';

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.geckoTerminal);
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Main method: Get trending tokens from trending pools
   * GET /networks/{network}/trending_pools
   */
  async getTokens(): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const trendingTokens = await this.getTrendingPoolsTokens();
          
          if (trendingTokens.length > 0) {
            return trendingTokens;
          }

          return await this.getRecentlyUpdatedTokens();
        } catch (error: any) {
          return [];
        }
      });
    });
  }

  /**
   * GET /networks/{network}/trending_pools
   * Gets trending pools and extracts base tokens
   */
  private async getTrendingPoolsTokens(): Promise<TokenData[]> {
    const response = await this.axiosInstance.get(
      `/networks/${this.network}/trending_pools`,
      {
        params: {
          include: 'base_token,quote_token',
          page: 1,
        }
      }
    );

    const pools = response.data.data || [];
    const included = response.data.included || [];

    return this.transformPoolsToTokens(pools, included);
  }

  /**
   * GET /tokens/info_recently_updated
   * Gets most recently updated tokens (max 100)
   */
  async getRecentlyUpdatedTokens(): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const response = await this.axiosInstance.get('/tokens/info_recently_updated');
          
          const tokens = response.data.data || [];
          const included = response.data.included || [];

          return this.transformRecentlyUpdatedTokens(tokens, included);
        } catch (error: any) {
          return [];
        }
      });
    });
  }

  /**
   * GET /networks/{network}/tokens/{address}
   * Get single token data by address
   */
  async getTokenByAddress(address: string): Promise<TokenData | null> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const response = await this.axiosInstance.get(
            `/networks/${this.network}/tokens/${address}`
          );

          const tokenData = response.data.data;
          if (!tokenData) return null;

          return this.transformSingleToken(tokenData);
        } catch (error: any) {
          if (error.response?.status === 404) {
            return null;
          }
          throw error;
        }
      });
    });
  }

  /**
   * GET /networks/{network}/tokens/multi/{addresses}
   * Get multiple tokens by addresses
   */
  async getTokensByAddresses(addresses: string[]): Promise<TokenData[]> {
    if (addresses.length === 0) return [];

    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const addressString = addresses.join(',');
          const response = await this.axiosInstance.get(
            `/networks/${this.network}/tokens/multi/${addressString}`
          );

          const tokens = response.data.data || [];
          return tokens.map((token: any) => this.transformSingleToken(token));
        } catch (error: any) {
          return [];
        }
      });
    });
  }

  /**
   * GET /networks/{network}/tokens/{token_address}/pools
   * Get top pools for a specific token
   */
  async getTopPoolsByToken(tokenAddress: string): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const response = await this.axiosInstance.get(
            `/networks/${this.network}/tokens/${tokenAddress}/pools`,
            {
              params: {
                include: 'base_token,quote_token',
                page: 1,
              }
            }
          );

          const pools = response.data.data || [];
          const included = response.data.included || [];

          return this.transformPoolsToTokens(pools, included);
        } catch (error: any) {
          return [];
        }
      });
    });
  }

  /**
   * GET /networks/{network}/tokens/{address}/info
   * Get token info (metadata, social links, etc.)
   */
  async getTokenInfo(address: string): Promise<any> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        try {
          const response = await this.axiosInstance.get(
            `/networks/${this.network}/tokens/${address}/info`
          );

          return response.data.data;
        } catch (error: any) {
          return null;
        }
      });
    });
  }

  /**
   * Transform trending pools data to TokenData[]
   */
  private transformPoolsToTokens(pools: any[], included: any[]): TokenData[] {
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

      tokens.push({
        token_address: tokenAddress,
        token_name: attrs.name?.split(' / ')[0] || baseToken.attributes?.name || 'Unknown',
        token_ticker: baseToken.attributes?.symbol || 'UNKNOWN',
        price_sol: parseFloat(attrs.base_token_price_native_currency || '0'),
        market_cap_sol: this.convertUsdToSol(parseFloat(attrs.market_cap_usd || '0')),
        volume_sol: this.convertUsdToSol(parseFloat(attrs.volume_usd?.h24 || '0')),
        liquidity_sol: this.convertUsdToSol(parseFloat(attrs.reserve_in_usd || '0')),
        transaction_count: (attrs.transactions?.h24?.buys || 0) + (attrs.transactions?.h24?.sells || 0),
        price_1hr_change: parseFloat(attrs.price_change_percentage?.h1 || '0'),
        price_24hr_change: parseFloat(attrs.price_change_percentage?.h24 || '0'),
        price_7d_change: parseFloat(attrs.price_change_percentage?.h7d || '0'),
        protocol: pool.relationships?.dex?.data?.id?.split('_')[1] || 'Unknown',
        source: 'geckoterminal',
        last_updated: Date.now()
      });
    }

    return tokens;
  }

  /**
   * Transform recently updated tokens data
   */
  private transformRecentlyUpdatedTokens(tokens: any[], included: any[]): TokenData[] {
    return tokens
      .filter((token: any) => token.id?.startsWith('solana_'))
      .map((token: any) => this.transformSingleToken(token));
  }

  /**
   * Transform single token response
   */
  private transformSingleToken(token: any): TokenData {
    const attrs = token.attributes || {};
    const address = token.id?.split('_')[1] || attrs.address;

    return {
      token_address: address,
      token_name: attrs.name || 'Unknown',
      token_ticker: attrs.symbol || 'UNKNOWN',
      price_sol: parseFloat(attrs.price_usd || '0') / this.getEstimatedSolPrice(),
      market_cap_sol: this.convertUsdToSol(parseFloat(attrs.market_cap_usd || '0')),
      volume_sol: this.convertUsdToSol(parseFloat(attrs.volume_usd?.h24 || attrs.volume_24h_usd || '0')),
      liquidity_sol: this.convertUsdToSol(parseFloat(attrs.total_reserve_in_usd || '0')),
      transaction_count: attrs.gt_score || 0,
      price_1hr_change: parseFloat(attrs.price_change_percentage?.h1 || '0'),
      price_24hr_change: parseFloat(attrs.price_change_percentage?.h24 || '0'),
      price_7d_change: parseFloat(attrs.price_change_percentage?.h7d || '0'),
      protocol: 'Multiple',
      source: 'geckoterminal',
      last_updated: Date.now()
    };
  }

  private convertUsdToSol(usdValue: number): number {
    const solPrice = this.getEstimatedSolPrice();
    return usdValue / solPrice;
  }

  private getEstimatedSolPrice(): number {
    return 100; // $100 per SOL estimate
  }
}

export default new GeckoTerminalService();
