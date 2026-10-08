'use client';

import React, { useMemo } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { EmptyState } from '@/components/library/EmptyState';
import {
  BarChart3,
  Film,
  Clock,
  Star,
  CheckCircle2,
  Award,
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

  // 3. Total watch time in hours and days
  const watchTimeHours = Math.round(stats.totalRuntimeMinutes / 60);
  const watchTimeDays = (stats.totalRuntimeMinutes / (60 * 24)).toFixed(1);

  if (libraryItems.length === 0) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-red-500" />
          <span>Statistics & Insights</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Calculated strictly from your authentic personal library • 100% offline
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Titles */}
        <div className="p-5 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Titles</span>
            <Film className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{stats.totalItems}</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>{stats.totalMovies} movies</span>
            <span>•</span>
            <span>{stats.totalSeries} series</span>
          </div>
        </div>

        {/* Watch Time */}
        <div className="p-5 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Watch Time</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{watchTimeHours}h</div>
          <div className="text-xs text-slate-400 mt-2">
            ≈ {watchTimeDays} days of runtime
          </div>
        </div>

        {/* Completed */}
        <div className="p-5 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{stats.completedCount}</div>
          <div className="text-xs text-slate-400 mt-2">
            {stats.watchingCount} currently watching
          </div>
        </div>

        {/* Average Rating */}
        <div className="p-5 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Average Rating</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {stats.averageRating} <span className="text-xs text-slate-500 font-normal">/ 10</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {stats.favoritesCount} favorited titles
          </div>
        </div>
      </div>

      {/* Two Column Section: Top Genres & Rating Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Genres */}
        <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-red-500" />
            <span>Top Genres in Vault</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">Based on genres of your added titles</p>

          {genreDistribution.length > 0 ? (
            <div className="space-y-4">
              {genreDistribution.map((g) => {
                const percent = Math.round((g.count / maxGenreCount) * 100);
                return (
                  <div key={g.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{g.name}</span>
                      <span className="font-mono text-slate-400">{g.count} titles</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No genre data available yet.</p>
          )}
        </div>

        {/* Personal Rating Distribution */}
        <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Personal Rating Distribution</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">Distribution of your ratings from 1 to 10</p>

          <div className="flex items-end justify-between gap-2 h-44 pt-4 border-b border-white/10 pb-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
              const count = ratingDistribution[score] || 0;
              const heightPercent = maxRatingCount > 0 ? Math.max((count / maxRatingCount) * 100, 4) : 4;

              return (
                <div key={score} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-amber-400">
                    {count > 0 ? count : ''}
                  </span>
                  <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex items-end h-full">
                    <div
                      className={cn(
                        'w-full rounded-t-lg transition-all duration-300',
                        count > 0 ? 'bg-amber-400/90 group-hover:bg-amber-300' : 'bg-transparent'
                      )}
                      style={{ height: `${count > 0 ? heightPercent : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-white">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Watch Status Breakdown */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">Library Status Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/15">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">Watching</div>
            <div className="text-2xl font-black text-white font-mono">{stats.watchingCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Completed</div>
            <div className="text-2xl font-black text-white font-mono">{stats.completedCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Planned</div>
            <div className="text-2xl font-black text-white font-mono">{stats.plannedCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-500/5 border border-zinc-500/15">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Dropped</div>
            <div className="text-2xl font-black text-white font-mono">{stats.droppedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
