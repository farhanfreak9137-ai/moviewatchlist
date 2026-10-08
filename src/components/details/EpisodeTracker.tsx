'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { tmdbService, getImageUrl } from '@/lib/metadata/tmdb';
import { EpisodeInfo, SeasonInfo } from '@/lib/types';
import {
  Grid3X3,
  LineChart,
  List,
  Check,
  Star,
  Sparkles,
  TrendingUp,
  X,
  Award,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/lib/toast/toastContext';
import { triggerHaptic } from '@/lib/utils/haptics';

interface EpisodeTrackerProps {
  tvId: number;
  libraryItemId?: string;
  seasons?: SeasonInfo[];
  currentSeason?: number;
  currentEpisode?: number;
  onProgressUpdate?: (season: number, episode: number) => void;
}

// SeriesGraph authentic high-contrast color binning
export function getSeriesGraphColor(rating?: number | null): {
  bg: string;
  hoverBg: string;
  text: string;
  hex: string;
  label: string;
} {
  if (!rating || rating <= 0) {
    return {
      bg: 'bg-[#181a24] border border-white/5',
      hoverBg: 'hover:bg-[#222634]',
      text: 'text-slate-500 font-semibold',
      hex: '#181a24',
      label: 'Unrated',
    };
  }
  // Absolute Cinema: >= 9.7 (SeriesGraph electric blue #1da1f2)
  if (rating >= 9.7) {
    return {
      bg: 'bg-[#1da1f2]',
      hoverBg: 'hover:bg-[#0c85d0]',
      text: 'text-white font-black',
      hex: '#1da1f2',
      label: 'Absolute Cinema',
    };
  }
  // Awesome: 9.0 - 9.6 (SeriesGraph deep dark forest green #186a3b - "dark green is really good")
  if (rating >= 9.0) {
    return {
      bg: 'bg-[#186a3b]',
      hoverBg: 'hover:bg-[#145a32]',
      text: 'text-white font-black',
      hex: '#186a3b',
      label: 'Awesome',
    };
  }
  // Great: 8.0 - 8.9 (SeriesGraph light/medium emerald green #28b463 - "light green decend")
  if (rating >= 8.0) {
    return {
      bg: 'bg-[#28b463]',
      hoverBg: 'hover:bg-[#239b56]',
      text: 'text-white font-black',
      hex: '#28b463',
      label: 'Great',
    };
  }
  // Good: 7.0 - 7.9 (SeriesGraph warm golden yellow #f4d03f with crisp black text for maximum contrast)
  if (rating >= 7.0) {
    return {
      bg: 'bg-[#f4d03f]',
      hoverBg: 'hover:bg-[#d4ac0d]',
      text: 'text-[#111827] font-black',
      hex: '#f4d03f',
      label: 'Good',
    };
  }
  // Average: 6.0 - 6.9 (SeriesGraph dark orange/amber #f39c12)
  if (rating >= 6.0) {
    return {
      bg: 'bg-[#f39c12]',
      hoverBg: 'hover:bg-[#d68910]',
      text: 'text-[#111827] font-black',
      hex: '#f39c12',
      label: 'Average',
    };
  }
  // Bad: 5.0 - 5.9 (SeriesGraph crimson red #e74c3c)
  if (rating >= 5.0) {
    return {
      bg: 'bg-[#e74c3c]',
      hoverBg: 'hover:bg-[#c0392b]',
      text: 'text-white font-black',
      hex: '#e74c3c',
      label: 'Bad',
    };
  }
  // Garbage: < 5.0 (SeriesGraph deep plum purple #633974)
  return {
    bg: 'bg-[#633974]',
    hoverBg: 'hover:bg-[#512e5f]',
    text: 'text-white font-black',
    hex: '#633974',
    label: 'Garbage',
  };
}

export function EpisodeTracker({
  tvId,
  libraryItemId,
  seasons = [],
  currentSeason = 1,
  onProgressUpdate,
}: EpisodeTrackerProps) {
  // Only valid seasons (exclude Season 0 specials from main heatmap unless only specials exist)
  const targetSeasons = useMemo(() => {
    const regular = (seasons || []).filter((s) => s.season_number > 0);
    return regular.length > 0 ? regular : (seasons || []);
  }, [seasons]);

  const [viewMode, setViewMode] = useState<'matrix' | 'graph' | 'list'>('matrix');
  const [allSeasonEpisodes, setAllSeasonEpisodes] = useState<Record<number, EpisodeInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeInfo | null>(null);
  const [selectedSeasonForList, setSelectedSeasonForList] = useState<number>(currentSeason || 1);
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Live query for checked episodes from IndexedDB
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

  const watchedSet = useMemo(() => {
    return new Set((watchedEpisodes || []).map((e) => `s${e.season_number}_e${e.episode_number}`));
  }, [watchedEpisodes]);

  const seasonsKey = useMemo(() => {
    return targetSeasons.map((s) => s.season_number).join(',');
  }, [targetSeasons]);

  // Load all season episodes concurrently
  useEffect(() => {
    let isMounted = true;

    async function loadAllSeasons() {
      if (!tvId || targetSeasons.length === 0) return;
      try {
        setLoading(true);
        const results = await Promise.all(
          targetSeasons.map(async (s) => {
            try {
              const data = await tmdbService.getSeriesSeason(tvId, s.season_number);
              return { seasonNum: s.season_number, episodes: data.episodes || [] };
            } catch {
              return { seasonNum: s.season_number, episodes: [] };
            }
          })
        );

        if (isMounted) {
          const map: Record<number, EpisodeInfo[]> = {};
          for (const item of results) {
            map[item.seasonNum] = item.episodes;
          }
          setAllSeasonEpisodes(map);
        }
      } catch (err) {
        console.warn('Failed to load series seasons:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllSeasons();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvId, seasonsKey]);

  // Toggle watched state
  const toggleEpisode = async (seasonNum: number, episodeNum: number) => {
    if (!libraryItemId) return;

    const id = `${libraryItemId}_s${seasonNum}_e${episodeNum}`;
    const key = `s${seasonNum}_e${episodeNum}`;
    const isCurrentlyWatched = watchedSet.has(key);

    triggerHaptic(isCurrentlyWatched ? 'light' : 'success');
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

    showToast({
      message: !isCurrentlyWatched
        ? `Marked S${seasonNum}:E${episodeNum} watched`
        : `Unmarked S${seasonNum}:E${episodeNum}`,
      type: 'success',
      undoAction: async () => {
        await db.episode_progress.put({
          id,
          library_item_id: libraryItemId,
          tmdb_id: tvId,
          season_number: seasonNum,
          episode_number: episodeNum,
          is_watched: isCurrentlyWatched,
          watched_at: isCurrentlyWatched ? now : undefined,
          updated_at: now,
        });
      },
    });
  };

  // Batch toggle an entire season's watched state
  const toggleSeason = async (seasonNum: number) => {
    if (!libraryItemId) return;
    const episodes = allSeasonEpisodes[seasonNum] || [];
    if (episodes.length === 0) return;

    const allWatched = episodes.every((ep) => watchedSet.has(`s${seasonNum}_e${ep.episode_number}`));
    const now = new Date().toISOString();
    triggerHaptic(allWatched ? 'light' : 'success');

    await db.episode_progress.bulkPut(
      episodes.map((ep) => ({
        id: `${libraryItemId}_s${seasonNum}_e${ep.episode_number}`,
        library_item_id: libraryItemId,
        tmdb_id: tvId,
        season_number: seasonNum,
        episode_number: ep.episode_number,
        is_watched: !allWatched,
        watched_at: !allWatched ? now : undefined,
        updated_at: now,
      }))
    );

    if (!allWatched && onProgressUpdate) {
      const lastEp = episodes[episodes.length - 1];
      onProgressUpdate(seasonNum, lastEp.episode_number);
    }

    showToast({
      message: !allWatched
        ? `Marked all ${episodes.length} episodes of Season ${seasonNum} watched`
        : `Unmarked Season ${seasonNum}`,
      type: 'success',
      undoAction: async () => {
        await db.episode_progress.bulkPut(
          episodes.map((ep) => ({
            id: `${libraryItemId}_s${seasonNum}_e${ep.episode_number}`,
            library_item_id: libraryItemId,
            tmdb_id: tvId,
            season_number: seasonNum,
            episode_number: ep.episode_number,
            is_watched: allWatched,
            watched_at: allWatched ? now : undefined,
            updated_at: now,
          }))
        );
      },
    });
  };

  // Find max episode count across all seasons to size the matrix columns
  const maxEpisodes = useMemo(() => {
    let max = 0;
    for (const eps of Object.values(allSeasonEpisodes)) {
      if (eps.length > max) max = eps.length;
    }
    return Math.max(max, 10);
  }, [allSeasonEpisodes]);

  // Compute stats across series (highest rated, lowest rated, overall average)
  const seriesStats = useMemo(() => {
    const all: Array<{ episode: EpisodeInfo; season: number; rating: number }> = [];
    for (const [seasonStr, eps] of Object.entries(allSeasonEpisodes)) {
      const sNum = parseInt(seasonStr, 10);
      eps.forEach((ep) => {
        if (ep.vote_average && ep.vote_average > 0) {
          all.push({ episode: ep, season: sNum, rating: ep.vote_average });
        }
      });
    }

    if (all.length === 0) return null;

    all.sort((a, b) => b.rating - a.rating);
    const highest = all[0];
    const lowest = all[all.length - 1];
    const avg = (all.reduce((acc, curr) => acc + curr.rating, 0) / all.length).toFixed(1);

    return { highest, lowest, avg, totalRated: all.length };
  }, [allSeasonEpisodes]);

  // Flatten chronological episodes for the Trend Line Graph
  const chronologicalEpisodes = useMemo(() => {
    const list: Array<{ season: number; episode: EpisodeInfo; rating: number }> = [];
    const sortedSeasonKeys = Object.keys(allSeasonEpisodes)
      .map(Number)
      .sort((a, b) => a - b);

    for (const sNum of sortedSeasonKeys) {
      const eps = allSeasonEpisodes[sNum] || [];
      eps.forEach((ep) => {
        if (ep.vote_average !== undefined) {
          list.push({ season: sNum, episode: ep, rating: ep.vote_average || 0 });
        }
      });
    }
    return list;
  }, [allSeasonEpisodes]);

  return (
    <div className="mt-10 pt-8 border-t border-white/10 w-full max-w-full">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white font-sans">
              SeriesGraph Episode Ratings
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual episode quality trajectory, season averages, and personal progress.
          </p>
        </div>

        {/* View mode toggle (Matrix, Graph, List) */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#11131c] border border-white/10 w-full sm:w-auto sm:flex sm:items-center shrink-0">
          <button
            onClick={() => setViewMode('matrix')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate',
              viewMode === 'matrix' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Grid</span>
            <span className="hidden sm:inline">Heatmap Grid</span>
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate',
              viewMode === 'graph' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            )}
          >
            <LineChart className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Trend</span>
            <span className="hidden sm:inline">Trend Graph</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate',
              viewMode === 'list' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            )}
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">List</span>
            <span className="hidden sm:inline">Episode List</span>
          </button>
        </div>
      </div>

      {/* Series Highlights Stats Bar */}
      {seriesStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-[#10121a] border border-white/5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Series Average</span>
              <span className="text-lg font-bold text-white font-mono">{seriesStats.avg} <span className="text-xs text-slate-500">/ 10</span></span>
            </div>
          </div>

          {seriesStats.highest && (
            <div
              onClick={() => setActiveEpisode(seriesStats.highest.episode)}
              className="flex items-center gap-3 cursor-pointer group hover:opacity-90"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Highest Rated</span>
                <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 truncate block">
                  {seriesStats.highest.episode.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ★ {seriesStats.highest.rating.toFixed(1)} (S{seriesStats.highest.season}E{seriesStats.highest.episode.episode_number})
                </span>
              </div>
            </div>
          )}

          {seriesStats.lowest && (
            <div
              onClick={() => setActiveEpisode(seriesStats.lowest.episode)}
              className="flex items-center gap-3 cursor-pointer group hover:opacity-90"
            >
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Lowest Rated</span>
                <span className="text-xs font-bold text-slate-100 group-hover:text-orange-400 truncate block">
                  {seriesStats.lowest.episode.name}
                </span>
                <span className="text-[10px] font-mono text-orange-400 font-bold">
                  ★ {seriesStats.lowest.rating.toFixed(1)} (S{seriesStats.lowest.season}E{seriesStats.lowest.episode.episode_number})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: THE SERIESGRAPH HEATMAP MATRIX */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          {/* Quick Season Marking (one tap marks/unmarks every episode in a season) */}
          {libraryItemId && !loading && targetSeasons.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#10121a] border border-white/5">
              <div className="flex items-center gap-2 mb-2.5">
                <Layers className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Mark Season Watched
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">Tap again to unmark</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {targetSeasons.map((season) => {
                  const sNum = season.season_number;
                  const eps = allSeasonEpisodes[sNum] || [];
                  if (eps.length === 0) return null;
                  const watchedCount = eps.filter((ep) => watchedSet.has(`s${sNum}_e${ep.episode_number}`)).length;
                  const isDone = watchedCount === eps.length;
                  const isPartial = watchedCount > 0 && !isDone;
                  return (
                    <button
                      key={season.id}
                      id={`mark-season-${sNum}`}
                      onClick={() => toggleSeason(sNum)}
                      aria-pressed={isDone}
                      title={isDone ? `Unmark Season ${sNum}` : `Mark all of Season ${sNum} as watched`}
                      className={cn(
                        'flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 cursor-pointer',
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : isPartial
                            ? 'bg-sky-500/10 text-sky-200 border-sky-500/30 hover:bg-sky-500/20'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      )}
                    >
                      <span
                        className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center border',
                          isDone ? 'bg-emerald-500 border-emerald-400' : 'border-white/25'
                        )}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                      </span>
                      <span>S{sNum}</span>
                      <span className="font-mono text-[10px] opacity-70">
                        {watchedCount}/{eps.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-3 sm:p-6 rounded-2xl bg-[#0e1017] border border-white/10 overflow-x-auto shadow-2xl">
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Generating SeriesGraph rating matrix...
              </div>
            ) : (
              <div className="min-w-[620px]">
                {/* Column Headers (Episode Numbers E1, E2, E3...) */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 pb-2 border-b border-white/5 text-[11px] font-mono text-slate-400">
                  {/* Sticky Header Columns */}
                  <div className="sticky left-0 bg-[#0e1017] z-20 flex items-center pr-2 border-r border-white/10 shadow-lg">
                    <div className="w-12 sm:w-20 shrink-0 font-bold text-slate-300">
                      <span className="sm:hidden font-mono">S</span>
                      <span className="hidden sm:inline">Season</span>
                    </div>
                    <div className="w-11 sm:w-16 shrink-0 text-center font-bold text-slate-300">Avg</div>
                  </div>

                  <div className="flex-1 flex gap-1.5 pl-1">
                    {Array.from({ length: maxEpisodes }, (_, i) => i + 1).map((epNum) => (
                      <div
                        key={epNum}
                        className="w-10 sm:w-11 text-center shrink-0 text-[10px] text-slate-400 font-medium"
                      >
                        E{epNum}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Season Rows */}
                <div className="space-y-2">
                  {targetSeasons.map((season) => {
                    const sNum = season.season_number;
                    const episodes = allSeasonEpisodes[sNum] || [];

                    // Calculate season average
                    const ratedEpisodes = episodes.filter((e) => e.vote_average && e.vote_average > 0);
                    const seasonAvg = ratedEpisodes.length > 0
                      ? (ratedEpisodes.reduce((acc, curr) => acc + (curr.vote_average || 0), 0) / ratedEpisodes.length).toFixed(1)
                      : null;
                    const avgColor = seasonAvg ? getSeriesGraphColor(parseFloat(seasonAvg)) : null;

                    return (
                      <div
                        key={season.id}
                        className="flex items-center gap-1.5 sm:gap-2 py-1 hover:bg-white/[0.02] rounded-xl transition-colors"
                      >
                        {/* Sticky Season & Avg Columns */}
                        <div className="sticky left-0 bg-[#0e1017] z-10 flex items-center pr-2 border-r border-white/10 shadow-lg">
                          {/* Season Name */}
                          <div className="w-12 sm:w-20 shrink-0 font-bold text-xs text-slate-200">
                            <span className="sm:hidden font-mono">S{sNum}</span>
                            <span className="hidden sm:inline">{season.name || `Season ${sNum}`}</span>
                          </div>

                          {/* Season Average Badge */}
                          <div className="w-10 sm:w-14 shrink-0 flex justify-center">
                            {seasonAvg && avgColor ? (
                              <span
                                className={cn(
                                  'px-1.5 sm:px-2 py-0.5 rounded-md font-mono text-[10px] sm:text-[11px] text-center font-black shadow-sm border border-black/30',
                                  avgColor.bg,
                                  avgColor.text
                                )}
                                title={`Season ${sNum} Average: ${seasonAvg}`}
                              >
                                {seasonAvg}
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-600">—</span>
                            )}
                          </div>

                          {/* Quick Complete Season Button */}
                          {libraryItemId && (
                            <button
                              type="button"
                              onClick={() => toggleSeason(sNum)}
                              className={cn(
                                'w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer border shrink-0 ml-1 active:scale-90',
                                episodes.length > 0 && episodes.every((ep) => watchedSet.has(`s${sNum}_e${ep.episode_number}`))
                                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/30'
                              )}
                              title={
                                episodes.length > 0 && episodes.every((ep) => watchedSet.has(`s${sNum}_e${ep.episode_number}`))
                                  ? `Season ${sNum} fully watched • Click to unmark`
                                  : `Click to mark Season ${sNum} as completely watched`
                              }
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>
                          )}
                        </div>

                        {/* Episode Cells */}
                        <div className="flex-1 flex gap-1.5 pl-1">
                          {Array.from({ length: maxEpisodes }, (_, i) => i + 1).map((epNum) => {
                            const ep = episodes.find((e) => e.episode_number === epNum);
                            if (!ep) {
                              return (
                                <div
                                  key={epNum}
                                  className="w-10 sm:w-11 h-9 rounded-lg bg-transparent shrink-0 opacity-20"
                                />
                              );
                            }

                            const rating = ep.vote_average ? parseFloat(ep.vote_average.toFixed(1)) : 0;
                            const color = getSeriesGraphColor(rating);
                            const isWatched = watchedSet.has(`s${sNum}_e${epNum}`);

                            return (
                              <button
                                key={ep.id}
                                onClick={() => setActiveEpisode(ep)}
                                className={cn(
                                  'relative w-10 sm:w-11 h-9 rounded-lg shrink-0 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-sm group hover:scale-110 hover:z-20 border border-black/30',
                                  color.bg,
                                  color.hoverBg,
                                  isWatched && 'ring-2 ring-white/90 ring-offset-1 ring-offset-[#08090d]'
                                )}
                                title={`S${sNum}E${epNum}: ${ep.name} (★ ${rating ? rating.toFixed(1) : 'Unrated'} — ${color.label})`}
                              >
                                <span className={cn('text-[11px] sm:text-xs font-mono tracking-tight font-black', color.text)}>
                                  {rating > 0 ? rating.toFixed(1) : '—'}
                                </span>

                                {/* Watched subtle checkmark indicator */}
                                {isWatched && (
                                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                                    <Check className="w-2.5 h-2.5 stroke-[4]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SeriesGraph Rating Legend Bar */}
          <div className="p-3 sm:p-4 rounded-xl bg-[#11131c] border border-white/5 space-y-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>SeriesGraph Rating Legend:</span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#1da1f2] border border-black/30 shadow-sm shrink-0" />
                <span>≥9.7 Cinema</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#186a3b] border border-black/30 shadow-sm shrink-0" />
                <span>9.0-9.6 Awesome</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#28b463] border border-black/30 shadow-sm shrink-0" />
                <span>8.0-8.9 Great</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#f4d03f] border border-black/30 shadow-sm shrink-0" />
                <span>7.0-7.9 Good</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#f39c12] border border-black/30 shadow-sm shrink-0" />
                <span>6.0-6.9 Average</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#e74c3c] border border-black/30 shadow-sm shrink-0" />
                <span>5.0-5.9 Bad</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-3 h-3 rounded bg-[#633974] border border-black/30 shadow-sm shrink-0" />
                <span>&lt;5.0 Garbage</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SERIESGRAPH TREND LINE GRAPH */}
      {viewMode === 'graph' && (
        <div className="p-6 rounded-2xl bg-[#0e1017] border border-white/10 shadow-2xl">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Chronological Rating Trajectory</span>
          </h4>
          <p className="text-xs text-slate-400 mb-6">
            Episode-by-episode rating progression across all seasons.
          </p>

          {chronologicalEpisodes.length > 0 ? (
            <div className="space-y-4">
              {/* SVG Line Graph */}
              <div className="w-full h-64 relative bg-[#131520] rounded-xl border border-white/5 p-4 flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chronologicalEpisodes.length * 24} 200`}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#28b463" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#28b463" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline lines for 10, 8, 6 */}
                  <line x1="0" y1="20" x2={chronologicalEpisodes.length * 24} y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                  <line x1="0" y1="80" x2={chronologicalEpisodes.length * 24} y2="80" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                  <line x1="0" y1="140" x2={chronologicalEpisodes.length * 24} y2="140" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

                  {/* Area fill */}
                  <path
                    d={`M 12 190 ${chronologicalEpisodes
                      .map((item, i) => {
                        const x = 12 + i * 24;
                        // Map rating 5..10 to 190..10
                        const y = Math.max(10, Math.min(190, 190 - ((item.rating - 5) / 5) * 180));
                        return `L ${x} ${y}`;
                      })
                      .join(' ')} L ${12 + (chronologicalEpisodes.length - 1) * 24} 190 Z`}
                    fill="url(#trendGradient)"
                  />

                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="#28b463"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chronologicalEpisodes
                      .map((item, i) => {
                        const x = 12 + i * 24;
                        const y = Math.max(10, Math.min(190, 190 - ((item.rating - 5) / 5) * 180));
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Episode Dots */}
                  {chronologicalEpisodes.map((item, i) => {
                    const x = 12 + i * 24;
                    const y = Math.max(10, Math.min(190, 190 - ((item.rating - 5) / 5) * 180));
                    const color = getSeriesGraphColor(item.rating);

                    return (
                      <circle
                        key={item.episode.id}
                        cx={x}
                        cy={y}
                        r="4"
                        fill={color.hex}
                        stroke="#0e1017"
                        strokeWidth="1.5"
                        className="cursor-pointer hover:r-6 transition-all"
                        onClick={() => setActiveEpisode(item.episode)}
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Start: S1E1</span>
                <span>Ratings range (5.0 — 10.0)</span>
                <span>End: S{chronologicalEpisodes[chronologicalEpisodes.length - 1].season}E{chronologicalEpisodes[chronologicalEpisodes.length - 1].episode.episode_number}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No episode rating data available for trend graph.</p>
          )}
        </div>
      )}

      {/* VIEW 3: TRADITIONAL LIST VIEW WITH SEASON SELECTOR */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Select Season:</span>
              <select
                value={selectedSeasonForList}
                onChange={(e) => setSelectedSeasonForList(Number(e.target.value))}
                className="bg-[#181a24] text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {targetSeasons.map((s) => (
                  <option key={s.id} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`}
                  </option>
                ))}
              </select>
            </div>

            {libraryItemId && (
              <button
                onClick={() => toggleSeason(selectedSeasonForList)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border',
                  (allSeasonEpisodes[selectedSeasonForList] || []).length > 0 &&
                  (allSeasonEpisodes[selectedSeasonForList] || []).every((ep) => watchedSet.has(`s${selectedSeasonForList}_e${ep.episode_number}`))
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                )}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  {(allSeasonEpisodes[selectedSeasonForList] || []).length > 0 &&
                  (allSeasonEpisodes[selectedSeasonForList] || []).every((ep) => watchedSet.has(`s${selectedSeasonForList}_e${ep.episode_number}`))
                    ? 'Unmark Season'
                    : 'Mark Entire Season Watched'}
                </span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {(allSeasonEpisodes[selectedSeasonForList] || []).map((ep) => {
              const isWatched = watchedSet.has(`s${selectedSeasonForList}_e${ep.episode_number}`);
              const rating = ep.vote_average || 0;
              const color = getSeriesGraphColor(rating);

              return (
                <div
                  key={ep.id}
                  onClick={() => setActiveEpisode(ep)}
                  className={cn(
                    'flex items-center justify-between p-3.5 rounded-xl border transition-all text-xs cursor-pointer',
                    isWatched
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                      : 'bg-[#10121a] hover:bg-white/5 border-white/5 text-slate-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {libraryItemId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEpisode(selectedSeasonForList, ep.episode_number);
                        }}
                        className={cn(
                          'w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer',
                          isWatched
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-white/20 text-transparent hover:border-white/40'
                        )}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">{ep.episode_number}.</span>
                        <span className="font-semibold text-white">{ep.name}</span>
                      </div>
                      {ep.air_date && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ep.air_date} {ep.runtime ? `• ${ep.runtime} min` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-md font-mono text-xs font-black shadow-sm border border-black/30',
                      color.bg,
                      color.text
                    )}
                  >
                    ★ {rating ? rating.toFixed(1) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EPISODE INSPECTOR MODAL (POPUP ON CELL CLICK) */}
      {activeEpisode && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl bg-[#141624] border-t sm:border border-white/15 overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200 flex flex-col">
            {/* Scrollable content container */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {/* Still image header */}
              {activeEpisode.still_path && (
                <div className="relative aspect-video w-full bg-[#1c1f2e] shrink-0">
                  <img
                    src={getImageUrl(activeEpisode.still_path, 'w500') || ''}
                    alt={activeEpisode.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141624] via-transparent to-black/40" />
                  <button
                    onClick={() => setActiveEpisode(null)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="p-5 sm:p-6">
                {!activeEpisode.still_path && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400">Episode Details</span>
                    <button
                      onClick={() => setActiveEpisode(null)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[11px] font-bold uppercase">
                    S{activeEpisode.season_number} E{activeEpisode.episode_number}
                  </span>

                  {activeEpisode.vote_average ? (
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded font-mono text-[11px] font-black shadow-sm border border-black/30',
                        getSeriesGraphColor(activeEpisode.vote_average).bg,
                        getSeriesGraphColor(activeEpisode.vote_average).text
                      )}
                    >
                      ★ {activeEpisode.vote_average.toFixed(1)} / 10 ({getSeriesGraphColor(activeEpisode.vote_average).label})
                    </span>
                  ) : null}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{activeEpisode.name}</h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mb-4">
                  {activeEpisode.air_date && <span>Aired: {activeEpisode.air_date}</span>}
                  {activeEpisode.runtime && <span>• {activeEpisode.runtime} mins</span>}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                  {activeEpisode.overview || 'No synopsis provided for this episode.'}
                </p>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-[#121420] shrink-0 flex items-center justify-between gap-3">
              {libraryItemId ? (
                <button
                  onClick={() => {
                    toggleEpisode(activeEpisode.season_number, activeEpisode.episode_number);
                  }}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                    watchedSet.has(`s${activeEpisode.season_number}_e${activeEpisode.episode_number}`)
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  )}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {watchedSet.has(`s${activeEpisode.season_number}_e${activeEpisode.episode_number}`)
                      ? 'Watched ✓'
                      : 'Mark as Watched'}
                  </span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Add series to your library to track progress.
                </span>
              )}

              <button
                onClick={() => setActiveEpisode(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
