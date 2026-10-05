'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/hooks/useLibrary';
import { MediaType, WatchStatus } from '@/lib/types';
import { getImageUrl, tmdbService } from '@/lib/metadata/tmdb';
import { useFinancials } from '@/lib/metadata/financials';
import { StatusBadge } from './StatusBadge';
import {
  Plus,
  Check,
  Star,
  Heart,
  Film,
  Tv,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MediaCardProps {
  id: number;
  title: string;
  mediaType: MediaType;
  posterPath?: string | null;
  releaseDate?: string;
  voteAverage?: number;
  className?: string;
}

export function MediaCard({
  id,
  title,
  mediaType,
  posterPath,
  releaseDate,
  voteAverage,
  className,
}: MediaCardProps) {
  const { getItemByTmdbId, addToLibrary } = useLibrary();
  const libraryItem = getItemByTmdbId(id, mediaType);
  const isInLibrary = !!libraryItem;

  const { financial } = useFinancials(id, mediaType, voteAverage);

  const [isAdding, setIsAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  const posterUrl = getImageUrl(posterPath, 'w500');
  const year = releaseDate ? releaseDate.substring(0, 4) : '';

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInLibrary || isAdding) return;

    try {
      setIsAdding(true);
      // Fetch full details to store in local library
      const details =
        mediaType === 'movie'
          ? await tmdbService.getMovieDetails(id)
          : await tmdbService.getSeriesDetails(id);

      await addToLibrary(details, mediaType, 'planned');
    } catch (err) {
      console.error('Failed to quick add to library:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden bg-[#10121a] border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-black/60',
        className
      )}
    >
      <Link href={`/title?mediaType=${mediaType}&id=${id}`} className="block relative aspect-[2/3] w-full bg-[#181a24] overflow-hidden">
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#13151f] to-[#1c1f2e] text-slate-500">
            {mediaType === 'movie' ? <Film className="w-10 h-10 mb-2 stroke-1 text-slate-600" /> : <Tv className="w-10 h-10 mb-2 stroke-1 text-slate-600" />}
            <span className="text-xs font-medium text-slate-400 line-clamp-2">{title}</span>
          </div>
        )}

        {/* Gradient Overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Media Type Pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold tracking-wider uppercase text-slate-300">
          {mediaType === 'movie' ? 'Movie' : 'Series'}
        </div>

        {/* In Library status indicator badge on poster */}
        {isInLibrary ? (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white shadow-lg text-[10px] font-semibold tracking-wide backdrop-blur-md">
            <Check className="w-3 h-3 stroke-[3]" />
            <span className="hidden sm:inline">In Library</span>
          </div>
        ) : (
          <button
            onClick={handleQuickAdd}
            disabled={isAdding}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white border border-white/20 transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer"
            title="Add to My Library"
          >
            {isAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Bottom overlay with financial verdict, earned number, and ratings */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs gap-1.5 pointer-events-none">
          {financial && financial.hasBoxOfficeData ? (
            /* Movie with Box Office Data: Number & Success / Flop Indicator */
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono font-bold text-[10px] shadow-lg backdrop-blur-md border tracking-tight max-w-full',
                financial.verdict === 'blockbuster'
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-300 shadow-amber-950/50'
                  : financial.verdict === 'hit'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-emerald-950/50'
                  : financial.verdict === 'flop'
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-rose-950/50'
                  : 'bg-black/80 border-white/15 text-slate-300'
              )}
            >
              {financial.verdict === 'flop' ? (
                <TrendingDown className="w-3 h-3 text-rose-400 stroke-[2.5] shrink-0" />
              ) : (
                <TrendingUp className="w-3 h-3 text-emerald-400 stroke-[2.5] shrink-0" />
              )}
              <span className="truncate">{financial.formattedRevenue}</span>
              <span className="opacity-40">•</span>
              <span className="uppercase text-[9px] font-black shrink-0">
                {financial.verdict === 'flop'
                  ? 'FLOP'
                  : financial.verdict === 'blockbuster'
                  ? 'SUPER HIT'
                  : financial.verdict === 'hit'
                  ? 'HIT'
                  : 'AVG'}
              </span>
            </div>
          ) : isInLibrary && libraryItem.rating > 0 ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-black font-bold text-[11px] shadow">
              <Star className="w-3 h-3 fill-black text-black shrink-0" />
              <span>{libraryItem.rating}/10</span>
            </div>
          ) : voteAverage ? (
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-md font-mono font-medium text-[10px] border shadow-sm',
                financial?.verdict === 'flop'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                  : financial?.verdict === 'blockbuster' || financial?.verdict === 'hit'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-black/70 border-white/10 text-amber-400'
              )}
            >
              <Star className="w-3 h-3 fill-current text-current shrink-0" />
              <span className="font-bold">{voteAverage.toFixed(1)}</span>
              {financial?.verdict && financial.verdict !== 'unknown' && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="uppercase font-black text-[9px] shrink-0">
                    {financial.verdict === 'flop' ? 'FLOP' : 'HIT'}
                  </span>
                </>
              )}
            </div>
          ) : null}

          {isInLibrary && libraryItem.is_favorite && (
            <div className="p-1 rounded-full bg-rose-500 text-white shadow-md ml-auto shrink-0">
              <Heart className="w-3 h-3 fill-current" />
            </div>
          )}
        </div>
      </Link>

      {/* Title & Metadata Details */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
        <Link href={`/title?mediaType=${mediaType}&id=${id}`} className="block">
          <h3 className="font-semibold text-xs sm:text-sm text-slate-100 line-clamp-1 group-hover:text-red-400 transition-colors">
            {title}
          </h3>
          <div className="flex items-center justify-between gap-1.5 mt-1 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 truncate">
              {year && <span>{year}</span>}
              {year && <span className="text-slate-600">•</span>}
              <span className="capitalize text-slate-400">
                {mediaType === 'movie' ? 'Movie' : 'Series'}
              </span>
            </div>

            {voteAverage && !financial?.hasBoxOfficeData && (
              <div className="flex items-center gap-1 text-amber-400 shrink-0 font-medium">
                <Star className="w-2.5 h-2.5 fill-current text-current" />
                <span>{voteAverage.toFixed(1)}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Personal State Badge if in Library */}
        {isInLibrary ? (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
            <StatusBadge status={libraryItem.status} size="sm" />
            {libraryItem.status === 'watching' && mediaType === 'tv' && libraryItem.current_season && (
              <span className="text-[10px] font-mono text-slate-400">
                S{libraryItem.current_season} E{libraryItem.current_episode || 0}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={handleQuickAdd}
              disabled={isAdding}
              className="w-full py-1 px-2 rounded-lg bg-white/5 hover:bg-red-600/90 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isAdding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              <span>Add to Library</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
