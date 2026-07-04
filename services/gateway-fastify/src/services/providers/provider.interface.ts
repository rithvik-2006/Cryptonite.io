import { TokenData } from '../../types/token.types';

export interface MarketProvider {
  name: string;
  fetchTrending(): Promise<TokenData[]>;
  fetchToken(address: string): Promise<TokenData | null>;
  fetchMarkets(): Promise<TokenData[]>;
  healthCheck(): Promise<boolean>;
}
