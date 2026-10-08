'use client';

import React from 'react';
import { WatchStatus, MediaType, LibraryItem } from '@/lib/types';
import {
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Star,
  Heart,
  Trash2,
  X,
  Loader2,
  Film,
  Tv,
} from 'lucide-react';
import { getImageUrl } from '@/lib/metadata/tmdb';
import { triggerHaptic } from '@/lib/utils/haptics';
import { cn } from '@/lib/utils/cn';

interface MobileStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mediaType: MediaType;
  posterPath?: string | null;
  releaseDate?: string;
  libraryItem?: LibraryItem;
  isLoading?: boolean;
  onSelectStatus: (status: WatchStatus) => Promise<void> | void;
  onSetRating?: (rating: number) => Promise<void> | void;
  onToggleFavorite?: () => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}

export function MobileStatusSheet({
  isOpen,
  onClose,
  title,
  mediaType,
  posterPath,
  releaseDate,
  libraryItem,
  isLoading = false,
  onSelectStatus,
  onSetRating,
  onToggleFavorite,
  onRemove,
}: MobileStatusSheetProps) {
  if (!isOpen) return null;

  const posterUrl = getImageUrl(posterPath, 'w342');
  const year = releaseDate ? releaseDate.substring(0, 4) : '';
  const currentStatus = libraryItem?.status;
  const currentRating = libraryItem?.rating || 0;
  const isFavorite = !!libraryItem?.is_favorite;

  const statuses: Array<{
    id: WatchStatus;
    label: string;
    sublabel: string;
    icon: typeof Clock;
    colorClasses: string;
    activeClasses: string;
  }> = [
    {
      id: 'planned',
      label: 'Plan to Watch',
      sublabel: 'Save to watchlist for later',
      icon: Clock,
      colorClasses: 'text-amber-400',
      activeClasses: 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-400/40',
    },
    {
      id: 'watching',
      label: 'Currently Watching',
      sublabel: 'In progress now',
      icon: Play,
      colorClasses: 'text-sky-400',
      activeClasses: 'bg-sky-500/20 border-sky-500/50 text-sky-300 ring-1 ring-sky-400/40',
    },
    {
      id: 'completed',
      label: 'Completed',
      sublabel: 'Finished viewing',
      icon: CheckCircle2,
      colorClasses: 'text-emerald-400',
      activeClasses: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-400/40',
    },
    {
      id: 'dropped',
      label: 'Dropped',
      sublabel: 'Stopped watching',
      icon: XCircle,
      colorClasses: 'text-rose-400',
      activeClasses: 'bg-rose-500/20 border-rose-500/50 text-rose-300 ring-1 ring-rose-400/40',
    },
  ];

  const handleStatusClick = async (status: WatchStatus) => {
    triggerHaptic('selection');
    await onSelectStatus(status);
    onClose();
  };

  const handleRatingClick = async (r: number) => {
    triggerHaptic('light');
    if (onSetRating) {
      await onSetRating(currentRating === r ? 0 : r);
    }
  };

  const handleFavoriteClick = async () => {
    triggerHaptic('medium');
    if (onToggleFavorite) {
      await onToggleFavorite();
    }
  };

  const handleRemoveClick = async () => {
    triggerHaptic('warning');
    if (onRemove) {
      await onRemove();
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg mx-auto bg-[#0f111a] border-t border-white/15 rounded-t-3xl shadow-2xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto no-scrollbar"
      >
        {/* Pull Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Header Preview */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
          <div className="w-12 h-16 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/10 relative">
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                {mediaType === 'movie' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{title}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                {mediaType === 'movie' ? 'Movie' : 'Series'}
              </span>
              {year && <span>{year}</span>}
              {libraryItem?.current_season && mediaType === 'tv' && (
                <span className="text-sky-400 font-semibold">
                  S{libraryItem.current_season}:E{libraryItem.current_episode || 0}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {libraryItem && onToggleFavorite && (
              <button
                type="button"
                onClick={handleFavoriteClick}
                className={cn(
                  'p-2.5 rounded-xl border transition-all cursor-pointer',
                  isFavorite
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                )}
                title="Toggle favorite"
              >
                <Heart className={cn('w-4 h-4', isFavorite && 'fill-rose-500')} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Rows */}
        <div className="space-y-2 py-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Watch Status
          </span>

          <div className="grid grid-cols-1 gap-2">
            {statuses.map((s) => {
              const Icon = s.icon;
              const isSelected = currentStatus === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleStatusClick(s.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98]',
                    isSelected
                      ? s.activeClasses
                      : 'bg-[#151724] border-white/5 hover:border-white/20 text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/5',
                        isSelected ? 'bg-white/10' : 'bg-[#1c1e2d]'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', s.colorClasses)} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{s.label}</div>
                      <div className="text-[10px] text-slate-400">{s.sublabel}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-white/10 text-white">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Star Rating Quick Selector (If in library) */}
        {libraryItem && onSetRating && (
          <div className="pt-2 pb-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Your Rating
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {currentRating > 0 ? `${currentRating} / 10 ★` : 'Not Rated'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className={cn(
                    'flex-1 min-w-7 py-2 rounded-xl text-xs font-mono font-bold transition-all border flex items-center justify-center cursor-pointer active:scale-90',
                    currentRating >= star
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  {star}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Remove from Vault */}
        {libraryItem && onRemove && (
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleRemoveClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from Personal Vault</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
