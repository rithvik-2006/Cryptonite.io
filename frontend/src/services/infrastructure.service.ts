import { gatewayApi, brainApi } from '@/lib/api';

export interface GatewayHealth {
  status: string;
  providers: Record<string, string>;
  tokens: number;
  lastSync: string | null;
}

export interface BrainHealth {
  status: string;
  redis: string;
  queue_size: number;
}

export const infrastructureService = {
  getGatewayHealth: async (): Promise<GatewayHealth> => {
    return gatewayApi.get('/health');
  },
  
  getGatewayDebug: async (): Promise<Record<string, { status: string; records: number }>> => {
    return gatewayApi.get('/debug/providers');
  },
  
  getBrainHealth: async (): Promise<BrainHealth> => {
    return brainApi.get('/health');
  }
};
