'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/hooks/useLibrary';
import { TMDBMediaItem, getImageUrl, tmdbService } from '@/lib/metadata/tmdb';
import { StatusBadge } from './StatusBadge';
import { Plus, Check, Info, Sparkles, Film, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface HeroBannerProps {
  items?: TMDBMediaItem[] | null;
  // Backward compatibility in case single item is passed
  item?: TMDBMediaItem | null;
  isLoading?: boolean;
}

export function HeroBanner({ items, item, isLoading }: HeroBannerProps) {
  const { getItemByTmdbId, addToLibrary } = useLibrary();
  const [isAdding, setIsAdding] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Normalize to list of items
  const bannerItems: TMDBMediaItem[] = React.useMemo(() => {
    if (items && items.length > 0) return items.slice(0, 7);
    if (item) return [item];
    return [];
  }, [items, item]);

  // Auto-rotation every 6 seconds unless user is hovering/interacting
  useEffect(() => {
    if (bannerItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [bannerItems.length, isPaused]);

  if (bannerItems.length === 0) {
    if (isLoading) {
      return (
        <div className="relative w-full rounded-3xl overflow-hidden mb-10 border border-white/10 bg-[#0e1017] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)] min-h-[380px] sm:min-h-[460px] flex items-end p-5 sm:p-10 shimmer-sweep inner-glow">
          <div className="relative z-10 max-w-3xl w-full space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 rounded-md bg-white/10" />
              <div className="h-5 w-16 rounded-md bg-white/5" />
            </div>
            <div className="h-9 sm:h-12 w-3/4 max-w-lg rounded-xl bg-white/10" />
            <div className="space-y-2 max-w-2xl">
              <div className="h-3.5 w-full rounded-md bg-white/5" />
              <div className="h-3.5 w-4/5 rounded-md bg-white/5" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-32 rounded-xl bg-white/10" />
              <div className="h-10 w-36 rounded-xl bg-white/5" />
            </div>
          </div>
        </div>
      );
    }

    // Fallback banner ONLY when truly 0 items and not loading (e.g. offline with empty cache)
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-red-950/40 via-[#12141f] to-[#090a10] border border-white/10 p-8 sm:p-12 mb-10 shadow-2xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-4 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Archive & Discovery</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Your Personal Cinema & TV Vault.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
            Streamlined discovery powered by TMDB, Letterboxd-style personal tracking, and rock-solid offline storage that synchronizes between your desktop and phone.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/search"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30 flex items-center gap-2"
            >
              <Film className="w-4 h-4" />
              <span>Search & Add Titles</span>
            </Link>
            <Link
              href="/library"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-sm transition-all border border-white/10"
            >
              Open My Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeItem = bannerItems[currentIndex] || bannerItems[0];
  const mediaType = activeItem.media_type || (activeItem.name ? 'tv' : 'movie');
  const title = activeItem.title || activeItem.name || 'Featured Title';
  const libraryItem = getItemByTmdbId(activeItem.id, mediaType);
  const isInLibrary = !!libraryItem;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + bannerItems.length) % bannerItems.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped right -> prev
        setCurrentIndex((prev) => (prev - 1 + bannerItems.length) % bannerItems.length);
      } else {
        // Swiped left -> next
        setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
      }
    }
    touchStartX.current = null;
  };

  const handleQuickAdd = async () => {
    if (isInLibrary || isAdding) return;
    try {
      setIsAdding(true);
      const details =
        mediaType === 'movie'
          ? await tmdbService.getMovieDetails(activeItem.id)
          : await tmdbService.getSeriesDetails(activeItem.id);
      await addToLibrary(details, mediaType, 'planned');
    } catch (err) {
      console.error('Failed to add hero item to library:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden mb-6 sm:mb-10 border border-white/10 bg-[#0e1017] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)] min-h-[320px] sm:min-h-[440px] md:min-h-[480px] flex items-end group inner-glow"
    >
      {/* Cinematic Background Backdrops with smooth fade */}
      {bannerItems.map((item, idx) => {
        const url = getImageUrl(item.backdrop_path, 'original') || getImageUrl(item.poster_path, 'original');
        if (!url) return null;
        return (
          <div
            key={item.id}
            className={cn(
              'absolute inset-0 z-0 transition-opacity duration-700 ease-in-out',
              idx === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <img
              src={url}
              alt={item.title || item.name || 'Hero backdrop'}
              className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
            />
            {/* Gradients to blend smoothly */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08090d] via-[#08090d]/80 to-transparent" />
          </div>
        );
      })}

      {/* Navigation Arrows for desktop/touch */}
      {bannerItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous featured title"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-lg hidden sm:flex items-center justify-center tap-bounce"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next featured title"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-lg hidden sm:flex items-center justify-center tap-bounce"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-8 md:p-10 max-w-3xl w-full">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-2.5">
          <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] sm:text-[11px] font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(220,38,38,0.4)]">
            Trending Today
          </span>
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[9px] sm:text-[11px] font-medium uppercase tracking-wider">
            {mediaType === 'movie' ? 'Movie' : 'Series'}
          </span>
          {activeItem.vote_average > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] sm:text-[11px] font-mono font-bold shadow-sm">
              ★ {activeItem.vote_average.toFixed(1)}
            </span>
          )}
          {isInLibrary && (
            <StatusBadge status={libraryItem.status} size="sm" />
          )}
        </div>

        <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white tracking-tight mb-2 sm:mb-2.5 line-clamp-2 drop-shadow-md">
          {title}
        </h1>

        <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed mb-4 sm:mb-5 max-w-2xl drop-shadow-sm">
          {activeItem.overview}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto mb-3">
          <Link
            href={`/title?mediaType=${mediaType}&id=${activeItem.id}`}
            className="flex-1 sm:flex-initial justify-center px-4 sm:px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-black font-semibold text-xs sm:text-sm transition-all shadow-[0_4px_16px_rgba(255,255,255,0.2)] flex items-center gap-2 cursor-pointer whitespace-nowrap tap-bounce"
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>View Details</span>
          </Link>

          {isInLibrary ? (
            <Link
              href={`/title?mediaType=${mediaType}&id=${activeItem.id}`}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-6 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md whitespace-nowrap tap-bounce"
            >
              <Check className="w-4 h-4 stroke-[3] shrink-0" />
              <span>In Library ({libraryItem.status})</span>
            </Link>
          ) : (
            <button
              onClick={handleQuickAdd}
              disabled={isAdding}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-[0_0_24px_rgba(229,9,20,0.45)] flex items-center gap-2 cursor-pointer whitespace-nowrap tap-bounce"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Plus className="w-4 h-4 shrink-0" />
              )}
              <span>Add to Library</span>
            </button>
          )}
        </div>

        {/* Carousel Progress Indicators / Dots */}
        {bannerItems.length > 1 && (
          <div className="flex items-center gap-1.5 pt-2">
            {bannerItems.map((it, idx) => (
              <button
                key={it.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Jump to slide ${idx + 1}: ${it.title || it.name}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                  idx === currentIndex
                    ? 'w-6 bg-red-500'
                    : 'w-1.5 bg-white/30 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
