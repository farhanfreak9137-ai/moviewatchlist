'use client';

import React from 'react';
import Link from 'next/link';
import { LibraryItem } from '@/lib/types';
import { getImageUrl } from '@/lib/metadata/tmdb';
import { StatusBadge } from '../media/StatusBadge';
import { Star, Heart, Film, Tv, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LibraryItemRowProps {
  item: LibraryItem;
  onToggleFavorite: (id: string) => void;
}

export function LibraryItemRow({ item, onToggleFavorite }: LibraryItemRowProps) {
  const posterUrl = getImageUrl(item.poster_path, 'w185');

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#11131c] hover:bg-[#161924] border border-white/5 hover:border-white/15 transition-all group gap-4">
      {/* Thumbnail & Title info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <Link
          href={`/title?mediaType=${item.media_type}&id=${item.tmdb_id}`}
          className="relative w-12 h-16 rounded-lg overflow-hidden bg-[#181a26] shrink-0 border border-white/10"
        >
          {posterUrl ? (
            <img src={posterUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              {item.media_type === 'movie' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/title?mediaType=${item.media_type}&id=${item.tmdb_id}`}
            className="font-semibold text-sm text-slate-100 hover:text-red-400 transition-colors line-clamp-1"
          >
            {item.title}
          </Link>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
            <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
              {item.media_type === 'movie' ? 'Movie' : 'Series'}
            </span>
            {item.release_year && <span className="font-mono">{item.release_year}</span>}
            {item.genres?.length > 0 && (
              <span className="hidden sm:inline text-slate-500">• {item.genres.slice(0, 2).join(', ')}</span>
            )}
            {item.media_type === 'tv' && item.current_season && (
              <span className="text-slate-400 font-mono text-[11px]">
                • S{item.current_season} E{item.current_episode || 0}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status & Rating & Favorite */}
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={item.status} size="sm" />

        {/* Rating */}
        <div className="hidden sm:flex items-center gap-1 w-16 justify-end">
          {item.rating > 0 ? (
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{item.rating}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono">—</span>
          )}
        </div>

        {/* Favorite */}
        <button
          onClick={() => onToggleFavorite(item.id)}
          className={cn(
            'p-2 rounded-lg transition-colors cursor-pointer',
            item.is_favorite
              ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          title={item.is_favorite ? 'Favorited' : 'Add to favorites'}
        >
          <Heart className={cn('w-4 h-4', item.is_favorite && 'fill-rose-400')} />
        </button>
      </div>
    </div>
  );
}
