import { useQuery } from '@tanstack/react-query';
import { brainService } from '@/services/brain.service';

export function useTopSignals(limit: number = 5) {
  return useQuery({
    queryKey: ['recommendations', 'top', limit],
    queryFn: () => brainService.getTopRecommendations(limit),
    refetchInterval: 60000,
  });
}
