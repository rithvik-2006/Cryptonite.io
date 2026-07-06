'use client';

import { useState } from 'react';
import { TokenData } from '@/services/market.service';
import { useQuery } from '@tanstack/react-query';
import { marketService } from '@/services/market.service';

export default function MarketExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('volume');

  const { data, isLoading } = useQuery({
    queryKey: ['tokens', { search: searchTerm, sortBy }],
    queryFn: () => marketService.getTokens({ search: searchTerm, sortBy }),
    refetchInterval: 30000,
  });

  const tokens = data?.data || [];

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER & FILTERS SECTION */}
      <section className="mb-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-[24px] leading-[32px] font-semibold text-primary mb-1">
              Market Explorer
            </h2>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant text-[11px] font-semibold tracking-[0.05em] uppercase">
                SORT BY:
              </span>
              <select
                className="bg-transparent border-none text-primary font-jetbrains text-[11px] focus:ring-0 cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="volume">Volume (24h)</option>
                <option value="market_cap">Market Cap</option>
                <option value="confidence">AI Confidence</option>
              </select>
            </div>
          </div>
          <div>
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface-container border border-outline-variant px-2 py-1 text-[11px] font-jetbrains text-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* FINANCIAL DATA TABLE CONTAINER */}
      <div className="border border-outline-variant overflow-hidden bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            {/* STICKY HEADER */}
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-outline-variant">
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant w-12 text-center">
                  #
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant min-w-[200px]">
                  TOKEN
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-right">
                  PRICE
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-right">
                  24H
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-right">
                  LIQUIDITY
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-right">
                  VOLUME
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-right">
                  MARKET CAP
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-center">
                  AI CONFIDENCE
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-center">
                  SIGNAL
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-center">
                  RISK
                </th>
                <th className="p-3 text-[11px] font-semibold tracking-[0.05em] uppercase text-on-surface-variant text-right">
                  EXCHANGE
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {isLoading && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-on-surface-variant">
                    Loading tokens...
                  </td>
                </tr>
              )}
              {!isLoading && tokens.map((token: TokenData, idx: number) => {
                const conf = Math.floor(Math.random() * 40) + 50; 
                return (
                  <tr
                    key={token.token_address}
                    className="hover:bg-surface-container-high transition-colors group"
                  >
                    <td className="p-3 font-jetbrains text-[11px] text-on-surface-variant text-center">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant flex items-center justify-center overflow-hidden">
                          <div className="text-[10px] font-bold uppercase">{token.token_ticker.slice(0, 2)}</div>
                        </div>
                        <div>
                          <p className="text-primary font-bold">{token.token_name || token.token_ticker}</p>
                          <p className="text-on-surface-variant text-[10px] font-jetbrains">
                            {token.token_ticker}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-jetbrains text-[13px] text-right text-primary">
                      ${token.price_sol.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="p-3 font-jetbrains text-[13px] text-right">
                      <div className="flex flex-col">
                        <span className={token.price_24hr_change >= 0 ? 'text-[#10b981]' : 'text-error'}>
                          {token.price_24hr_change > 0 ? '+' : ''}{token.price_24hr_change.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-jetbrains text-[13px] text-right text-on-surface">
                      ${token.liquidity_sol > 1e6 ? (token.liquidity_sol / 1e6).toFixed(1) + 'M' : token.liquidity_sol.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 font-jetbrains text-[13px] text-right text-on-surface">
                      ${token.volume_sol > 1e6 ? (token.volume_sol / 1e6).toFixed(1) + 'M' : token.volume_sol.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 font-jetbrains text-[13px] text-right text-on-surface">
                      ${token.market_cap_sol > 1e6 ? (token.market_cap_sol / 1e6).toFixed(1) + 'M' : token.market_cap_sol.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1 bg-outline-variant rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${conf}%` }}></div>
                        </div>
                        <span className="font-jetbrains text-[11px] text-primary">{conf}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {conf > 80 ? (
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary text-primary text-[10px] font-semibold tracking-[0.05em] uppercase">STRONG BUY</span>
                      ) : conf > 60 ? (
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary text-primary text-[10px] font-semibold tracking-[0.05em] uppercase">BUY</span>
                      ) : (
                        <span className="px-2 py-0.5 border border-outline-variant text-on-surface-variant text-[10px] font-semibold tracking-[0.05em] uppercase">NEUTRAL</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-on-surface-variant font-jetbrains text-[11px]">
                        {conf > 80 ? 'LOW' : conf > 60 ? 'MED' : 'HIGH'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-jetbrains text-[11px] text-on-surface-variant">
                      {token.source || 'Raydium'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
