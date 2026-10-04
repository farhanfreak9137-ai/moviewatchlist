'use client';

import React, { useRef } from 'react';
import { MediaCard } from './MediaCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  items: Array<{
    id: number;
    title: string;
    mediaType: 'movie' | 'tv';
    posterPath?: string | null;
    releaseDate?: string;
    voteAverage?: number;
  }>;
  emptyMessage?: string;
}

export function MediaRow({ title, subtitle, items, emptyMessage }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -480 : 480;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="mb-10">
        <div className="mb-3">
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
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

      {/* Cards container */}
      <div
        ref={scrollRef}
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
