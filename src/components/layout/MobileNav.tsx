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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-white/10 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative text-xs font-medium',
                isActive ? 'text-red-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-mono flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-red-500 absolute -bottom-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
