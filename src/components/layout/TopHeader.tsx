'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { SyncBadge } from './SyncBadge';
import { Search, SlidersHorizontal } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { GlobalTopSearchBar } from './GlobalTopSearchBar';

export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Mobile Brand */}
        <div className="flex items-center gap-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} className="rounded-lg shadow-lg shadow-rose-900/40" />
            <span className="font-bold text-lg tracking-tight text-white font-sans">
              Watch<span className="text-red-500">Vault</span>
            </span>
          </Link>
        </div>

        {/* Global Live Interactive Search Bar */}
        <div className="flex-1 max-w-lg hidden sm:block">
          <Suspense
            fallback={
              <div className="w-full h-9 bg-[#12141d] rounded-xl border border-white/10 animate-pulse" />
            }
          >
            <GlobalTopSearchBar />
          </Suspense>
        </div>

        {/* Right side items: Sync status, Settings icon */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Mobile search button */}
          <Link
            href="/search"
            className="sm:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          <SyncBadge />

          <Link
            href="/settings"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
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
