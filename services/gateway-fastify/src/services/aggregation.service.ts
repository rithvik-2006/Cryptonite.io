import { TokenData, FilterParams, PaginationParams } from '../types/token.types';
import dexScreenerProvider from './providers/dexScreener.provider';
import geckoTerminalProvider from './providers/geckoTerminal.provider';
import jupiterProvider from './providers/jupiter.provider';
import raydiumProvider from './providers/raydium.provider';
import meteoraProvider from './providers/meteora.provider';
import orcaProvider from './providers/orca.provider';
import cacheService from './cache.service';
import config from '../config/config';
import { MarketProvider } from './providers/provider.interface';

class AggregationService {
  private providers: MarketProvider[] = [];
  private isRefreshing = false;

  constructor() {
    this.providers = [
      dexScreenerProvider,
      geckoTerminalProvider,
      jupiterProvider,
      raydiumProvider,
      meteoraProvider,
      orcaProvider
    ];
  }

  getProviders(): MarketProvider[] {
    return this.providers;
  }

  async aggregateTokens(forceRefresh: boolean = false): Promise<TokenData[]> {
    const cacheKey = 'tokens:all';
    
    // Warm cache read
    if (!forceRefresh) {
      const cached = await cacheService.get<TokenData[]>(cacheKey);
      const lastSyncStr = await cacheService.get<string>('provider:last_sync');
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const now = Date.now();

      if (cached) {
        // Serve instantly and trigger async background refresh if stale
        if (now - lastSync > config.cacheTTL * 1000 && !this.isRefreshing) {
          console.log(`[Aggregation] Cache is stale (${(now - lastSync) / 1000}s old). Spawning background refresh...`);
          this.isRefreshing = true;
          this.runFreshAggregation().finally(() => {
            this.isRefreshing = false;
          });
        }
        return cached;
      }
    }

    // Cold start or forced refresh
    return this.runFreshAggregation();
  }

  private async runFreshAggregation(): Promise<TokenData[]> {
    console.log('[Aggregation] Starting fresh parallel data aggregation across all providers...');
    const startSync = Date.now();
    
    const results = await Promise.allSettled(
      this.providers.map(async (provider) => {
        const startProvider = Date.now();
        console.log(`[Aggregation] ${provider.name} -> Started Fetch`);
        try {
          const tokens = await provider.fetchMarkets();
          const duration = Date.now() - startProvider;
          console.log(`[Aggregation] ${provider.name} -> Success: Retrieved ${tokens.length} Tokens in ${duration}ms`);
          return { name: provider.name, tokens, duration };
        } catch (err: any) {
          const duration = Date.now() - startProvider;
          console.error(`[Aggregation] ${provider.name} -> Failed after ${duration}ms:`, err.message);
          throw err;
        }
      })
    );

    let allTokens: TokenData[] = [];
    
    // Print summary logs for each provider
    console.log('\n--- Provider Ingestion Summary ---');
    results.forEach((res, index) => {
      const providerName = this.providers[index].name;
      if (res.status === 'fulfilled') {
        const data = res.value;
        console.log(`${data.name}\nRetrieved ${data.tokens.length} Tokens\n${data.duration}ms\n`);
        allTokens.push(...data.tokens);
      } else {
        console.error(`${providerName}\nFailed\nReason: ${res.reason?.message || res.reason}\n`);
      }
    });

    const mergeStart = Date.now();
    const mergedTokens = this.mergeTokens(allTokens);
    const mergeDuration = Date.now() - mergeStart;
    console.log(`Merged\n${mergedTokens.length} Unique Tokens\nTransformation Time: ${mergeDuration}ms\n`);

    // Write to Redis
    const writeStart = Date.now();
    const redis = cacheService.getClient();
    const pipeline = redis.pipeline();

    // Cache individual tokens
    for (const token of mergedTokens) {
      pipeline.setex(`token:${token.token_address}`, config.cacheTTL * 2, JSON.stringify(token));
    }

    // Cache all list
    pipeline.setex('tokens:all', config.cacheTTL * 2, JSON.stringify(mergedTokens));
    pipeline.setex('markets:all', config.cacheTTL * 2, JSON.stringify(mergedTokens));
    pipeline.setex('market:solana', config.cacheTTL * 2, JSON.stringify(mergedTokens.filter(t => t.protocol !== 'Unknown')));
    pipeline.setex('provider:last_sync', config.cacheTTL * 10, Date.now().toString());

    await pipeline.exec();
    const writeDuration = Date.now() - writeStart;
    console.log(`Redis Updated\nRedis Write Time: ${writeDuration}ms\n`);

    const totalDuration = Date.now() - startSync;
    console.log(`API Served\n${mergedTokens.length} Tokens\nTotal Sync Time: ${totalDuration}ms\n---------------------------------\n`);

    return mergedTokens;
  }

