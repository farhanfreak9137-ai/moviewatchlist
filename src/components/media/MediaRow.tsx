'use client';

import React, { useRef, useEffect } from 'react';
import { MediaCard } from './MediaCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  items: Array<{
    id: number;
    title: string;
    mediaType: 'movie' | 'tv';
    posterPath?: string | null;
    releaseDate?: string;
    voteAverage?: number;
  }>;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function MediaRow({ title, subtitle, action, items, emptyMessage, isLoading }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowStorageKey = `watchvault_row_scroll_${title.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Restore horizontal scroll position for this specific row
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedX = sessionStorage.getItem(rowStorageKey);
        if (savedX && scrollRef.current) {
          const x = parseInt(savedX, 10);
          if (!isNaN(x) && x > 0) {
            scrollRef.current.scrollLeft = x;
          }
        }
      }
    } catch {}
  }, [items, rowStorageKey]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -480 : 480;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <section className="mb-10 relative group">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="flex gap-4 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0">
              <div className="aspect-[2/3] w-full rounded-xl bg-white/5 animate-pulse border border-white/5 mb-3" />
              <div className="h-3.5 w-3/4 bg-white/10 rounded animate-pulse mb-1.5" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="p-8 rounded-2xl bg-[#10121a]/60 border border-white/5 text-center text-slate-400 text-sm">
          {emptyMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 relative group">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {action}

          {/* Scroll Controls for Desktop */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 hover:border-white/20 transition-colors cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 hover:border-white/20 transition-colors cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards container */}
      <div
        ref={scrollRef}
        onScroll={() => {
          if (scrollRef.current && typeof window !== 'undefined') {
            sessionStorage.setItem(rowStorageKey, scrollRef.current.scrollLeft.toString());
          }
        }}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {items.map((item) => (
          <div
            key={`${item.mediaType}-${item.id}`}
            className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start"
          >
            <MediaCard
              id={item.id}
              title={item.title}
              mediaType={item.mediaType}
              posterPath={item.posterPath}
              releaseDate={item.releaseDate}
              voteAverage={item.voteAverage}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
