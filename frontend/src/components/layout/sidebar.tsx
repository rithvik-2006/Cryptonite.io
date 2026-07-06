'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Market Explorer', path: '/market-explorer', icon: 'explore' },
    { name: 'Signals', path: '/signals', icon: 'sensors' },
    { name: 'Research', path: '/research', icon: 'query_stats' },
    { name: 'Watchlist', path: '/watchlist', icon: 'visibility' },
    { name: 'Portfolio', path: '/portfolio', icon: 'account_balance_wallet' },
    { name: 'Backtesting', path: '/backtesting', icon: 'history_edu' },
    { name: 'Infrastructure', path: '/infrastructure', icon: 'dns' },
  ];

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-surface border-r border-outline-variant flex flex-col py-6 z-50">
      <div className="px-6 mb-8">
        <h1 className="text-[28px] leading-[36px] font-bold text-primary">Cryptonite</h1>
        <p className="text-[12px] tracking-[0.5px] uppercase text-on-surface-variant opacity-60">
          Institutional Terminal
        </p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center px-6 py-3 cursor-pointer transition-colors group ${
                  isActive
                    ? 'text-primary bg-secondary-container font-bold border-l-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span
                  className={`material-symbols-outlined mr-3 transition-colors ${
                    isActive ? '' : 'group-hover:text-primary'
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`text-[14px] transition-colors ${
                    isActive ? '' : 'group-hover:text-primary'
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-6">
        <div className="flex items-center py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer group">
          <span className="material-symbols-outlined mr-3 group-hover:text-primary transition-colors">
            settings
          </span>
          <span className="text-[14px] group-hover:text-primary transition-colors">Settings</span>
        </div>
        <div className="mt-4 flex items-center gap-3 pt-4 border-t border-outline-variant">
          <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center overflow-hidden">
            {/* Fallback avatar */}
            <div className="w-full h-full bg-[#1a1b22]" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] tracking-[0.5px] uppercase text-on-surface truncate">
              ANALYST_082
            </p>
            <p className="text-[9px] tracking-[0.5px] uppercase text-on-surface-variant truncate">
              Institutional Tier
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