  private mergeTokens(tokens: TokenData[]): TokenData[] {
    const tokenMap = new Map<string, TokenData>();

    for (const token of tokens) {
      if (!token.token_address) continue;
      const normalizedAddress = token.token_address.trim();
      const existing = tokenMap.get(normalizedAddress);
      
      if (!existing) {
        tokenMap.set(normalizedAddress, token);
      } else {
        // Merge strategy:
        // Priority 1: Highest liquidity
        // Priority 2: Newest timestamp
        // Priority 3: Most complete metadata (longer name/ticker)
        
        const preferNew = (token.liquidity_sol > existing.liquidity_sol) ||
                          (token.liquidity_sol === existing.liquidity_sol && token.last_updated > existing.last_updated) ||
                          (token.liquidity_sol === existing.liquidity_sol && token.last_updated === existing.last_updated && token.token_name.length > existing.token_name.length);

        const merged: TokenData = {
          ...existing,
          volume_sol: Math.max(existing.volume_sol, token.volume_sol),
          liquidity_sol: Math.max(existing.liquidity_sol, token.liquidity_sol),
          transaction_count: existing.transaction_count + token.transaction_count,
          last_updated: Math.max(existing.last_updated, token.last_updated),
          
          ...(preferNew ? {
            price_sol: token.price_sol,
            market_cap_sol: token.market_cap_sol,
            price_1hr_change: token.price_1hr_change,
            price_24hr_change: token.price_24hr_change || existing.price_24hr_change,
            price_7d_change: token.price_7d_change || existing.price_7d_change,
            token_name: token.token_name || existing.token_name,
            token_ticker: token.token_ticker || existing.token_ticker,
            protocol: token.protocol || existing.protocol,
            source: token.source || existing.source
          } : {})
        };
        
        tokenMap.set(normalizedAddress, merged);
      }
    }

    return Array.from(tokenMap.values());
  }

  filterAndSort(
    tokens: TokenData[],
    filters: FilterParams,
    pagination: PaginationParams
  ) {
    let filtered = [...tokens];

    // Search query filter
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.token_name.toLowerCase().includes(q) ||
        t.token_ticker.toLowerCase().includes(q) ||
        t.token_address.toLowerCase().includes(q)
      );
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aVal = 0, bVal = 0;
        
        switch (filters.sortBy) {
          case 'volume':
            aVal = a.volume_sol;
            bVal = b.volume_sol;
            break;
          case 'market_cap':
            aVal = a.market_cap_sol;
            bVal = b.market_cap_sol;
            break;
          case 'price_change':
            const timeKey = filters.timePeriod === '7d' ? 'price_7d_change' :
                            filters.timePeriod === '24h' ? 'price_24hr_change' : 'price_1hr_change';
            aVal = (a as any)[timeKey] || 0;
            bVal = (b as any)[timeKey] || 0;
            break;
          case 'liquidity':
            aVal = a.liquidity_sol;
            bVal = b.liquidity_sol;
            break;
        }

        return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Pagination
    const limit = Math.min(pagination.limit || 20, 100); // Max 100 per page
    const startIndex = pagination.cursor ? parseInt(pagination.cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedTokens = filtered.slice(startIndex, endIndex);

    return {
      tokens: paginatedTokens,
      nextCursor: endIndex < filtered.length ? endIndex.toString() : null,
      hasMore: endIndex < filtered.length,
      total: filtered.length
    };
  }
}

export const aggregationService = new AggregationService();
export default aggregationService;
