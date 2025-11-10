//types/token.types.ts
export interface TokenData {
    token_address: string;
    token_name: string;
    token_ticker: string;
    price_sol: number;
    market_cap_sol: number;
    volume_sol: number;
    liquidity_sol: number;
    transaction_count: number;
    price_1hr_change: number;
    price_24hr_change?: number;
    price_7d_change?: number;
    protocol: string;
    source: string;
    last_updated: number;
  }
  
  export interface PaginationParams {
    limit?: number;
    cursor?: string;
  }
  
  export interface FilterParams {
    timePeriod?: '1h' | '24h' | '7d';
    sortBy?: 'volume' | 'price_change' | 'market_cap' | 'liquidity';
    sortOrder?: 'asc' | 'desc';
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data: T;
    pagination?: {
      nextCursor: string | null;
      hasMore: boolean;
    };
    fromCache?: boolean;
  }
