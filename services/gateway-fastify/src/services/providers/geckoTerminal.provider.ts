import axios, { AxiosInstance } from 'axios';
import { TokenData } from '../../types/token.types';
import { MarketProvider } from './provider.interface';
import { RateLimiter, exponentialBackoff } from '../../utils/rateLimiter';
import config from '../../config/config';

// Default SOL price for USD → SOL conversion. Updated lazily via trending pool data.
const DEFAULT_SOL_PRICE_USD = 145.0;

/**
 * GeckoTerminal Market Provider
 *
 * Architecture:
 *   - Public methods (fetchTrending, fetchMarkets, fetchToken, healthCheck) are
 *     throttled through the RateLimiter and wrapped in exponentialBackoff.
 *   - Private helper methods (_getTrendingPools, _getTopPools, _getTokenPools)
 *     perform raw HTTP calls WITHOUT throttling to avoid nested-lock deadlocks.
 *   - Only pool endpoints are used — never /tokens/info_recently_updated — because
 *     pool responses contain the full market metrics (volume, liquidity, FDV, txns).
 */
export class GeckoTerminalProvider implements MarketProvider {
  public name = 'geckoterminal';

  private readonly baseURL = 'https://api.geckoterminal.com/api/v2';
  private readonly network = 'solana';
  private readonly rateLimiter: RateLimiter;
  private readonly http: AxiosInstance;

