'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SyncBadge } from './SyncBadge';
import { Search, SlidersHorizontal } from 'lucide-react';
import { AppLogo } from './AppLogo';

export function TopHeader() {
  const router = useRouter();

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

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div
            onClick={() => router.push('/search')}
            className="w-full flex items-center gap-3 px-3.5 py-2 bg-[#12141d] hover:bg-[#181b26] border border-white/10 hover:border-white/20 rounded-xl text-sm text-slate-400 cursor-pointer transition-all duration-200 group"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
            <span className="flex-1 text-slate-400 font-normal">Search movies, series, titles...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-slate-400">
              /
            </kbd>
          </div>
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
