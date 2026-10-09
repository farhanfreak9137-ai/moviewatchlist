'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLibrary } from '@/hooks/useLibrary';
import { Compass, BookmarkCheck, Search, BarChart3, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function MobileNav() {
  const pathname = usePathname();
  const { stats } = useLibrary();

  const navItems = [
    { href: '/', label: 'Discover', icon: Compass },
    { href: '/library', label: 'Library', icon: BookmarkCheck, badge: stats.totalItems },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <nav className="lg:hidden fixed bottom-3 left-2.5 right-2.5 sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] z-50 glass-island rounded-2xl px-1.5 py-1.5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.85)] border border-white/10">
      <div className="grid grid-cols-5 items-center w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badgeText = item.badge !== undefined && item.badge > 99 ? '99+' : item.badge;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (item.href === '/search' && typeof window !== 'undefined') {
                  sessionStorage.removeItem('watchvault_saved_search_state');
                  sessionStorage.removeItem('watchvault_returning_from_title');
                  window.dispatchEvent(new CustomEvent('watchvault-clear-search'));
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative text-xs font-medium tap-bounce min-w-0 w-full',
                isActive ? 'text-red-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'relative p-1 rounded-xl transition-all duration-200',
                  isActive && 'bg-red-500/15 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                )}
              >
                <Icon className={cn('w-4.5 h-4.5 transition-transform duration-200', isActive && 'scale-110')} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 bg-red-600 text-white rounded-full text-[9px] font-mono flex items-center justify-center leading-none shadow-[0_2px_6px_rgba(220,38,38,0.5)]">
                    {badgeText}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] mt-0.5 tracking-tight transition-colors truncate max-w-full block', isActive ? 'text-slate-100 font-semibold' : 'text-slate-400')}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute -bottom-0.5 shadow-[0_0_6px_#ef4444]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
