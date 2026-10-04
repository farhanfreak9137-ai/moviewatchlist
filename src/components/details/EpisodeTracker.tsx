'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { tmdbService } from '@/lib/metadata/tmdb';
import { EpisodeInfo, SeasonInfo } from '@/lib/types';
import { Check, CheckCircle2, Circle, Tv, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EpisodeTrackerProps {
  tvId: number;
  libraryItemId?: string;
  seasons?: SeasonInfo[];
  currentSeason?: number;
  currentEpisode?: number;
  onProgressUpdate?: (season: number, episode: number) => void;
}

export function EpisodeTracker({
  tvId,
  libraryItemId,
  seasons = [],
  currentSeason = 1,
  currentEpisode = 0,
  onProgressUpdate,
}: EpisodeTrackerProps) {
  const filteredSeasons = seasons.filter((s) => s.season_number > 0);
  const [selectedSeason, setSelectedSeason] = useState<number>(currentSeason || 1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Live query for checked episodes if in library
  const watchedEpisodes = useLiveQuery(
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
    (watchedEpisodes || []).map((e) => `s${e.season_number}_e${e.episode_number}`)
  );

  useEffect(() => {
    let isMounted = true;
    async function loadEpisodes() {
      if (!selectedSeason) return;
      try {
        setLoading(true);
        const data = await tmdbService.getSeriesSeason(tvId, selectedSeason);
        if (isMounted) {
          setEpisodes(data.episodes || []);
        }
      } catch (err) {
        console.warn('Failed to load season episodes:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEpisodes();
    return () => {
      isMounted = false;
    };
  }, [tvId, selectedSeason]);

  const toggleEpisode = async (seasonNum: number, episodeNum: number) => {
    if (!libraryItemId) return;

    const id = `${libraryItemId}_s${seasonNum}_e${episodeNum}`;
    const key = `s${seasonNum}_e${episodeNum}`;
    const isCurrentlyWatched = watchedSet.has(key);

    const now = new Date().toISOString();
    await db.episode_progress.put({
      id,
      library_item_id: libraryItemId,
      tmdb_id: tvId,
      season_number: seasonNum,
      episode_number: episodeNum,
      is_watched: !isCurrentlyWatched,
      watched_at: !isCurrentlyWatched ? now : undefined,
      updated_at: now,
    });

    if (!isCurrentlyWatched && onProgressUpdate) {
      onProgressUpdate(seasonNum, episodeNum);
    }
  };

  const handleQuickNextEpisode = () => {
    const nextEp = (currentEpisode || 0) + 1;
    if (onProgressUpdate) {
      onProgressUpdate(selectedSeason, nextEp);
    }
    if (libraryItemId) {
      toggleEpisode(selectedSeason, nextEp);
    }
  };

  const seasonInfo = filteredSeasons.find((s) => s.season_number === selectedSeason);
  const totalEpisodesInSeason = seasonInfo?.episode_count || episodes.length || 0;
  const watchedInThisSeason = episodes.filter((ep) =>
    watchedSet.has(`s${selectedSeason}_e${ep.episode_number}`)
  ).length;

  return (
    <div className="mt-8 pt-6 border-t border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            <span>Seasons & Episode Progress</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Track episodes watched, season completion, and air dates.
          </p>
        </div>

        {/* Season Selector */}
        {filteredSeasons.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Season:</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-[#181a24] text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {filteredSeasons.map((s) => (
                <option key={s.id} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Season Progress Bar if in library */}
      {libraryItemId && totalEpisodesInSeason > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#11131c] border border-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-medium">
              Season {selectedSeason} Progress: {watchedInThisSeason} / {totalEpisodesInSeason} watched
            </span>
            <button
              onClick={handleQuickNextEpisode}
              className="px-2.5 py-1 rounded bg-red-600/90 hover:bg-red-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              + Next Episode
            </button>
          </div>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
              style={{
                width: `${totalEpisodesInSeason > 0 ? (watchedInThisSeason / totalEpisodesInSeason) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Episodes List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Loading season episodes...
        </div>
      ) : episodes.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {episodes.map((ep) => {
            const isWatched = watchedSet.has(`s${selectedSeason}_e${ep.episode_number}`);
            return (
              <div
                key={ep.id}
                onClick={() => libraryItemId && toggleEpisode(selectedSeason, ep.episode_number)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all text-xs',
                  libraryItemId ? 'cursor-pointer hover:bg-white/5' : '',
                  isWatched
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                    : 'bg-[#10121a] border-white/5 text-slate-300'
                )}
              >
                <div className="flex items-center gap-3">
                  {libraryItemId && (
                    <div
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center border transition-colors',
                        isWatched
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-white/20 text-transparent hover:border-white/40'
                      )}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">
                        {ep.episode_number}.
                      </span>
                      <span className="font-semibold text-slate-100">{ep.name}</span>
                    </div>
                    {ep.air_date && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Air date: {ep.air_date} {ep.runtime ? `• ${ep.runtime} min` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {ep.vote_average ? (
                  <span className="text-[11px] font-mono text-amber-400/80">
                    ★ {ep.vote_average.toFixed(1)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-[#11131c] text-center text-xs text-slate-400">
          Episode information not available for this season.
        </div>
      )}
    </div>
  );
}
