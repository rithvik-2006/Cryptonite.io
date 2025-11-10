//services/geckoTerminal.service.ts
import axios from 'axios';
import { TokenData } from '../types/token.types';
import { RateLimiter, exponentialBackoff } from '../utils/rateLimiter';
import config  from '../config/config';

class GeckoTerminalService {
  private baseURL = 'https://api.geckoterminal.com/api/v2';
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(config.apiRateLimits.geckoTerminal);
  }

  async getTokens(network: string = 'solana'): Promise<TokenData[]> {
    return this.rateLimiter.throttle(async () => {
      return exponentialBackoff(async () => {
        const response = await axios.get(
          `${this.baseURL}/networks/${network}/tokens`,
          { params: { page: 1 } }
        );

        return this.transformData(response.data.data || []);
      });
    });
  }

  private transformData(tokens: any[]): TokenData[] {
    return tokens.map(token => ({
      token_address: token.attributes?.address || '',
      token_name: token.attributes?.name || '',
      token_ticker: token.attributes?.symbol || '',
      price_sol: parseFloat(token.attributes?.price_in_native || 0),
      market_cap_sol: parseFloat(token.attributes?.market_cap_in_native || 0),
      volume_sol: parseFloat(token.attributes?.volume_24h_in_native || 0),
      liquidity_sol: parseFloat(token.attributes?.liquidity_in_native || 0),
      transaction_count: token.attributes?.transactions_24h || 0,
      price_1hr_change: token.attributes?.price_change_percentage_1h || 0,
      price_24hr_change: token.attributes?.price_change_percentage_24h || 0,
      price_7d_change: token.attributes?.price_change_percentage_7d || 0,
      protocol: token.relationships?.dex?.data?.id || 'Unknown',
      source: 'geckoterminal',
      last_updated: Date.now()
    }));
  }
}

export default new GeckoTerminalService();
