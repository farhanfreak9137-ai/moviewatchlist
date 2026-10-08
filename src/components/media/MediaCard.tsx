'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/hooks/useLibrary';
import { MediaType, WatchStatus } from '@/lib/types';
import { getImageUrl, tmdbService } from '@/lib/metadata/tmdb';
import { useFinancials } from '@/lib/metadata/financials';
import { useToast } from '@/lib/toast/toastContext';
import { triggerHaptic } from '@/lib/utils/haptics';
import { MobileStatusSheet } from './MobileStatusSheet';
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
  Clock,
  Play,
  CheckCircle2,
  X,
  SlidersHorizontal,
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
  const { getItemByTmdbId, addToLibrary, updateItem, removeItem, incrementEpisode, toggleFavorite, setRating } = useLibrary();
  const { showToast } = useToast();
  const libraryItem = getItemByTmdbId(id, mediaType);
  const isInLibrary = !!libraryItem;

  const { financial } = useFinancials(id, mediaType, voteAverage);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [addingStatus, setAddingStatus] = useState<WatchStatus | null>(null);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [imgError, setImgError] = useState(false);

  const posterUrl = getImageUrl(posterPath, 'w500');
  const year = releaseDate ? releaseDate.substring(0, 4) : '';

  const openStatusPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSheetOpen(true);
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  const handleQuickIncrementEpisode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!libraryItem || libraryItem.media_type !== 'tv') return;
    try {
      setIsIncrementing(true);
      triggerHaptic('medium');
      const prevSeason = libraryItem.current_season || 1;
      const prevEpisode = libraryItem.current_episode || 0;
      const prevStatus = libraryItem.status;
      const result = await incrementEpisode(libraryItem.id);

      showToast({
        message: result.isCompleted
          ? `Finished all episodes of "${title}"!`
          : `Marked S${result.newSeason}:E${result.newEpisode} watched`,
        type: 'success',
        undoAction: async () => {
          await updateItem(libraryItem.id, {
            current_season: prevSeason,
            current_episode: prevEpisode,
            status: prevStatus,
          });
          triggerHaptic('light');
        },
        undoLabel: 'Undo',
      });
    } catch (err) {
      console.error('Failed to increment episode:', err);
    } finally {
      setIsIncrementing(false);
    }
  };

  const handleSelectStatus = async (status: WatchStatus) => {
    try {
      setAddingStatus(status);
      triggerHaptic('selection');
      const prevStatus = libraryItem?.status;
      if (isInLibrary && libraryItem) {
        await updateItem(libraryItem.id, { status });
        showToast({
          message: `Moved "${title}" to ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          type: 'success',
          undoAction: prevStatus ? async () => {
            await updateItem(libraryItem.id, { status: prevStatus });
          } : undefined,
        });
      } else {
        const details =
          mediaType === 'movie'
            ? await tmdbService.getMovieDetails(id)
            : await tmdbService.getSeriesDetails(id);
        const added = await addToLibrary(details, mediaType, status);
        showToast({
          message: `Added to ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          type: 'success',
          undoAction: async () => {
            await removeItem(added.id);
          },
        });
      }
      setIsMenuOpen(false);
      setIsMobileSheetOpen(false);
    } catch (err) {
      console.error('Failed to set status:', err);
    } finally {
      setAddingStatus(null);
    }
  };

  const handleSetRating = async (rating: number) => {
    if (!libraryItem) return;
    await setRating(libraryItem.id, rating);
    showToast({
      message: rating > 0 ? `Rated ${rating}/10 ★` : 'Rating cleared',
      type: 'info',
    });
  };

  const handleToggleFavorite = async () => {
    if (!libraryItem) return;
    await toggleFavorite(libraryItem.id);
    showToast({
      message: !libraryItem.is_favorite ? 'Added to favorites' : 'Removed from favorites',
      type: 'info',
    });
  };

  const handleRemove = async () => {
    if (!libraryItem) return;
    try {
      triggerHaptic('warning');
      const savedSnapshot = { ...libraryItem };
      await removeItem(libraryItem.id);
      showToast({
        message: `Removed "${title}" from vault`,
        undoAction: async () => {
          await addToLibrary(
            {
              id: savedSnapshot.tmdb_id,
              title: savedSnapshot.title,
              name: savedSnapshot.title,
              overview: savedSnapshot.overview || '',
              poster_path: savedSnapshot.poster_path,
              backdrop_path: savedSnapshot.backdrop_path,
            },
            savedSnapshot.media_type,
            savedSnapshot.status,
            savedSnapshot.rating,
            savedSnapshot.is_favorite
          );
        },
        undoLabel: 'Restore',
      });
      setIsMenuOpen(false);
      setIsMobileSheetOpen(false);
    } catch (err) {
      console.error('Failed to remove from library:', err);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl overflow-hidden bg-[#10121a] border border-white/10 hover:border-red-500/35 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_-6px_rgba(229,9,20,0.25)] inner-glow tap-bounce',
        className
      )}
    >
      {/* Quick Status Selector Popover (Planned / Watching / Completed) */}
      {isMenuOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute inset-0 z-40 bg-[#0c0e17]/95 backdrop-blur-xl p-3 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150 rounded-xl border border-white/20 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
              {isInLibrary ? 'Change Status' : 'Add to Vault'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Status Options */}
          <div className="flex flex-col gap-1.5 my-auto">
            {/* 1. Planned to Watch */}
            <button
              type="button"
              onClick={() => handleSelectStatus('planned')}
              disabled={addingStatus !== null}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all border text-left cursor-pointer',
                isInLibrary && libraryItem?.status === 'planned'
                  ? 'bg-amber-500/25 border-amber-500/50 text-amber-300 ring-1 ring-amber-400/40'
                  : 'bg-white/5 hover:bg-amber-500/15 border-white/5 hover:border-amber-500/30 text-slate-200 hover:text-amber-300'
              )}
            >
              {addingStatus === 'planned' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs">Planned to Watch</div>
                <div className="text-[9px] font-normal text-slate-400 truncate">Want to watch later</div>
              </div>
            </button>

            {/* 2. Currently Watching */}
            <button
              type="button"
              onClick={() => handleSelectStatus('watching')}
              disabled={addingStatus !== null}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all border text-left cursor-pointer',
                isInLibrary && libraryItem?.status === 'watching'
                  ? 'bg-sky-500/25 border-sky-500/50 text-sky-300 ring-1 ring-sky-400/40'
                  : 'bg-white/5 hover:bg-sky-500/15 border-white/5 hover:border-sky-500/30 text-slate-200 hover:text-sky-300'
              )}
            >
              {addingStatus === 'watching' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs">Watching</div>
                <div className="text-[9px] font-normal text-slate-400 truncate">In progress now</div>
              </div>
            </button>

            {/* 3. Completed */}
            <button
              type="button"
              onClick={() => handleSelectStatus('completed')}
              disabled={addingStatus !== null}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all border text-left cursor-pointer',
                isInLibrary && libraryItem?.status === 'completed'
                  ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white/5 hover:bg-emerald-500/15 border-white/5 hover:border-emerald-500/30 text-slate-200 hover:text-emerald-300'
              )}
            >
              {addingStatus === 'completed' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs">Completed</div>
                <div className="text-[9px] font-normal text-slate-400 truncate">Finished watching</div>
              </div>
            </button>
          </div>

          {/* Remove option if already in library */}
          {isInLibrary ? (
            <button
              type="button"
              onClick={handleRemove}
              className="w-full text-center text-[10px] text-rose-400/80 hover:text-rose-300 pt-1 transition-colors cursor-pointer"
            >
              Remove from Library
            </button>
          ) : (
            <span className="text-[9px] text-slate-500 text-center">Tap any status to add</span>
          )}
        </div>
      )}

      {/* Main Thumbnail Poster Area */}
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

        {/* Action Button: Opens Status Picker Options (Planned / Watching / Completed) */}
        <button
          type="button"
          onClick={openStatusPicker}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 cursor-pointer z-10 tap-bounce',
            isInLibrary
              ? 'bg-emerald-500/90 hover:bg-emerald-400 text-white shadow-[0_0_14px_rgba(16,185,129,0.55)] ring-1 ring-emerald-300/40'
              : 'bg-black/60 hover:bg-red-600 text-white border border-white/25 backdrop-blur-md opacity-90 group-hover:opacity-100 hover:scale-110 shadow-lg'
          )}
          title={isInLibrary ? `In Vault (${libraryItem?.status}) - Tap to change` : 'Add to My Library'}
        >
          {addingStatus !== null ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isInLibrary ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </button>

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
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/40 backdrop-blur-md shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0 golden-halo" />
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
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
              )}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0 golden-halo" />
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
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-1">
            {libraryItem.status === 'watching' && mediaType === 'tv' ? (
              <div className="flex items-center justify-between w-full gap-1">
                <button
                  type="button"
                  onClick={openStatusPicker}
                  className="flex items-center gap-1.5 cursor-pointer group/status hover:opacity-90 transition-opacity min-w-0"
                  title="Watching • Click to change status"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded truncate">
                    S{libraryItem.current_season || 1}:E{libraryItem.current_episode || 0}
                  </span>
                  <SlidersHorizontal className="w-2.5 h-2.5 text-slate-500 group-hover/status:text-slate-300 transition-colors shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleQuickIncrementEpisode}
                  disabled={isIncrementing}
                  className="px-2 py-0.5 rounded-md bg-sky-500/25 hover:bg-sky-500/40 text-sky-200 hover:text-white border border-sky-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                  title="Mark next episode as watched (+1 Ep)"
                >
                  {isIncrementing ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      <span>1 Ep</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openStatusPicker}
                  className="flex items-center gap-1.5 cursor-pointer group/status shrink-0"
                  title="Click to change status"
                >
                  <StatusBadge status={libraryItem.status} size="sm" />
                  <SlidersHorizontal className="w-2.5 h-2.5 text-slate-500 group-hover/status:text-slate-300 transition-colors" />
                </button>
                {libraryItem.current_season && mediaType === 'tv' && (
                  <span className="text-[10px] font-mono text-slate-400">
                    S{libraryItem.current_season} E{libraryItem.current_episode || 0}
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={openStatusPicker}
              className="w-full py-1 px-2 rounded-lg bg-white/5 hover:bg-red-600/90 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add to Library</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile-Friendly Slide-Up Bottom Sheet */}
      <MobileStatusSheet
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        title={title}
        mediaType={mediaType}
        posterPath={posterPath}
        releaseDate={releaseDate}
        libraryItem={libraryItem}
        isLoading={addingStatus !== null}
        onSelectStatus={handleSelectStatus}
        onSetRating={handleSetRating}
        onToggleFavorite={handleToggleFavorite}
        onRemove={handleRemove}
      />
    </div>
  );
}
