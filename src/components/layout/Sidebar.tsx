'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLibrary } from '@/hooks/useLibrary';
import {
  Compass,
  BookmarkCheck,
  Search,
  BarChart3,
  SlidersHorizontal,
  PlayCircle,
  CheckCircle,
  Heart,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { AppLogo } from './AppLogo';

export function Sidebar() {
  const pathname = usePathname();
  const { stats } = useLibrary();

  const navItems = [
    { href: '/', label: 'Discover', icon: Compass },
    { href: '/library', label: 'My Library', icon: BookmarkCheck, badge: stats.totalItems },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/stats', label: 'Statistics', icon: BarChart3 },
    { href: '/settings', label: 'Settings & Sync', icon: SlidersHorizontal },
  ];

  const quickLibraryFilters = [
    { href: '/library?tab=watching', label: 'Watching', icon: PlayCircle, count: stats.watchingCount, color: 'text-sky-400' },
    { href: '/library?tab=completed', label: 'Completed', icon: CheckCircle, count: stats.completedCount, color: 'text-emerald-400' },
    { href: '/library?tab=favorites', label: 'Favorites', icon: Heart, count: stats.favoritesCount, color: 'text-rose-400' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#090a10] border-r border-white/5 p-4 select-none shrink-0 sticky top-0 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <AppLogo size={40} className="rounded-xl shadow-xl shadow-rose-900/40 shrink-0" />
        <div>
          <h1 className="font-bold text-xl tracking-tight text-white leading-none">
            Watch<span className="text-red-500">Vault</span>
          </h1>
          <p className="text-[11px] text-slate-400 tracking-wider uppercase font-semibold mt-1">
            Personal Archive
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-8">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
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
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-red-600/15 text-white border border-red-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-full font-mono font-medium',
                    isActive
                      ? 'bg-red-500 text-white'
                      : 'bg-white/5 text-slate-400 group-hover:text-slate-300'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick Library Filters */}
      <div className="space-y-1 mb-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Quick Filters
        </p>
        {quickLibraryFilters.map((sub) => {
          const Icon = sub.icon;
          return (
            <Link
              key={sub.href}
              href={sub.href}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-3.5 h-3.5', sub.color)} />
                <span>{sub.label}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{sub.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Storage Footer */}
      <div className="pt-4 border-t border-white/5 mt-6">
        <div className="px-3 py-2.5 rounded-xl bg-[#11131c] border border-white/5 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-300">Offline-First</span>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
            IndexedDB
          </span>
        </div>
      </div>
    </aside>
  );
}
