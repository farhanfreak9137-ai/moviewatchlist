'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/hooks/useLibrary';
import { tmdbService, TMDBMediaItem } from '@/lib/metadata/tmdb';
import { getContentPreferences, POPULAR_GENRES, DEFAULT_PREFERENCES } from '@/lib/preferences/contentPreferences';
import { ContentPreferences, MediaType } from '@/lib/types';
import { HeroBanner } from '@/components/media/HeroBanner';
import { MediaRow } from '@/components/media/MediaRow';
import { MediaCard } from '@/components/media/MediaCard';
import { EmptyState } from '@/components/library/EmptyState';
import {
  Compass,
  PlayCircle,
  History,
  Sparkles,
  AlertCircle,
  SlidersHorizontal,
  Film,
  Tv,
} from 'lucide-react';

interface TailoredGenreRow {
  genreId: number;
  genreName: string;
  mediaType: MediaType;
  items: TMDBMediaItem[];
}

export default function HomePage() {
  const { libraryItems, isLoading: isLibraryLoading } = useLibrary();

  const [preferences, setPreferences] = useState<ContentPreferences>(DEFAULT_PREFERENCES);
  const [trendingMovies, setTrendingMovies] = useState<TMDBMediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<TMDBMediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMediaItem[]>([]);
  const [popularTv, setPopularTv] = useState<TMDBMediaItem[]>([]);
  const [tailoredRows, setTailoredRows] = useState<TailoredGenreRow[]>([]);
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

  // Load preferences and discovery feeds
  useEffect(() => {
    let isMounted = true;

    async function loadFeedsAndPreferences() {
      try {
        setIsDiscoveryLoading(true);
        setDiscoveryError(null);

        // 1. Load preferences
        const prefs = await getContentPreferences();
        if (isMounted) setPreferences(prefs);

        // 2. Load standard trending and popular feeds
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

        // 3. Load Tailored Genre Rows based on favoriteGenres & mediaFocus
        const genresToLoad = (prefs.favoriteGenres || []).slice(0, 3);
        const rows: TailoredGenreRow[] = [];

        // Determine quality thresholds
        const minVoteAvg = prefs.qualityFilter === 'high_acclaim' ? 7.5 : prefs.qualityFilter === 'hidden_gems' ? 7.8 : undefined;
        const minVoteCount = prefs.qualityFilter === 'hidden_gems' ? 50 : 80;
        const yearGte = prefs.releaseWindow === 'recent' ? 2020 : undefined;
        const yearLte = prefs.releaseWindow === 'classics' ? 2005 : undefined;

        for (let i = 0; i < genresToLoad.length; i++) {
          const gId = genresToLoad[i];
          const genreDef = POPULAR_GENRES.find((g) => g.id === gId);
          if (!genreDef) continue;

          // Determine media type for this row based on user mediaFocus
          let rowMediaType: MediaType = 'movie';
          let withGenreId = genreDef.movieGenreId;

          if (prefs.mediaFocus === 'tv') {
            rowMediaType = 'tv';
            withGenreId = genreDef.tvGenreId;
          } else if (prefs.mediaFocus === 'movies') {
            rowMediaType = 'movie';
            withGenreId = genreDef.movieGenreId;
          } else {
            // Balanced: alternate between movies and tv
            if (i % 2 === 1) {
              rowMediaType = 'tv';
              withGenreId = genreDef.tvGenreId;
            } else {
              rowMediaType = 'movie';
              withGenreId = genreDef.movieGenreId;
            }
          }

          try {
            const items = await tmdbService.discoverMedia(rowMediaType, {
              withGenres: [withGenreId],
              minVoteAverage: minVoteAvg,
              minVoteCount,
              yearGte,
              yearLte,
              sortBy: prefs.qualityFilter === 'high_acclaim' ? 'vote_average.desc' : 'popularity.desc',
            });

            if (items.length > 0) {
              rows.push({
                genreId: gId,
                genreName: genreDef.name,
                mediaType: rowMediaType,
                items,
              });
            }
          } catch (e) {
            console.error(`Failed to fetch tailored row for genre ${genreDef.name}:`, e);
          }
        }

        if (isMounted) {
          setTailoredRows(rows);
        }
      } catch (err: any) {
        if (isMounted) {
          setDiscoveryError(err.message || 'Could not load discovery feeds');
        }
      } finally {
        if (isMounted) setIsDiscoveryLoading(false);
      }
    }

    loadFeedsAndPreferences();
    return () => {
      isMounted = false;
    };
  }, []);

  // Smart Hero Items: Top trending titles matching user preference or top trending
  const heroItems = useMemo(() => {
    const favoriteGenreSet = new Set(preferences.favoriteGenres || []);

    const matchesTaste = (item: TMDBMediaItem) => {
      if (!item.backdrop_path) return false;
      if (favoriteGenreSet.size === 0) return true;
      return item.genre_ids?.some((g) => favoriteGenreSet.has(g));
    };

    let pool: TMDBMediaItem[] = [];
    if (preferences.mediaFocus === 'tv') {
      pool = [...trendingTv, ...trendingMovies];
    } else if (preferences.mediaFocus === 'movies') {
      pool = [...trendingMovies, ...trendingTv];
    } else {
      // Interleave movies & tv for balanced mix
      const maxLen = Math.max(trendingMovies.length, trendingTv.length);
      for (let i = 0; i < maxLen; i++) {
        if (trendingMovies[i]) pool.push(trendingMovies[i]);
        if (trendingTv[i]) pool.push(trendingTv[i]);
      }
    }

    // Filter items with backdrops, prioritizing taste matches
    const tasteMatches = pool.filter((it) => it.backdrop_path && matchesTaste(it));
    const otherMatches = pool.filter((it) => it.backdrop_path && !matchesTaste(it));
    const combined = [...tasteMatches, ...otherMatches];

    // Take top 6 unique items
    const seen = new Set<number>();
    const unique: TMDBMediaItem[] = [];
    for (const it of combined) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        unique.push(it);
        if (unique.length >= 6) break;
      }
    }

    return unique;
  }, [trendingMovies, trendingTv, preferences]);

  // Names of selected favorite genres for display in taste badge
  const favoriteGenreNames = useMemo(() => {
    return (preferences.favoriteGenres || [])
      .map((id) => POPULAR_GENRES.find((g) => g.id === id)?.name)
      .filter(Boolean) as string[];
  }, [preferences.favoriteGenres]);

  // Standard row builders
  const trendingMoviesRow = (
    <MediaRow
      key="trending-movies"
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
  );

  const trendingTvRow = (
    <MediaRow
      key="trending-tv"
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
  );

  const popularMoviesRow = (
    <MediaRow
      key="popular-movies"
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
  );

  const popularTvRow = (
    <MediaRow
      key="popular-tv"
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
  );

  // Smartly rearrange standard rows based on user mediaFocus
  const arrangedStandardRows = useMemo(() => {
    if (preferences.mediaFocus === 'tv') {
      return [trendingTvRow, popularTvRow, trendingMoviesRow, popularMoviesRow];
    }
    if (preferences.mediaFocus === 'movies') {
      return [trendingMoviesRow, popularMoviesRow, trendingTvRow, popularTvRow];
    }
    // Balanced
    return [trendingMoviesRow, trendingTvRow, popularMoviesRow, popularTvRow];
  }, [preferences.mediaFocus, trendingMovies, trendingTv, popularMovies, popularTv]);

  return (
    <div className="space-y-6">
      {/* Hero Banner (Auto-rotating top trending titles) */}
      <HeroBanner items={heroItems} />

      {/* Smart Arrangement Taste Indicator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#11131c]/80 border border-white/5 text-xs shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="p-1.5 rounded-lg bg-red-600/15 text-red-500 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-400 font-medium">Smart Discover: </span>
            <strong className="text-white capitalize">
              {preferences.mediaFocus === 'tv'
                ? 'TV Series Focus'
                : preferences.mediaFocus === 'movies'
                ? 'Movies Focus'
                : 'Balanced Mix'}
            </strong>
            {favoriteGenreNames.length > 0 && (
              <span className="hidden sm:inline">
                {' '}
                • Curated for:{' '}
                <span className="text-slate-200 font-semibold">{favoriteGenreNames.join(', ')}</span>
              </span>
            )}
            {preferences.qualityFilter === 'high_acclaim' && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono text-[10px] font-bold">
                ★ 7.5+ Acclaimed
              </span>
            )}
            {preferences.qualityFilter === 'hidden_gems' && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-mono text-[10px] font-bold">
                ✦ Hidden Gems
              </span>
            )}
          </div>
        </div>

        <Link
          href="/settings"
          className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-auto"
        >
          <span>Adjust Preferences</span>
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </Link>
      </div>

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

      {/* SECTION 3: TAILORED GENRE ROWS (Generated from user's favoriteGenres & mediaFocus) */}
      {tailoredRows.map((row) => (
        <MediaRow
          key={`tailored-${row.genreId}-${row.mediaType}`}
          title={`Top ${row.genreName} for You`}
          subtitle={`Curated ${row.mediaType === 'tv' ? 'shows & series' : 'films'} tailored to your taste`}
          items={row.items.map((item) => ({
            id: item.id,
            title: item.title || item.name || 'Untitled',
            mediaType: row.mediaType,
            posterPath: item.poster_path,
            releaseDate: item.release_date || item.first_air_date,
            voteAverage: item.vote_average,
          }))}
        />
      ))}

      {/* SECTION 4+: SMARTLY ARRANGED STANDARD FEEDS (Media Focus Order) */}
      {arrangedStandardRows}

      {/* SECTION 5: Recommended / Taste Architecture Banner */}
      <section className="p-8 rounded-2xl bg-gradient-to-r from-red-950/20 via-[#10121a] to-[#12141f] border border-white/5 text-center">
        <Sparkles className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Tailored Discovery Active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          WatchVault combines your personal watch tracking with your custom settings preferences to curate your home page.
        </p>
      </section>
    </div>
  );
}
