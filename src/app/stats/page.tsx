'use client';

import React, { useMemo } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { EmptyState } from '@/components/library/EmptyState';
import {
  BarChart3,
  Film,
  Tv,
  Clock,
  Star,
  CheckCircle2,
  Award,
  Heart,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function StatsPage() {
  const { libraryItems, stats } = useLibrary();

  // 1. Genre distribution from actual user data
  const genreDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    libraryItems.forEach((item) => {
      item.genres?.forEach((genre) => {
        counts[genre] = (counts[genre] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [libraryItems]);

  // 2. Rating distribution (1 to 10)
  const ratingDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    libraryItems.forEach((item) => {
      if (item.rating >= 1 && item.rating <= 10) {
        counts[item.rating] = (counts[item.rating] || 0) + 1;
      }
    });
    return counts;
  }, [libraryItems]);

  // 3. Total rated count & high rated count
  const ratedCount = useMemo(() => {
    return libraryItems.filter((i) => i.rating > 0).length;
  }, [libraryItems]);

  const highRatedCount = useMemo(() => {
    return libraryItems.filter((i) => i.rating >= 8).length;
  }, [libraryItems]);

  // 4. Total watch time in hours and days
  const watchTimeHours = Math.round(stats.totalRuntimeMinutes / 60);
  const watchTimeDays = (stats.totalRuntimeMinutes / (60 * 24)).toFixed(1);

  // 5. Completion percentage
  const completionRate = stats.totalItems > 0
    ? Math.round((stats.completedCount / stats.totalItems) * 100)
    : 0;

  // 6. Media split percentage
  const moviePercentage = stats.totalItems > 0
    ? Math.round((stats.totalMovies / stats.totalItems) * 100)
    : 50;
  const seriesPercentage = stats.totalItems > 0
    ? 100 - moviePercentage
    : 50;

  if (libraryItems.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-red-500" />
            <span>Statistics & Insights</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Calculated strictly from your authentic personal library.
          </p>
        </div>
        <EmptyState
          type="stats"
          title="No watch statistics recorded yet"
          description="Your analytics, watch time, top genres, and rating curves will dynamically appear here as you log titles in your library."
        />
      </div>
    );
  }

  const maxGenreCount = genreDistribution[0]?.count || 1;
  const maxRatingCount = Math.max(...Object.values(ratingDistribution), 1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      {/* Header with Ambient Glow Banner */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-[0_0_20px_rgba(229,9,20,0.35)]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Vault Command Center
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time analytics computed strictly from your local offline library.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{stats.totalItems} Logged Items</span>
            </span>
          </div>
        </div>
      </div>

      {/* BENTO GRID COMMAND CENTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BENTO TILE 1: Watch Time Hero (Span 2 cols on lg) */}
        <div className="lg:col-span-2 bento-card rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between group">
          {/* Subtle Ambient Spill */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.25)]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Cumulative Runtime
                </span>
              </div>
              <span className="text-[11px] font-mono text-sky-400/90 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                Lifetime Log
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-sky-300 font-mono tracking-tight">
                {watchTimeHours}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-sky-400 font-sans">hours</span>
              <span className="text-xs text-slate-500 font-mono ml-auto">
                ≈ {watchTimeDays} continuous days
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/5 text-xs">
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Movie Equiv.</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                ≈ {Math.round(stats.totalRuntimeMinutes / 115)} full movies
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Binge Scale</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                ≈ {Math.round(stats.totalRuntimeMinutes / 540)} TV seasons
              </span>
            </div>
          </div>
        </div>

        {/* BENTO TILE 2: Completion Rate Ring Dial */}
        <div className="bento-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Completion Rate
              </span>
            </div>
          </div>

          {/* Radial Progress Ring */}
          <div className="my-auto py-3 flex items-center justify-center relative">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#emeraldGradient)"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRate / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white font-mono">{completionRate}%</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                Completed
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5 font-mono text-slate-400">
            <span>{stats.completedCount} finished</span>
            <span>{stats.watchingCount} in progress</span>
          </div>
        </div>

        {/* BENTO TILE 3: Curator Rating Index */}
        <div className="bento-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Average Rating
              </span>
            </div>
          </div>

          <div className="my-auto py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-300 font-mono golden-halo">
                {stats.averageRating}
              </span>
              <span className="text-sm text-slate-500 font-mono">/ 10</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Across <span className="text-slate-200 font-mono font-bold">{ratedCount}</span> evaluated titles
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5 text-slate-400">
            <span className="flex items-center gap-1 text-rose-400">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>{stats.favoritesCount} favorited</span>
            </span>
            <span className="font-mono text-amber-400/90">
              {highRatedCount} rated ≥ 8
            </span>
          </div>
        </div>

        {/* BENTO TILE 4: Entertainment Medium Split (Span 2 cols on md) */}
        <div className="md:col-span-2 bento-card rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Medium Balance
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {stats.totalMovies} Movies • {stats.totalSeries} Series
            </span>
          </div>

          {/* Segmented Visual Proportion Bar */}
          <div className="space-y-2">
            <div className="h-4 rounded-full bg-white/5 p-0.5 flex overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-l-full transition-all duration-700"
                style={{ width: `${moviePercentage}%` }}
                title={`Movies: ${moviePercentage}%`}
              />
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-r-full transition-all duration-700"
                style={{ width: `${seriesPercentage}%` }}
                title={`Series: ${seriesPercentage}%`}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-red-400" />
                  Movies ({moviePercentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Tv className="w-3.5 h-3.5 text-sky-400" />
                  Series ({seriesPercentage}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO TILE 5: Vault Status Lifecycle Quad */}
        <div className="md:col-span-2 bento-card rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Status Lifecycle
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">Current Distribution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Watching</span>
              <span className="text-2xl font-black text-white font-mono mt-1">{stats.watchingCount}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
              <span className="text-2xl font-black text-emerald-300 font-mono mt-1">{stats.completedCount}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Planned</span>
              <span className="text-2xl font-black text-white font-mono mt-1">{stats.plannedCount}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-500/10 border border-zinc-500/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dropped</span>
              <span className="text-2xl font-black text-zinc-300 font-mono mt-1">{stats.droppedCount}</span>
            </div>
          </div>
        </div>

        {/* BENTO TILE 6: Personal Rating Histogram (Span 2 cols on lg) */}
        <div className="lg:col-span-2 bento-card rounded-3xl p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Rating Curve & Distribution
                </h3>
                <p className="text-[11px] text-slate-400">Evaluations from 1 to 10</p>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {ratedCount} Rated
            </span>
          </div>

          {/* Equalizer Bars */}
          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-44 pt-4 border-b border-white/10 pb-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
              const count = ratingDistribution[score] || 0;
              const heightPercent = maxRatingCount > 0 ? Math.max((count / maxRatingCount) * 100, 4) : 4;

              // Color binning matching gemstone
              const barColor =
                score >= 9
                  ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 group-hover:from-emerald-400 group-hover:to-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : score >= 7
                  ? 'bg-gradient-to-t from-amber-500 to-yellow-300 group-hover:from-amber-400 group-hover:to-yellow-200'
                  : score >= 5
                  ? 'bg-gradient-to-t from-orange-500 to-amber-400 group-hover:from-orange-400 group-hover:to-amber-300'
                  : 'bg-gradient-to-t from-rose-600 to-red-400 group-hover:from-rose-500 group-hover:to-red-300';

              return (
                <div key={score} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors">
                    {count > 0 ? count : ''}
                  </span>
                  <div className="w-full bg-white/[0.04] rounded-t-xl overflow-hidden flex items-end h-full">
                    <div
                      className={cn(
                        'w-full rounded-t-xl transition-all duration-300',
                        count > 0 ? barColor : 'bg-transparent'
                      )}
                      style={{ height: `${count > 0 ? heightPercent : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-amber-400 transition-colors">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-3">
            <span>1 (Disaster)</span>
            <span>10 (Masterpiece)</span>
          </div>
        </div>

        {/* BENTO TILE 7: Top Genres Spectrum (Span 2 cols on lg) */}
        <div className="lg:col-span-2 bento-card rounded-3xl p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Top Genres in Vault
                </h3>
                <p className="text-[11px] text-slate-400">Most logged genres across your library</p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">Ranked</span>
          </div>

          {genreDistribution.length > 0 ? (
            <div className="space-y-3.5">
              {genreDistribution.map((g, idx) => {
                const percent = Math.round((g.count / maxGenreCount) * 100);
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={g.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{medals[idx] || '•'}</span>
                        <span className="font-semibold text-slate-200">{g.name}</span>
                      </div>
                      <span className="font-mono text-slate-400">{g.count} titles</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No genre data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
