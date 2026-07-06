'use client';

import { useGatewayHealth, useGatewayDebug, useBrainHealth } from '@/hooks/useInfrastructureStatus';
import { useSocket } from '@/providers/socket-provider';

export default function InfrastructurePage() {
  const { data: gatewayHealth } = useGatewayHealth();
  const { data: gatewayDebug } = useGatewayDebug();
  const { data: brainHealth } = useBrainHealth();
  const { latency } = useSocket();

  const isGatewayHealthy = gatewayHealth?.status === 'ok';
  const isBrainHealthy = brainHealth?.status === 'ok';
  const overallHealthy = isGatewayHealthy && isBrainHealthy;

  return (
    <div className="animate-in fade-in duration-500 max-w-[1600px] mx-auto space-y-6">
      {/* System Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full animate-pulse ${overallHealthy ? 'bg-[#10B981]' : 'bg-error'}`}></span>
            <h2 className="text-[24px] leading-[32px] font-semibold">
              Cluster Status: {overallHealthy ? 'Healthy' : 'Degraded'}
            </h2>
          </div>
          <p className="text-on-surface-variant text-[13px]">
            Last synchronized: {gatewayHealth?.lastSync ? new Date(gatewayHealth.lastSync).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[1px] bg-outline-variant border border-outline-variant">
        {/* Redis Health */}
        <div className="bg-surface p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant">
              REDIS_CLUSTER
            </span>
          </div>
          <div>
            <span className={`text-[10px] font-jetbrains px-1.5 py-0.5 border uppercase ${brainHealth?.redis === 'connected' ? 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10' : 'text-error border-error/30 bg-error/10'}`}>
              {brainHealth?.redis === 'connected' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Brain Engine Queue */}
        <div className="bg-surface p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant">
              BRAIN_QUEUE
            </span>
          </div>
          <div>
            <div className="font-jetbrains text-[16px] font-medium">
              {brainHealth?.queue_size ?? 0} <span className="text-sm opacity-40">tasks</span>
            </div>
          </div>
        </div>

        {/* Tokens Monitored */}
        <div className="bg-surface p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant">
              TOKENS_TRACKED
            </span>
          </div>
          <div>
            <div className="font-jetbrains text-[16px] font-medium">
              {(gatewayHealth?.tokens || 0).toLocaleString()}
            </div>
            <div className="font-jetbrains text-[11px] text-[#10B981]">
              Live via WebSocket
            </div>
          </div>
        </div>

        {/* API Latency */}
        <div className="bg-surface p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant">
              SOCKET_LATENCY
            </span>
          </div>
          <div>
            <div className="font-jetbrains text-[16px] font-medium">
              {latency !== null ? latency : '--'} <span className="text-sm opacity-40">ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="border border-outline-variant bg-surface-container-low p-6 relative overflow-hidden">
        <div className="mb-6">
          <h3 className="text-[18px] font-medium">Gateway Providers</h3>
          <p className="text-on-surface-variant text-[13px]">Real-time provider status and records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-container-low text-[11px] font-semibold tracking-[0.05em] uppercase border-b border-outline-variant">
              <tr>
                <th className="py-3 font-medium">PROVIDER</th>
                <th className="py-3 font-medium text-center">STATUS</th>
                <th className="py-3 font-medium text-right">RECORDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {gatewayDebug && Object.entries(gatewayDebug).map(([provider, info]) => (
                <tr key={provider} className="hover:bg-surface-container-high transition-colors">
                  <td className="py-3 font-jetbrains text-on-surface-variant">{provider}</td>
                  <td className="py-3 text-center">
                    {info.status === 'ok' ? (
                      <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">OK</span>
                    ) : (
                      <span className="bg-[#EF4444]/10 text-[#EF4444] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">{info.status}</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-jetbrains">{info.records}</td>
                </tr>
              ))}
              {!gatewayDebug && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-on-surface-variant text-[13px]">Loading providers...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
