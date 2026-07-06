'use client';

import { useTopSignals } from '@/hooks/useTopSignals';

export default function ResearchPage() {
  const { data: signals, isLoading } = useTopSignals(1);
  const topSignal = signals?.[0];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold tracking-[0.05em] text-primary border-b-2 border-primary py-2 px-1 cursor-pointer uppercase">
            MODEL_X-RAY
          </span>
        </div>
      </div>

      {/* Research Workspace Grid */}
      <div className="grid grid-cols-1 gap-[1px] bg-outline-variant border border-outline-variant w-full">
        {/* Alpha Prediction (Large Main Chart) */}
        <div className="bg-surface flex flex-col p-6 min-h-[300px] justify-between">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">trending_up</span>
              <h2 className="text-[18px] font-medium uppercase tracking-wider">
                Alpha Prediction: Model v2.4.1
              </h2>
            </div>
            <div className="flex gap-2">
              <span className="bg-surface-container-high px-2 py-1 rounded text-on-surface font-jetbrains text-[11px]">
                {topSignal ? `${topSignal.token} / 1m` : 'AWAITING SIGNAL'}
              </span>
              <span className="bg-surface-container-high px-2 py-1 rounded text-on-surface font-jetbrains text-[11px]">
                Conf: {topSignal ? (topSignal.confidence * 100).toFixed(1) : '--'}%
              </span>
            </div>
          </div>
          <div className="flex-1 border border-outline-variant/30 rounded p-6 flex flex-col justify-center bg-surface-container-low">
            <div className="flex justify-between items-start w-full">
              <div className="flex flex-col gap-1">
                <div className="text-[36px] font-jetbrains font-medium text-primary">
                  {topSignal ? topSignal.direction : 'WAITING FOR SIGNAL'}
                  <span className="text-sm text-on-surface-variant ml-3 font-normal">
                    {topSignal ? 'ACTIVE TARGET' : ''}
                  </span>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-on-surface-variant uppercase mt-2">
                  PREDICTED REGIME: {topSignal ? 'OPTIMAL TRADING CONDITION' : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
