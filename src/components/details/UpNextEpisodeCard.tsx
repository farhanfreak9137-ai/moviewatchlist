'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { tmdbService } from '@/lib/metadata/tmdb';
import { SeasonInfo, EpisodeInfo } from '@/lib/types';
import { Play, Check, Sparkles } from 'lucide-react';

interface UpNextEpisodeCardProps {
  tvId: number;
  libraryItemId: string;
  seasons: SeasonInfo[];
  onEpisodeWatched?: (season: number, episode: number) => void;
}

export function UpNextEpisodeCard({
  tvId,
  libraryItemId,
  seasons = [],
  onEpisodeWatched,
}: UpNextEpisodeCardProps) {
  const [firstSeasonEpisodes, setFirstSeasonEpisodes] = useState<EpisodeInfo[]>([]);

  // Live query for all watched episodes for this show from IndexedDB
  const watchedRecords = useLiveQuery(
    async () => {
      if (!libraryItemId) return [];
      return await db.episode_progress
        .where('library_item_id')
        .equals(libraryItemId)
        .and((ep) => ep.is_watched)
        .toArray();
    },
    [libraryItemId],
    []
  );

  const watchedSet = new Set(
    (watchedRecords || []).map((e) => `s${e.season_number}_e${e.episode_number}`)
  );

  // Filter out season 0 specials
  const regularSeasons = seasons.filter((s) => s.season_number > 0);
  const totalEpisodes = regularSeasons.reduce((acc, curr) => acc + (curr.episode_count || 0), 0);
  const watchedCount = watchedRecords?.length || 0;
  const progressPercent = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

  // Find next unwatched season & episode
  let nextSeason = 1;
  let nextEpNumber = 1;
  let foundUnwatched = false;

  for (const s of regularSeasons) {
    for (let ep = 1; ep <= (s.episode_count || 0); ep++) {
      if (!watchedSet.has(`s${s.season_number}_e${ep}`)) {
        nextSeason = s.season_number;
        nextEpNumber = ep;
        foundUnwatched = true;
        break;
      }
    }
    if (foundUnwatched) break;
  }

  // Fetch episode metadata for next unwatched episode
  useEffect(() => {
    let isMounted = true;
    async function loadSeasonData() {
      if (!tvId || !nextSeason) return;
      try {
        const res = await tmdbService.getSeriesSeason(tvId, nextSeason);
        if (isMounted) {
          setFirstSeasonEpisodes(res.episodes || []);
        }
      } catch (err) {
        console.warn('Failed to load season episodes for Up Next card:', err);
      }
    }
    loadSeasonData();
    return () => {
      isMounted = false;
    };
  }, [tvId, nextSeason]);

  const nextEpisodeData = firstSeasonEpisodes.find((e) => e.episode_number === nextEpNumber);

  const handleMarkNextWatched = async () => {
    if (!libraryItemId) return;
    const now = new Date().toISOString();
    const id = `${libraryItemId}_s${nextSeason}_e${nextEpNumber}`;

    await db.episode_progress.put({
      id,
      library_item_id: libraryItemId,
      tmdb_id: tvId,
      season_number: nextSeason,
      episode_number: nextEpNumber,
      is_watched: true,
      watched_at: now,
      updated_at: now,
    });

    await db.library_items.update(libraryItemId, {
      current_season: nextSeason,
      current_episode: nextEpNumber,
      updated_at: now,
    });

    if (onEpisodeWatched) {
      onEpisodeWatched(nextSeason, nextEpNumber);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#121422] to-[#0e1019] border border-white/10 shadow-xl space-y-4 mb-6">
      {/* Overall Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Series Watch Progress</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {watchedCount} of {totalEpisodes} eps ({progressPercent}%)
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Up Next Card */}
      {foundUnwatched ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#171a28] border border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] font-bold">
                  S{nextSeason} E{nextEpNumber}
                </span>
                <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                  Up Next
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {nextEpisodeData?.name || `Episode ${nextEpNumber}`}
              </h4>
            </div>
          </div>

          <button
            onClick={handleMarkNextWatched}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-900/30 shrink-0"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Mark S{nextSeason}E{nextEpNumber} Watched</span>
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>All Released Episodes Watched!</span>
          </span>
        </div>
      )}
    </div>
  );
}
