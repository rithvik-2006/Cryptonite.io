import { useQuery } from '@tanstack/react-query';
import { marketService } from '@/services/market.service';

export function useTrendingMarkets() {
  return useQuery({
    queryKey: ['markets', 'trending'],
    queryFn: () => marketService.getTrending(),
    refetchInterval: 15000,
  });
}

export function useMarketData(params?: any) {
  return useQuery({
    queryKey: ['tokens', params],
    queryFn: () => marketService.getTokens(params),
    refetchInterval: 30000,
  });
}
