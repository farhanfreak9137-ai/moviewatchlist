'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/hooks/useLibrary';
import { TMDBMediaItem, getImageUrl, tmdbService } from '@/lib/metadata/tmdb';
import { StatusBadge } from './StatusBadge';
import { Plus, Check, Play, Info, Sparkles, Film, Loader2 } from 'lucide-react';

interface HeroBannerProps {
  item?: TMDBMediaItem | null;
}

export function HeroBanner({ item }: HeroBannerProps) {
  const { getItemByTmdbId, addToLibrary } = useLibrary();
  const [isAdding, setIsAdding] = useState(false);

  if (!item) {
    // Elegant fallback banner when offline or loading initial metadata
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

  const mediaType = item.media_type || (item.name ? 'tv' : 'movie');
  const title = item.title || item.name || 'Featured Title';
  const libraryItem = getItemByTmdbId(item.id, mediaType);
  const isInLibrary = !!libraryItem;
  const backdropUrl = getImageUrl(item.backdrop_path, 'original') || getImageUrl(item.poster_path, 'original');

  const handleQuickAdd = async () => {
    if (isInLibrary || isAdding) return;
    try {
      setIsAdding(true);
      const details =
        mediaType === 'movie'
          ? await tmdbService.getMovieDetails(item.id)
          : await tmdbService.getSeriesDetails(item.id);
      await addToLibrary(details, mediaType, 'planned');
    } catch (err) {
      console.error('Failed to add hero item to library:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-10 border border-white/10 bg-[#0e1017] shadow-2xl min-h-[360px] sm:min-h-[440px] flex items-end">
      {/* Cinematic Background Backdrop */}
      {backdropUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={backdropUrl}
            alt={title}
            className="w-full h-full object-cover object-center opacity-40 sm:opacity-50"
          />
          {/* Gradients to blend smoothly */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090d] via-[#08090d]/80 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-10 max-w-3xl w-full">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="px-2.5 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
            Trending Today
          </span>
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">
            {mediaType === 'movie' ? 'Movie' : 'Series'}
          </span>
          {isInLibrary && (
            <StatusBadge status={libraryItem.status} size="sm" />
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2.5 line-clamp-2">
          {title}
        </h1>

        <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed mb-5 max-w-2xl">
          {item.overview}
        </p>

        <div className="flex flex-row items-center gap-2.5 w-full sm:w-auto">
          <Link
            href={`/title?mediaType=${mediaType}&id=${item.id}`}
            className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold text-xs sm:text-sm transition-all shadow-xl flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>View Details</span>
          </Link>

          {isInLibrary ? (
            <Link
              href={`/title?mediaType=${mediaType}&id=${item.id}`}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[3] shrink-0" />
              <span>In Library ({libraryItem.status})</span>
            </Link>
          ) : (
            <button
              onClick={handleQuickAdd}
              disabled={isAdding}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-red-900/30 flex items-center gap-2 cursor-pointer whitespace-nowrap"
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
      </div>
    </div>
  );
}
