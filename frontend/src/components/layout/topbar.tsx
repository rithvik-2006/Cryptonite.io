'use client';

import { useSocket } from '@/providers/socket-provider';

export function TopBar() {
  const { isConnected, latency } = useSocket();

  return (
    <header className="h-16 fixed top-0 right-0 left-[240px] z-40 bg-background border-b border-outline-variant flex justify-between items-center px-6">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-sm pl-10 pr-4 py-1.5 text-on-surface text-[14px] focus:outline-none focus:border-primary transition-colors"
            placeholder="Search tokens, signals, or wallets (⌘K)"
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-auto">
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors duration-150">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors duration-150">
            <span className="material-symbols-outlined text-[20px]">sync</span>
          </button>
          <button className="relative text-on-surface-variant hover:text-primary transition-colors duration-150">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-primary rounded-full"></span>
          </button>
        </div>
        <div className="h-6 w-px bg-outline-variant"></div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-[10px] tracking-[0.5px] uppercase ${isConnected ? 'text-primary' : 'text-error'}`}>
              {isConnected ? 'SESSION ACTIVE' : 'DISCONNECTED'}
            </p>
            <p className="text-[12px] text-on-surface-variant">
              {latency !== null ? `${latency}ms LATENCY` : '--ms LATENCY'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