  // Cached SOL price, refreshed on each trending fetch
  private solPriceUsd = DEFAULT_SOL_PRICE_USD;

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.geckoTerminal);

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json;version=20230302',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Public API — every method is throttled + retried exactly once at this layer
  // ---------------------------------------------------------------------------

  async fetchTrending(): Promise<TokenData[]> {
    return this.rateLimiter.throttle(() =>
      exponentialBackoff(async () => {
        try {
          const { pools, included } = await this._getTrendingPools();
          this._tryUpdateSolPrice(pools, included);
          return this._transformPools(pools, included);
        } catch (err: any) {
          console.error('[GeckoTerminal] fetchTrending failed:', err.message);
          return [];
        }
      })
    );
  }

  async fetchMarkets(): Promise<TokenData[]> {
    return this.rateLimiter.throttle(() =>
      exponentialBackoff(async () => {
        try {
          // Fetch trending pools and top pools as two separate raw calls
          // (NOT via fetchTrending — that would nest the throttle).
          const [trending, top] = await Promise.all([
            this._getTrendingPools(),
            this._getTopPools(),
          ]);

          // Attempt to calibrate SOL price from trending data
          this._tryUpdateSolPrice(trending.pools, trending.included);

          const trendingTokens = this._transformPools(trending.pools, trending.included);
          const topTokens = this._transformPools(top.pools, top.included);

          return this._deduplicateByAddress([...trendingTokens, ...topTokens]);
        } catch (err: any) {
          console.error('[GeckoTerminal] fetchMarkets failed:', err.message);
          return [];
        }
      })
    );
  }

  async fetchToken(address: string): Promise<TokenData | null> {
    return this.rateLimiter.throttle(() =>
      exponentialBackoff(async () => {
        try {
          const { pools, included } = await this._getTokenPools(address);
          const tokens = this._transformPools(pools, included);
          return tokens.length > 0 ? tokens[0] : null;
        } catch (err: any) {
          if (err.response?.status === 404) return null;
          console.error(`[GeckoTerminal] fetchToken(${address}) failed:`, err.message);
          return null;
        }
      })
    );
  }

  /**
   * Health check goes through the rate limiter so it never self-induces 429s.
   * Queries a lightweight pools endpoint with page=1.
   */
  async healthCheck(): Promise<boolean> {
    return this.rateLimiter.throttle(() =>
      exponentialBackoff(async () => {
        try {
          const response = await this.http.get(
            `/networks/${this.network}/pools`,
            { params: { page: 1 }, timeout: 5000 }
          );
          return response.status === 200;
        } catch (err: any) {
          console.error('[GeckoTerminal] healthCheck failed:', err.message);
          return false;
        }
      }, 2, 500) // Fewer retries (2) and shorter base delay (500ms) for health probes
    );
  }

  // ---------------------------------------------------------------------------
  // Private HTTP helpers — raw calls, NO throttling (called from within throttle)
  // ---------------------------------------------------------------------------

  /** Fetch trending Solana pools with included token metadata */
  private async _getTrendingPools(): Promise<{ pools: any[]; included: any[] }> {
    const response = await this.http.get(
      `/networks/${this.network}/trending_pools`,
      {
        params: {
          include: 'base_token,quote_token',
          page: 1,
        },
      }
    );
    return {
      pools: response.data.data || [],
      included: response.data.included || [],
    };
  }

  /** Fetch top Solana pools ordered by volume (general market overview) */
  private async _getTopPools(): Promise<{ pools: any[]; included: any[] }> {
    const response = await this.http.get(
      `/networks/${this.network}/pools`,
      {
        params: {
          include: 'base_token,quote_token',
          page: 1,
          sort: 'h24_volume_usd_liquidity_desc',
        },
      }
    );
    return {
      pools: response.data.data || [],
      included: response.data.included || [],
    };
  }

  /** Fetch pools for a specific token address */
  private async _getTokenPools(address: string): Promise<{ pools: any[]; included: any[] }> {
    const response = await this.http.get(
      `/networks/${this.network}/tokens/${address}/pools`,
      {
        params: {
          include: 'base_token,quote_token',
          page: 1,
        },
      }
    );
    return {
      pools: response.data.data || [],
      included: response.data.included || [],
    };
  }

  // ---------------------------------------------------------------------------
  // Data transformation — converts pool API responses to TokenData[]
  // ---------------------------------------------------------------------------

  /**
   * Transform GeckoTerminal pool objects into TokenData.
   * Uses pool attributes (volume, liquidity, FDV, txns, price changes) — NOT
   * the incomplete /tokens/info_recently_updated metadata endpoint.
   */
  private _transformPools(pools: any[], included: any[]): TokenData[] {
    const tokens: TokenData[] = [];
    const seenAddresses = new Set<string>();

    // Build lookup map: included token id → token object
    const tokenMap = new Map<string, any>();
    for (const item of included) {
      if (item.type === 'token') {
        tokenMap.set(item.id, item);
      }
    }

    for (const pool of pools) {
      const attrs = pool.attributes || {};
      const baseTokenId = pool.relationships?.base_token?.data?.id;
      const baseToken = tokenMap.get(baseTokenId);

      if (!baseToken) continue;

      const tokenAddress = baseToken.attributes?.address;
      if (!tokenAddress || seenAddresses.has(tokenAddress)) continue;
      seenAddresses.add(tokenAddress);

      // Extract volume_usd — API nests it under volume_usd.h24 or flat
      const volumeUsd = this._parseNumber(attrs.volume_usd?.h24);
      const reserveUsd = this._parseNumber(attrs.reserve_in_usd);
      const fdvUsd = this._parseNumber(attrs.fdv_usd);
      const marketCapUsd = this._parseNumber(attrs.market_cap_usd) || fdvUsd;

      // Transaction counts
      const buys = attrs.transactions?.h24?.buys || 0;
      const sells = attrs.transactions?.h24?.sells || 0;

      // Price change percentages
      const pctH1 = this._parseNumber(attrs.price_change_percentage?.h1);
      const pctH24 = this._parseNumber(attrs.price_change_percentage?.h24);
      const pctH7d = this._parseNumber(attrs.price_change_percentage?.h7d
        // Some API versions use 'h7d', others 'weekly' — fall back gracefully
      ) || this._parseNumber(attrs.price_change_percentage?.weekly);

      // Determine DEX name from relationship
      const dexId = pool.relationships?.dex?.data?.id || '';
      const protocol = dexId.split('_').slice(1).join('_') || 'Unknown';

      tokens.push({
        token_address: tokenAddress,
        token_name:
          attrs.name?.split(' / ')[0] ||
          baseToken.attributes?.name ||
          'Unknown',
        token_ticker: baseToken.attributes?.symbol || 'UNKNOWN',
        price_sol: this._parseNumber(attrs.base_token_price_native_currency),
        market_cap_sol: this._convertUsdToSol(marketCapUsd),
        volume_sol: this._convertUsdToSol(volumeUsd),
        liquidity_sol: this._convertUsdToSol(reserveUsd),
        transaction_count: buys + sells,
        price_1hr_change: pctH1,
        price_24hr_change: pctH24,
        price_7d_change: pctH7d,
        protocol,
        source: 'geckoterminal',
        last_updated: Date.now(),
      });
    }

    return tokens;
  }

  // ---------------------------------------------------------------------------
  // Utility helpers
  // ---------------------------------------------------------------------------

  /** Deduplicate an array of TokenData by token_address, keeping first occurrence */
  private _deduplicateByAddress(tokens: TokenData[]): TokenData[] {
    const seen = new Set<string>();
    return tokens.filter((t) => {
      if (seen.has(t.token_address)) return false;
      seen.add(t.token_address);
      return true;
    });
  }

  /** Convert a USD value to SOL using the cached SOL price */
  private _convertUsdToSol(usdValue: number): number {
    if (usdValue === 0 || this.solPriceUsd === 0) return 0;
    return usdValue / this.solPriceUsd;
  }

  /** Safe numeric parse — handles strings, numbers, null, undefined */
  private _parseNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Attempt to update the cached SOL price from pool data.
   * Looks for a pool whose quote token is SOL (Wrapped SOL) and uses
   * the quote_token_price_usd as the live SOL price.
   */
  private _tryUpdateSolPrice(pools: any[], included: any[]): void {
    // Build included map
    const tokenMap = new Map<string, any>();
    for (const item of included) {
      if (item.type === 'token') {
        tokenMap.set(item.id, item);
      }
    }

    for (const pool of pools) {
      const quoteTokenId = pool.relationships?.quote_token?.data?.id;
      const quoteToken = tokenMap.get(quoteTokenId);
      const quoteSymbol = quoteToken?.attributes?.symbol?.toUpperCase();

      // Wrapped SOL is the native quote on Solana DEXes
      if (quoteSymbol === 'SOL' || quoteSymbol === 'WSOL') {
        const quotePrice = this._parseNumber(
          pool.attributes?.quote_token_price_usd
        );
        if (quotePrice > 0) {
          this.solPriceUsd = quotePrice;
          return;
        }
      }
    }
  }
}

export default new GeckoTerminalProvider();
