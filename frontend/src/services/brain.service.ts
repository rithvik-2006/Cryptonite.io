import { brainApi } from '@/lib/api';

export interface Recommendation {
  id: string;
  token: string;
  confidence: number;
  direction: 'BUY' | 'SELL' | 'HOLD';
  timestamp: string;
  metadata?: any;
}

export const brainService = {
  getTopRecommendations: async (limit: number = 5): Promise<Recommendation[]> => {
    return brainApi.get('/recommendations/top', { params: { limit } });
  },
  
  getRecommendation: async (token: string): Promise<Recommendation> => {
    return brainApi.get(`/recommendations/${token}`);
  }
};
