'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SyncBadge } from './SyncBadge';
import { Search, SlidersHorizontal } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { GlobalTopSearchBar } from './GlobalTopSearchBar';
import { cn } from '@/lib/utils/cn';

export function TopHeader() {
  const pathname = usePathname();
  const isSearchPage = pathname === '/search';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#08090d] sm:bg-[#08090d]/95 sm:backdrop-blur-xl border-b border-white/10 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile Brand */}
        <div className="flex items-center gap-2 sm:gap-3 lg:hidden shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={28} className="rounded-lg shadow-lg shadow-rose-900/40 shrink-0" />
            <span className="font-bold text-base sm:text-lg tracking-tight text-white font-sans">
              Watch<span className="text-red-500">Vault</span>
            </span>
          </Link>
        </div>

        {/* Global Live Interactive Search Bar (Hidden/transitioned when on /search page) */}
        <div
          className={cn(
            'flex-1 hidden sm:flex items-center transition-all duration-300 ease-out origin-left',
            isSearchPage
              ? 'opacity-0 scale-95 pointer-events-none max-w-0 -translate-y-2 overflow-hidden'
              : 'opacity-100 scale-100 max-w-lg translate-y-0'
          )}
        >
          <Suspense
            fallback={
              <div className="w-full h-9 bg-[#12141d] rounded-xl border border-white/10 animate-pulse" />
            }
          >
            <GlobalTopSearchBar />
          </Suspense>
        </div>

        {/* Right side items: Sync status, Settings icon */}
        <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
          {/* Mobile search button (hidden on search page) */}
          {!isSearchPage && (
            <Link
              href="/search"
              className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>
          )}

          <SyncBadge />

          <Link
            href="/settings"
            className="hidden sm:flex p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
            title="Settings & Storage"
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
