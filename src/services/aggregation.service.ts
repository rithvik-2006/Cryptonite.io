//services/aggregation.service.ts
import { TokenData, FilterParams, PaginationParams } from '../types/token.types';
import dexScreenerService from './dexScreener.service';
import geckoTerminalService from './geckoTerminal.service';
import cacheService from './cache.service';

class AggregationService {
  async aggregateTokens(forceRefresh: boolean = false): Promise<TokenData[]> {
    const cacheKey = 'tokens:all';
    
    if (!forceRefresh) {
      const cached = await cacheService.get<TokenData[]>(cacheKey);
      if (cached) return cached;
    }

    const [dexScreenerTokens, geckoTokens] = await Promise.allSettled([
      dexScreenerService.searchTokens('SOL'),
      geckoTerminalService.getTokens('solana')
    ]);

    let allTokens: TokenData[] = [];

    if (dexScreenerTokens.status === 'fulfilled') {
      allTokens.push(...dexScreenerTokens.value);
    }

    if (geckoTokens.status === 'fulfilled') {
      allTokens.push(...geckoTokens.value);
    }

    const mergedTokens = this.mergeTokens(allTokens);
    await cacheService.set(cacheKey, mergedTokens);

    return mergedTokens;
  }

  private mergeTokens(tokens: TokenData[]): TokenData[] {
    const tokenMap = new Map<string, TokenData>();

    for (const token of tokens) {
      const existing = tokenMap.get(token.token_address);
      
      if (!existing) {
        tokenMap.set(token.token_address, token);
      } else {
        // Merge data, preferring newer data
        const merged = {
          ...existing,
          volume_sol: Math.max(existing.volume_sol, token.volume_sol),
          liquidity_sol: Math.max(existing.liquidity_sol, token.liquidity_sol),
          transaction_count: existing.transaction_count + token.transaction_count,
          last_updated: Math.max(existing.last_updated, token.last_updated)
        };
        tokenMap.set(token.token_address, merged);
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
    const limit = pagination.limit || 20;
    const startIndex = pagination.cursor ? parseInt(pagination.cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedTokens = filtered.slice(startIndex, endIndex);

    return {
      tokens: paginatedTokens,
      nextCursor: endIndex < filtered.length ? endIndex.toString() : null,
      hasMore: endIndex < filtered.length
    };
  }
}

export default new AggregationService();
