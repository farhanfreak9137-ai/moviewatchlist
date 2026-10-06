'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LibraryItem, MediaType, WatchStatus } from '@/lib/types';
import { useLibrary } from '@/hooks/useLibrary';
import { getImageUrl } from '@/lib/metadata/tmdb';
import { StatusBadge } from '@/components/media/StatusBadge';
import {
  Dices,
  Sparkles,
  Play,
  Check,
  RotateCcw,
  X,
  Film,
  Tv,
  Star,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface DiceRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LibraryItem[];
  availableGenres: string[];
}

export function DiceRollModal({
  isOpen,
  onClose,
  items,
  availableGenres,
}: DiceRollModalProps) {
  const { updateItem } = useLibrary();

  const [statusScope, setStatusScope] = useState<'planned' | 'watching' | 'all'>('planned');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');

  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<LibraryItem | null>(null);
  const [cyclingItem, setCyclingItem] = useState<LibraryItem | null>(null);
  const [isMarkingWatching, setIsMarkingWatching] = useState(false);
  const [justMarkedWatching, setJustMarkedWatching] = useState(false);

  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter candidate items
  const candidates = useMemo(() => {
    return items.filter((item) => {
      if (statusScope !== 'all' && item.status !== statusScope) return false;
      if (mediaTypeFilter !== 'all' && item.media_type !== mediaTypeFilter) return false;
      if (genreFilter !== 'all' && !item.genres?.includes(genreFilter)) return false;
      return true;
    });
  }, [items, statusScope, mediaTypeFilter, genreFilter]);

  // Roll execution
  const executeRoll = () => {
    if (candidates.length === 0) return;
    setIsRolling(true);
    setJustMarkedWatching(false);

    let counter = 0;
    const maxCycles = 14;
    const intervalMs = 70;

    if (rollIntervalRef.current) {
      clearInterval(rollIntervalRef.current);
    }

    rollIntervalRef.current = setInterval(() => {
      counter++;
      const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      setCyclingItem(randomCandidate);

      if (counter >= maxCycles) {
        if (rollIntervalRef.current) {
          clearInterval(rollIntervalRef.current);
        }
        // Pick final winner (avoid immediate identical item if > 1 candidate)
        let finalItem = randomCandidate;
        if (candidates.length > 1 && winner) {
          const alternateList = candidates.filter((c) => c.id !== winner.id);
          finalItem = alternateList[Math.floor(Math.random() * alternateList.length)] || randomCandidate;
        }

        setCyclingItem(null);
        setWinner(finalItem);
        setIsRolling(false);
      }
    }, intervalMs);
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    };
  }, []);

  // Keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset winner if candidates become 0
  useEffect(() => {
    if (candidates.length === 0) {
      setWinner(null);
    }
  }, [candidates.length]);

  if (!isOpen) return null;

  const currentDisplayItem = isRolling ? cyclingItem : winner;
  const posterUrl = currentDisplayItem
    ? getImageUrl(currentDisplayItem.poster_path, 'w500')
    : null;

  const handleMarkAsWatching = async () => {
    if (!winner) return;
    try {
      setIsMarkingWatching(true);
      await updateItem(winner.id, {
        status: 'watching',
        start_date: new Date().toISOString().substring(0, 10),
      });
      setJustMarkedWatching(true);
      setWinner({
        ...winner,
        status: 'watching',
      });
    } catch (err) {
      console.error('Failed to mark as watching:', err);
    } finally {
      setIsMarkingWatching(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0e1018] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Glowing Top Ambient Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Dices className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Surprise Me
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Decision Solver
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Can't decide what to watch? Let the dice roll your next pick!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Section */}
        <div className="p-3 sm:p-4 bg-[#131520]/80 border-b border-white/5 space-y-2.5 text-xs">
          {/* Status Scope Filters */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              From:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'planned', label: 'Planned' },
                  { id: 'watching', label: 'Watching' },
                  { id: 'all', label: 'Entire Vault' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusScope(tab.id)}
                  disabled={isRolling}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    statusScope === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type & Genre Filters */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Types' },
                  { id: 'movie', label: 'Movies' },
                  { id: 'tv', label: 'TV Shows' },
                ] as const
              ).map((typeTab) => (
                <button
                  key={typeTab.id}
                  type="button"
                  onClick={() => setMediaTypeFilter(typeTab.id)}
                  disabled={isRolling}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                    mediaTypeFilter === typeTab.id
                      ? 'bg-white/20 text-white'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {typeTab.label}
                </button>
              ))}
            </div>

            {/* Genre selector */}
            {availableGenres.length > 0 && (
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                disabled={isRolling}
                className="bg-[#1a1d29] text-slate-300 text-[11px] px-2 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[130px] truncate"
              >
                <option value="all">All Genres</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Body: Display Card or Roll Button */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No titles match these filters</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                You don't have any {statusScope === 'all' ? '' : statusScope} titles matching this filter in your library.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusScope('all');
                  setMediaTypeFilter('all');
                  setGenreFilter('all');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : currentDisplayItem ? (
            <div
              className={cn(
                'relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[#141622] border transition-all duration-300',
                isRolling
                  ? 'border-indigo-500/60 ring-2 ring-indigo-500/20 scale-[0.99] opacity-90'
                  : 'border-white/10 hover:border-white/20'
              )}
            >
              {/* Poster */}
              <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-lg overflow-hidden bg-[#1f2233] shrink-0 mx-auto sm:mx-0 shadow-lg">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={currentDisplayItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-500">
                    {currentDisplayItem.media_type === 'movie' ? (
                      <Film className="w-8 h-8 text-slate-600" />
                    ) : (
                      <Tv className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-bold uppercase text-slate-300">
                  {currentDisplayItem.media_type === 'movie' ? 'Movie' : 'Series'}
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex-1 flex flex-col justify-between min-w-0 space-y-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={currentDisplayItem.status} size="sm" />
                    {currentDisplayItem.rating > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {currentDisplayItem.rating}/10
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2">
                    {currentDisplayItem.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    {currentDisplayItem.release_year && (
                      <span>{currentDisplayItem.release_year}</span>
                    )}
                    {currentDisplayItem.genres && currentDisplayItem.genres.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate text-slate-300">
                          {currentDisplayItem.genres.slice(0, 2).join(', ')}
                        </span>
                      </>
                    )}
                  </div>

                  {currentDisplayItem.overview && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {currentDisplayItem.overview}
                    </p>
                  )}
                </div>

                {/* Actions for winner */}
                {!isRolling && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                    <Link
                      href={`/title?mediaType=${currentDisplayItem.media_type}&id=${currentDisplayItem.tmdb_id}`}
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-red-950/40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Details</span>
                    </Link>

                    {currentDisplayItem.status !== 'watching' && (
                      <button
                        type="button"
                        onClick={handleMarkAsWatching}
                        disabled={isMarkingWatching || justMarkedWatching}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                          justMarkedWatching
                            ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        )}
                      >
                        {justMarkedWatching ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-sky-400" />
                            <span>Marked as Watching</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <span>Start Watching</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Initial Call-to-action view before first roll */
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-950/50">
                <Dices className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-white">
                {candidates.length} {candidates.length === 1 ? 'Title' : 'Titles'} Ready in Pool
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Hit roll to let the randomizer pick your next cinematic experience from your {statusScope} list!
              </p>
            </div>
          )}
        </div>

        {/* Footer with Roll Controls */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0c0e17] flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 font-mono">
            <span>Pool size: </span>
            <strong className="text-indigo-400">{candidates.length}</strong> titles
          </div>

          <div className="flex items-center gap-2">
            {winner && !isRolling && (
              <button
                type="button"
                onClick={executeRoll}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-roll</span>
              </button>
            )}

            <button
              type="button"
              onClick={executeRoll}
              disabled={isRolling || candidates.length === 0}
              className={cn(
                'px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xl',
                isRolling || candidates.length === 0
                  ? 'bg-indigo-600/50 text-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-indigo-950/60 active:scale-95'
              )}
            >
              <Dices className={cn('w-4 h-4', isRolling && 'animate-spin')} />
              <span>{isRolling ? 'Shuffling...' : winner ? 'Roll Another' : 'Roll the Dice!'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
