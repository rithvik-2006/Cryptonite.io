'use client';

import { useLivePrices } from '@/hooks/useLivePrices';
import { useTrendingMarkets } from '@/hooks/useMarketData';
import { useTopSignals } from '@/hooks/useTopSignals';
import { useGatewayHealth } from '@/hooks/useInfrastructureStatus';
import { TokenData } from '@/services/market.service';

function formatNumber(num: number | undefined | null) {
  if (num == null) return '0.00';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  useLivePrices();
  const { data: gatewayHealth } = useGatewayHealth();
  const { data: trendingRes } = useTrendingMarkets();
  const { data: signals } = useTopSignals(2);

  const trendingTokens = trendingRes?.data?.slice(0, 4) || [];
  const activeTokens = gatewayHealth?.tokens || 0;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Hero Statistics Cards */}
      <div className="grid grid-cols-1 gap-[1px] bg-outline-variant border border-outline-variant rounded-sm overflow-hidden">
        <div className="bg-surface p-4 flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant">
            ACTIVE TOKENS
          </span>
          <span className="font-jetbrains text-[20px] font-medium text-primary">
            {activeTokens.toLocaleString()}
          </span>
          <span className="font-jetbrains text-[11px] text-on-surface-variant">REAL-TIME TELEMETRY ACTIVE</span>
        </div>
      </div>

      {/* Main Grid: Modular Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Tokens table */}
        <div className="glass-panel p-6 flex flex-col">
          <h3 className="text-[18px] font-medium text-primary mb-4">Volume Leaders</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant text-left">
                <th className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant pb-2">
                  TOKEN
                </th>
                <th className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant pb-2 text-right">
                  PRICE
                </th>
                <th className="text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant pb-2 text-right">
                  24H %
                </th>
              </tr>
            </thead>
            <tbody className="font-jetbrains text-[13px]">
              {trendingTokens.map((token: TokenData) => (
                <tr
                  key={token.token_address}
                  className="border-b border-surface-container-high hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <td className="py-3 text-primary">{token.token_ticker}</td>
                  <td className="py-3 text-right">${formatNumber(token.price_sol)}</td>
                  <td
                    className={`py-3 text-right ${
                      token.price_24hr_change > 0 ? 'text-[#10b981]' : 'text-error'
                    }`}
                  >
                    {token.price_24hr_change > 0 ? '+' : ''}
                    {token.price_24hr_change?.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {trendingTokens.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-on-surface-variant text-[13px]">
                    Waiting for market data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* AI Signals Card */}
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
          <h3 className="text-[18px] font-medium text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
            AI High-Conviction
          </h3>
          <div className="space-y-4">
            {signals && signals.length > 0 ? (
              signals.map((signal) => (
                <div
                  key={signal.id}
                  className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-sm"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-primary">
                      {signal.token}
                    </span>
                    <span className="font-jetbrains text-[11px] px-2 py-0.5 bg-primary text-background font-bold">
                      {Math.round(signal.confidence * 100)}% CONF
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant mb-2">
                    {signal.direction === 'BUY' ? 'Strong BUY signal generated.' : 'Signal detected.'}
                  </p>
                  <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${Math.round(signal.confidence * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-on-surface-variant">No active signals right now.</p>
            )}
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <footer className="mt-6 border-t border-outline-variant pt-4 flex justify-between items-center opacity-50">
        <div className="flex gap-4">
          <span className="text-[9px] font-semibold tracking-[0.05em] uppercase">
            API STATUS: NOMINAL
          </span>
          <span className="text-[9px] font-semibold tracking-[0.05em] uppercase">
            RPC: SOLANA_MAINNET_BETA
          </span>
        </div>
        <div className="text-[9px] font-semibold tracking-[0.05em] uppercase">
          © 2026 CRYPTONITE INSTITUTIONAL. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
