'use client';

import React, { useState, useEffect } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { tmdbService, TMDBMediaItem } from '@/lib/metadata/tmdb';
import { HeroBanner } from '@/components/media/HeroBanner';
import { MediaRow } from '@/components/media/MediaRow';
import { MediaCard } from '@/components/media/MediaCard';
import { EmptyState } from '@/components/library/EmptyState';
import { Compass, PlayCircle, History, Sparkles, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const { libraryItems, isLoading: isLibraryLoading } = useLibrary();

  const [trendingMovies, setTrendingMovies] = useState<TMDBMediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<TMDBMediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMediaItem[]>([]);
  const [popularTv, setPopularTv] = useState<TMDBMediaItem[]>([]);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // 1. Personal Library: Strictly actual watching items
  const continueWatchingItems = libraryItems
    .filter((item) => item.status === 'watching')
    .slice(0, 10);

  // 2. Personal Library: Strictly actual recent activity
  const recentActivityItems = [...libraryItems]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  useEffect(() => {
    let isMounted = true;

    async function loadDiscoveryFeeds() {
      try {
        setIsDiscoveryLoading(true);
        setDiscoveryError(null);

        const [tMovies, tTv, pMovies, pTv] = await Promise.all([
          tmdbService.getTrending('movie', 'week').catch(() => []),
          tmdbService.getTrending('tv', 'week').catch(() => []),
          tmdbService.getPopular('movie').catch(() => []),
          tmdbService.getPopular('tv').catch(() => []),
        ]);

        if (isMounted) {
          setTrendingMovies(tMovies as TMDBMediaItem[]);
          setTrendingTv(tTv as TMDBMediaItem[]);
          setPopularMovies(pMovies as TMDBMediaItem[]);
          setPopularTv(pTv as TMDBMediaItem[]);
        }
      } catch (err: any) {
        if (isMounted) {
          setDiscoveryError(err.message || 'Could not load discovery feeds');
        }
      } finally {
        if (isMounted) setIsDiscoveryLoading(false);
      }
    }

    loadDiscoveryFeeds();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroItem = trendingMovies[0] || trendingTv[0] || null;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <HeroBanner item={heroItem} />

      {/* SECTION 1: Continue Watching (Strictly Real Personal Data) */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">Continue Watching</h2>
          <span className="text-xs font-mono text-slate-400 ml-1">({continueWatchingItems.length})</span>
        </div>

        {continueWatchingItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {continueWatchingItems.map((item) => (
              <MediaCard
                key={item.id}
                id={item.tmdb_id}
                title={item.title}
                mediaType={item.media_type}
                posterPath={item.poster_path}
                releaseDate={item.release_date}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#11131c]/60 border border-white/5 text-center">
            <p className="text-sm font-semibold text-slate-300">Nothing currently in progress</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When you add a movie or series and set its status to &quot;Watching&quot;, it will appear here for quick access.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 2: My Recent Activity (Strictly Real Personal Data) */}
      {recentActivityItems.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">My Recent Activity</h2>
            <span className="text-xs font-mono text-slate-400 ml-1">({recentActivityItems.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentActivityItems.map((item) => (
              <MediaCard
                key={item.id}
                id={item.tmdb_id}
                title={item.title}
                mediaType={item.media_type}
                posterPath={item.poster_path}
                releaseDate={item.release_date}
              />
            ))}
          </div>
        </section>
      )}

      {/* Discovery Error Notice (if offline and no cache yet) */}
      {discoveryError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Discovery content is unavailable offline. Your personal library remains fully accessible.
          </span>
        </div>
      )}

      {/* SECTION 3: Trending Movies */}
      <MediaRow
        title="Trending Movies"
        subtitle="The most popular motion pictures this week"
        items={trendingMovies.map((m) => ({
          id: m.id,
          title: m.title || 'Untitled',
          mediaType: 'movie',
          posterPath: m.poster_path,
          releaseDate: m.release_date,
          voteAverage: m.vote_average,
        }))}
      />

      {/* SECTION 4: Trending Series */}
      <MediaRow
        title="Trending Series"
        subtitle="Binge-worthy shows and series trending now"
        items={trendingTv.map((s) => ({
          id: s.id,
          title: s.name || 'Untitled',
          mediaType: 'tv',
          posterPath: s.poster_path,
          releaseDate: s.first_air_date,
          voteAverage: s.vote_average,
        }))}
      />

      {/* SECTION 5: Popular Movies */}
      <MediaRow
        title="Popular Movies"
        subtitle="Highest-rated and widely watched films"
        items={popularMovies.map((m) => ({
          id: m.id,
          title: m.title || 'Untitled',
          mediaType: 'movie',
          posterPath: m.poster_path,
          releaseDate: m.release_date,
          voteAverage: m.vote_average,
        }))}
      />

      {/* SECTION 6: Popular Series */}
      <MediaRow
        title="Popular Series"
        subtitle="Acclaimed television and streaming productions"
        items={popularTv.map((s) => ({
          id: s.id,
          title: s.name || 'Untitled',
          mediaType: 'tv',
          posterPath: s.poster_path,
          releaseDate: s.first_air_date,
          voteAverage: s.vote_average,
        }))}
      />

      {/* SECTION 7: Recommended / Discover Architecture Ready */}
      <section className="p-8 rounded-2xl bg-gradient-to-r from-red-950/20 via-[#10121a] to-[#12141f] border border-white/5 text-center">
        <Sparkles className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Tailored Recommendations</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          As you track more movies and series in your personal library, WatchVault builds your taste profile to suggest curated recommendations.
        </p>
      </section>
    </div>
  );
}
