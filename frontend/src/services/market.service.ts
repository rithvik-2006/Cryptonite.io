import { gatewayApi } from '@/lib/api';

export interface TokenData {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  market_cap_sol: number;
  volume_sol: number;
  liquidity_sol: number;
  price_24hr_change: number;
  transaction_count: number;
  protocol: string;
  source: string;
  last_updated: string;
}

export interface MarketResponse {
  success: boolean;
  data: TokenData[];
  pagination?: {
    nextCursor: number | null;
    hasMore: boolean;
  };
  total?: number;
  fromCache?: boolean;
}

export const marketService = {
  getTokens: async (params?: any): Promise<MarketResponse> => {
    return gatewayApi.get('/tokens', { params });
  },
  
  getTrending: async (): Promise<MarketResponse> => {
    return gatewayApi.get('/markets/trending');
  },
  
  getGainers: async (): Promise<MarketResponse> => {
    return gatewayApi.get('/markets/gainers');
  },
  
  getLosers: async (): Promise<MarketResponse> => {
    return gatewayApi.get('/markets/losers');
  },
  
  getNew: async (): Promise<MarketResponse> => {
    return gatewayApi.get('/markets/new');
  },
  
  getMarkets: async (): Promise<MarketResponse> => {
    return gatewayApi.get('/markets');
  },
  
  getTokenDetails: async (address: string): Promise<{ success: boolean; data: TokenData; fromCache: boolean }> => {
    return gatewayApi.get(`/tokens/${address}`);
  }
};
