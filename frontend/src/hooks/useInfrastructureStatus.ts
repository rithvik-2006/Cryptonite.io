import { useQuery } from '@tanstack/react-query';
import { infrastructureService } from '@/services/infrastructure.service';

export function useGatewayHealth() {
  return useQuery({
    queryKey: ['health', 'gateway'],
    queryFn: () => infrastructureService.getGatewayHealth(),
    refetchInterval: 15000,
  });
}

export function useGatewayDebug() {
  return useQuery({
    queryKey: ['debug', 'providers'],
    queryFn: () => infrastructureService.getGatewayDebug(),
    refetchInterval: 15000,
  });
}

export function useBrainHealth() {
  return useQuery({
    queryKey: ['health', 'brain'],
    queryFn: () => infrastructureService.getBrainHealth(),
    refetchInterval: 15000,
  });
}
