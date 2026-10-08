'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/hooks/useLibrary';
import { tmdbService, TMDBMediaItem } from '@/lib/metadata/tmdb';
import { getContentPreferences, POPULAR_GENRES, DEFAULT_PREFERENCES } from '@/lib/preferences/contentPreferences';
import { ContentPreferences, MediaType, LibraryItem } from '@/lib/types';
import { HeroBanner } from '@/components/media/HeroBanner';
import { MediaRow } from '@/components/media/MediaRow';
import { MediaCard } from '@/components/media/MediaCard';
import {
  PlayCircle,
  History,
  Sparkles,
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  Film,
  Tv,
  Flame,
  Trophy,
  DollarSign,
  Globe,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TailoredGenreRow {
  genreId: number;
  genreName: string;
  mediaType: MediaType;
  items: TMDBMediaItem[];
}

type DiscoverHub = 'all' | 'hindi' | 'english' | 'tv';

interface CachedDiscoveryData {
  preferences: ContentPreferences;
  activeHub: DiscoverHub;
  trendingMovies: TMDBMediaItem[];
  trendingTv: TMDBMediaItem[];
  popularMovies: TMDBMediaItem[];
  popularTv: TMDBMediaItem[];
  trendingHindiMovies: TMDBMediaItem[];
  popularHindiMovies: TMDBMediaItem[];
  highestGrossingHindi: TMDBMediaItem[];
  trendingHindiTv: TMDBMediaItem[];
  popularHindiTv: TMDBMediaItem[];
  highestGrossingEnglish: TMDBMediaItem[];
  popularEnglishMovies: TMDBMediaItem[];
  popularEnglishTv: TMDBMediaItem[];
  tailoredRows: TailoredGenreRow[];
  timestamp: number;
}

let cachedDiscoveryFeeds: CachedDiscoveryData | null = null;

async function generatePersonalizedRecommendations(
  library: LibraryItem[],
  prefs: ContentPreferences,
  hub: DiscoverHub = 'all'
): Promise<{ items: TMDBMediaItem[]; subtitle: string }> {
  // 1. Identify high-interest seeds from personal vault
  const highInterest = library.filter((i) => i.is_favorite || i.rating >= 7 || i.status === 'completed');
  const inProgressOrPlanned = library.filter((i) => i.status === 'watching' || i.status === 'planned');
  const candidates = highInterest.length > 0 ? highInterest : inProgressOrPlanned;

  if (candidates.length > 0) {
    const shuffledSeeds = [...candidates].sort(() => 0.5 - Math.random());
    const seeds = shuffledSeeds.slice(0, 2);

    try {
      const recs = await tmdbService.getRecommendationsForSeeds(
        seeds.map((s) => ({ id: s.tmdb_id, mediaType: s.media_type })),
        20
      );

      if (recs && recs.length >= 4) {
        const subtitle =
          seeds.length === 1
            ? `Because you watched "${seeds[0].title}"`
            : `Inspired by "${seeds[0].title}" & "${seeds[1].title}"`;
        return { items: recs, subtitle };
      }
    } catch (e) {
      console.warn('Failed to fetch seed recommendations:', e);
    }
  }

  // 2. Fallback: Rotating high-acclaim discovery across pages 1 to 4 so it changes every time
  const randomPage = Math.floor(Math.random() * 4) + 1;
  const targetMediaType: MediaType =
    hub === 'tv' ? 'tv' : prefs.mediaFocus === 'tv' ? 'tv' : 'movie';

  try {
    const items = await tmdbService.discoverMedia(targetMediaType, {
      minVoteAverage: 7.5,
      minVoteCount: 100,
      sortBy: 'popularity.desc',
      page: randomPage,
    });
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return {
      items: shuffled,
      subtitle: 'Fresh acclaimed picks for you • Refreshes on every visit',
    };
  } catch {
    return {
      items: [],
      subtitle: 'Personalized recommendations',
    };
  }
}

export default function HomePage() {
  const { libraryItems, isLoading: isLibraryLoading } = useLibrary();

  const [preferences, setPreferences] = useState<ContentPreferences>(
    () => cachedDiscoveryFeeds?.preferences || DEFAULT_PREFERENCES
  );
  const [activeHub, setActiveHub] = useState<DiscoverHub>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('watchvault_discovery_hub');
      if (saved) return saved as DiscoverHub;
    }
    return cachedDiscoveryFeeds?.activeHub || 'all';
  });

  // Dynamic recommendations state (refreshes and shuffles on every visit)
  const [recommendedItems, setRecommendedItems] = useState<TMDBMediaItem[]>([]);
  const [recommendationSubtitle, setRecommendationSubtitle] = useState<string>(
    'Curated fresh picks for you • Refreshes on every visit'
  );
  const [isShufflingRecs, setIsShufflingRecs] = useState<boolean>(false);

  // Standard Feeds
  const [trendingMovies, setTrendingMovies] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.trendingMovies || []
  );
  const [trendingTv, setTrendingTv] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.trendingTv || []
  );
  const [popularMovies, setPopularMovies] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.popularMovies || []
  );
  const [popularTv, setPopularTv] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.popularTv || []
  );

  // Hindi / Bollywood Feeds
  const [trendingHindiMovies, setTrendingHindiMovies] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.trendingHindiMovies || []
  );
  const [popularHindiMovies, setPopularHindiMovies] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.popularHindiMovies || []
  );
  const [highestGrossingHindi, setHighestGrossingHindi] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.highestGrossingHindi || []
  );
  const [trendingHindiTv, setTrendingHindiTv] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.trendingHindiTv || []
  );
  const [popularHindiTv, setPopularHindiTv] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.popularHindiTv || []
  );

  // English Specialized Feeds
  const [highestGrossingEnglish, setHighestGrossingEnglish] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.highestGrossingEnglish || []
  );
  const [popularEnglishMovies, setPopularEnglishMovies] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.popularEnglishMovies || []
  );
  const [popularEnglishTv, setPopularEnglishTv] = useState<TMDBMediaItem[]>(
    () => cachedDiscoveryFeeds?.popularEnglishTv || []
  );

  const [tailoredRows, setTailoredRows] = useState<TailoredGenreRow[]>(
    () => cachedDiscoveryFeeds?.tailoredRows || []
  );
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(
    () => !cachedDiscoveryFeeds || cachedDiscoveryFeeds.trendingMovies.length === 0
  );
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const handleShuffleRecommendations = useCallback(async () => {
    if (isShufflingRecs) return;
    setIsShufflingRecs(true);
    try {
      const res = await generatePersonalizedRecommendations(libraryItems, preferences, activeHub);
      setRecommendedItems(res.items);
      setRecommendationSubtitle(res.subtitle);
    } catch (err) {
      console.error('Failed to shuffle recommendations:', err);
    } finally {
      setIsShufflingRecs(false);
    }
  }, [isShufflingRecs, libraryItems, preferences, activeHub]);

  // 1. Personal Library: Strictly actual watching items
  const continueWatchingItems = libraryItems
    .filter((item) => item.status === 'watching')
    .slice(0, 10);

  const handleHubChange = (hub: DiscoverHub) => {
    setActiveHub(hub);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('watchvault_discovery_hub', hub);
    }
  };

  // Restore scroll position when returning from title page
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedY = sessionStorage.getItem('watchvault_discovery_scroll');
        if (savedY) {
          const y = parseInt(savedY, 10);
          if (!isNaN(y) && y > 0) {
            window.scrollTo({ top: y, behavior: 'instant' });
            const t1 = setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 40);
            const t2 = setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 120);
            return () => {
              clearTimeout(t1);
              clearTimeout(t2);
            };
          }
        }
      }
    } catch {}
  }, [isDiscoveryLoading]);

  // Continuously track scroll position on the Discovery page
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.scrollY > 0) {
          sessionStorage.setItem('watchvault_discovery_scroll', window.scrollY.toString());
        }
      }, 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Load preferences and discovery feeds
  useEffect(() => {
    let isMounted = true;

    async function loadFeedsAndPreferences() {
      try {
        if (!cachedDiscoveryFeeds) {
          setIsDiscoveryLoading(true);
        }
        setDiscoveryError(null);

        // 1. Load preferences
        const prefs = await getContentPreferences();
        if (isMounted) setPreferences(prefs);

        // 2. Fetch all feeds concurrently with local caching
        const [
          tMovies,
          tTv,
          pMovies,
          pTv,
          hiTrendM,
          hiPopM,
          hiGrossM,
          hiTrendT,
          hiPopT,
          enGrossM,
          enPopM,
          enPopT,
        ] = await Promise.all([
          tmdbService.getTrending('movie', 'week').catch(() => []),
          tmdbService.getTrending('tv', 'week').catch(() => []),
          tmdbService.getPopular('movie').catch(() => []),
          tmdbService.getPopular('tv').catch(() => []),
          tmdbService.getTrendingHindi('movie').catch(() => []),
          tmdbService.getMostPopularHindi('movie').catch(() => []),
          tmdbService.getHighestGrossing('hi').catch(() => []),
          tmdbService.getTrendingHindi('tv').catch(() => []),
          tmdbService.getMostPopularHindi('tv').catch(() => []),
          tmdbService.getHighestGrossing('en').catch(() => []),
          tmdbService.getMostPopularEnglish('movie').catch(() => []),
          tmdbService.getMostPopularEnglish('tv').catch(() => []),
        ]);

        if (isMounted) {
          setTrendingMovies(tMovies as TMDBMediaItem[]);
          setTrendingTv(tTv as TMDBMediaItem[]);
          setPopularMovies(pMovies as TMDBMediaItem[]);
          setPopularTv(pTv as TMDBMediaItem[]);

          setTrendingHindiMovies(hiTrendM as TMDBMediaItem[]);
          setPopularHindiMovies(hiPopM as TMDBMediaItem[]);
          setHighestGrossingHindi(hiGrossM as TMDBMediaItem[]);
          setTrendingHindiTv(hiTrendT as TMDBMediaItem[]);
          setPopularHindiTv(hiPopT as TMDBMediaItem[]);

          setHighestGrossingEnglish(enGrossM as TMDBMediaItem[]);
          setPopularEnglishMovies(enPopM as TMDBMediaItem[]);
          setPopularEnglishTv(enPopT as TMDBMediaItem[]);
        }

        // 3. Load Tailored Genre Rows based on favoriteGenres & mediaFocus
        const genresToLoad = (prefs.favoriteGenres || []).slice(0, 3);
        const rows: TailoredGenreRow[] = [];

        const minVoteAvg =
          prefs.qualityFilter === 'high_acclaim' ? 7.5 : prefs.qualityFilter === 'hidden_gems' ? 7.8 : undefined;
        const minVoteCount = prefs.qualityFilter === 'hidden_gems' ? 50 : 80;
        const yearGte = prefs.releaseWindow === 'recent' ? 2020 : undefined;
        const yearLte = prefs.releaseWindow === 'classics' ? 2005 : undefined;

        for (let i = 0; i < genresToLoad.length; i++) {
          const gId = genresToLoad[i];
          const genreDef = POPULAR_GENRES.find((g) => g.id === gId);
          if (!genreDef) continue;

          let rowMediaType: MediaType = 'movie';
          let withGenreId = genreDef.movieGenreId;

          if (prefs.mediaFocus === 'tv') {
            rowMediaType = 'tv';
            withGenreId = genreDef.tvGenreId;
          } else if (prefs.mediaFocus === 'movies') {
            rowMediaType = 'movie';
            withGenreId = genreDef.movieGenreId;
          } else {
            if (i % 2 === 1) {
              rowMediaType = 'tv';
              withGenreId = genreDef.tvGenreId;
            } else {
              rowMediaType = 'movie';
              withGenreId = genreDef.movieGenreId;
            }
          }

          try {
            // Randomize page between 1 and 3 so tailored rows rotate fresh titles on refresh
            const randomPage = Math.floor(Math.random() * 3) + 1;
            const items = await tmdbService.discoverMedia(rowMediaType, {
              withGenres: [withGenreId],
              minVoteAverage: minVoteAvg,
              minVoteCount,
              yearGte,
              yearLte,
              sortBy: prefs.qualityFilter === 'high_acclaim' ? 'vote_average.desc' : 'popularity.desc',
              page: randomPage,
            });

            if (items.length > 0) {
              const shuffled = [...items].sort(() => 0.5 - Math.random());
              rows.push({
                genreId: gId,
                genreName: genreDef.name,
                mediaType: rowMediaType,
                items: shuffled,
              });
            }
          } catch (e) {
            console.error(`Failed to fetch tailored row for genre ${genreDef.name}:`, e);
          }
        }

        // 4. Generate dynamic personalized recommendations (refreshes on every load)
        const recsResult = await generatePersonalizedRecommendations(libraryItems, prefs, activeHub);

        if (isMounted) {
          setTailoredRows(rows);
          setRecommendedItems(recsResult.items);
          setRecommendationSubtitle(recsResult.subtitle);

          cachedDiscoveryFeeds = {
            preferences: prefs,
            activeHub,
            trendingMovies: tMovies as TMDBMediaItem[],
            trendingTv: tTv as TMDBMediaItem[],
            popularMovies: pMovies as TMDBMediaItem[],
            popularTv: pTv as TMDBMediaItem[],
            trendingHindiMovies: hiTrendM as TMDBMediaItem[],
            popularHindiMovies: hiPopM as TMDBMediaItem[],
            highestGrossingHindi: hiGrossM as TMDBMediaItem[],
            trendingHindiTv: hiTrendT as TMDBMediaItem[],
            popularHindiTv: hiPopT as TMDBMediaItem[],
            highestGrossingEnglish: enGrossM as TMDBMediaItem[],
            popularEnglishMovies: enPopM as TMDBMediaItem[],
            popularEnglishTv: enPopT as TMDBMediaItem[],
            tailoredRows: rows,
            timestamp: Date.now(),
          };
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

  // Update recommendations whenever library items become available
  useEffect(() => {
    if (!isLibraryLoading && libraryItems.length > 0) {
      generatePersonalizedRecommendations(libraryItems, preferences, activeHub).then((res) => {
        if (res.items.length > 0) {
          setRecommendedItems(res.items);
          setRecommendationSubtitle(res.subtitle);
        }
      });
    }
  }, [isLibraryLoading, libraryItems.length, activeHub]);

  // Smart Hero Items: dynamically adjusted based on activeHub, recommendations, and fresh spotlight
  const heroItems = useMemo(() => {
    let pool: TMDBMediaItem[] = [];

    if (activeHub === 'hindi') {
      pool = [...trendingHindiMovies, ...trendingHindiTv, ...popularHindiMovies];
    } else if (activeHub === 'english') {
      pool = [...trendingMovies, ...highestGrossingEnglish, ...trendingTv];
    } else if (activeHub === 'tv') {
      pool = [...trendingTv, ...popularHindiTv, ...popularEnglishTv];
    } else {
      // Balanced mix including fresh recommendations
      const mixLen = Math.max(trendingMovies.length, trendingHindiMovies.length, trendingTv.length, recommendedItems.length);
      for (let i = 0; i < mixLen; i++) {
        if (recommendedItems[i]) pool.push(recommendedItems[i]);
        if (trendingMovies[i]) pool.push(trendingMovies[i]);
        if (trendingHindiMovies[i]) pool.push(trendingHindiMovies[i]);
        if (trendingTv[i]) pool.push(trendingTv[i]);
      }
    }

    const seen = new Set<number>();
    const unique: TMDBMediaItem[] = [];
    const startOffset = pool.length > 0 ? Math.floor(Math.random() * Math.min(pool.length, 3)) : 0;
    const reorderedPool = [...pool.slice(startOffset), ...pool.slice(0, startOffset)];

    for (const it of reorderedPool) {
      if (it.backdrop_path && !seen.has(it.id)) {
        seen.add(it.id);
        unique.push(it);
        if (unique.length >= 6) break;
      }
    }

    return unique.length > 0 ? unique : trendingMovies.slice(0, 5);
  }, [
    activeHub,
    recommendedItems,
    trendingMovies,
    trendingHindiMovies,
    trendingTv,
    popularHindiMovies,
    highestGrossingEnglish,
    popularHindiTv,
    popularEnglishTv,
  ]);

  const favoriteGenreNames = useMemo(() => {
    return (preferences.favoriteGenres || [])
      .map((id) => POPULAR_GENRES.find((g) => g.id === id)?.name)
      .filter(Boolean) as string[];
  }, [preferences.favoriteGenres]);

  // Helper row mapper
  const createRow = (
    key: string,
    title: string,
    subtitle: string,
    items: TMDBMediaItem[],
    mediaType: MediaType
  ) => (
    <MediaRow
      key={key}
      title={title}
      subtitle={subtitle}
      items={items.map((m) => ({
        id: m.id,
        title: m.title || m.name || 'Untitled',
        mediaType,
        posterPath: m.poster_path,
        releaseDate: m.release_date || m.first_air_date,
        voteAverage: m.vote_average,
      }))}
    />
  );

  return (
    <div
      className="space-y-6"
      onClickCapture={() => {
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('watchvault_discovery_scroll', window.scrollY.toString());
          }
        } catch {}
      }}
    >
      {/* Hero Banner (Auto-rotating top trending titles) */}
      <HeroBanner items={heroItems} />

      {/* Discovery Hub Selector: All, Bollywood & Hindi, Hollywood & English, TV Series Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[#11131c]/90 border border-white/5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => handleHubChange('all')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0',
              activeHub === 'all'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-[#161825] text-slate-400 hover:text-white border border-white/5'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Discoveries</span>
          </button>

          <button
            onClick={() => handleHubChange('hindi')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0',
              activeHub === 'hindi'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-[#161825] text-slate-400 hover:text-white border border-white/5'
            )}
          >
            <span className="text-sm">🇮🇳</span>
            <span>Bollywood & Hindi</span>
          </button>

          <button
            onClick={() => handleHubChange('english')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0',
              activeHub === 'english'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#161825] text-slate-400 hover:text-white border border-white/5'
            )}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Hollywood & English</span>
          </button>

          <button
            onClick={() => handleHubChange('tv')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0',
              activeHub === 'tv'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-[#161825] text-slate-400 hover:text-white border border-white/5'
            )}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV & Series Hub</span>
          </button>
        </div>

        <Link
          href="/settings"
          className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-end sm:self-auto"
        >
          <span>Preferences</span>
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

      {/* Discovery Error Notice (if offline and no cache yet) */}
      {discoveryError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Discovery content is unavailable offline. Your personal library remains fully accessible.
          </span>
        </div>
      )}

      {/* SECTION 2: RECOMMENDED FOR YOU (Dynamically refreshes on every load/refresh) */}
      {recommendedItems.length > 0 && (
        <MediaRow
          key="recommended-for-you"
          title="Recommended For You"
          subtitle={recommendationSubtitle}
          action={
            <button
              onClick={handleShuffleRecommendations}
              disabled={isShufflingRecs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              title="Shuffle for new recommendations"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-red-500', isShufflingRecs && 'animate-spin')} />
              <span className="hidden sm:inline">Shuffle Picks</span>
            </button>
          }
          items={recommendedItems.map((m) => ({
            id: m.id,
            title: m.title || m.name || 'Untitled',
            mediaType: (m.media_type || (m.name ? 'tv' : 'movie')) as MediaType,
            posterPath: m.poster_path,
            releaseDate: m.release_date || m.first_air_date,
            voteAverage: m.vote_average,
          }))}
        />
      )}

      {/* SECTION 3: TAILORED GENRE ROWS */}
      {activeHub === 'all' &&
        tailoredRows.map((row) =>
          createRow(
            `tailored-${row.genreId}-${row.mediaType}`,
            `Top ${row.genreName} for You`,
            `Curated ${row.mediaType === 'tv' ? 'shows & series' : 'films'} tailored to your taste`,
            row.items,
            row.mediaType
          )
        )}

      {/* SECTION 4: FEEDS BY SELECTED HUB */}

      {/* --- HUB A: BOLLYWOOD & HINDI ONLY --- */}
      {activeHub === 'hindi' && (
        <>
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-transparent border border-amber-500/20 mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🇮🇳</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Bollywood & Hindi Cinema Hub
              </h2>
            </div>
            <p className="text-xs text-amber-300/80">
              Theatrical blockbusters, historic box office record breakers, universal classics, and acclaimed streaming series.
            </p>
          </div>

          {createRow(
            'hi-trending-movies',
            '🔥 Trending Hindi Cinema',
            'Latest Bollywood releases & theatrical sensations trending right now',
            trendingHindiMovies,
            'movie'
          )}

          {createRow(
            'hi-highest-grossing',
            '💰 Highest Grossing Bollywood Hits',
            'All-time biggest box office earners (Dangal, Jawan, Bajrangi Bhaijaan, PK)',
            highestGrossingHindi,
            'movie'
          )}

          {createRow(
            'hi-most-popular',
            '🏆 All-Time Popular Bollywood Classics',
            'Universally beloved masterpieces (3 Idiots, DDLJ, Taare Zameen Par, Lagaan)',
            popularHindiMovies,
            'movie'
          )}

          {createRow(
            'hi-acclaimed-series',
            '⭐ Acclaimed Hindi Web Series',
            'Critically celebrated Indian thriller, crime, and drama series (Mirzapur, Sacred Games, Scam 1992)',
            popularHindiTv,
            'tv'
          )}

          {createRow(
            'hi-trending-series',
            '📺 Trending Hindi Shows',
            'Popular streaming shows and television productions in India',
            trendingHindiTv,
            'tv'
          )}
        </>
      )}

      {/* --- HUB B: HOLLYWOOD & ENGLISH ONLY --- */}
      {activeHub === 'english' && (
        <>
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-transparent border border-blue-500/20 mb-6">
            <div className="flex items-center gap-3 mb-1">
              <Film className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Hollywood & English Cinema Hub
              </h2>
            </div>
            <p className="text-xs text-blue-300/80">
              Worldwide blockbuster spectacles, all-time box office champions, and top-rated television productions.
            </p>
          </div>

          {createRow(
            'en-trending-movies',
            'Trending Movies',
            'The most popular motion pictures this week worldwide',
            trendingMovies,
            'movie'
          )}

          {createRow(
            'en-highest-grossing',
            '💎 Highest Grossing Box Office Blockbusters',
            'All-time worldwide box office record breakers (Avatar, Avengers: Endgame, Titanic)',
            highestGrossingEnglish,
            'movie'
          )}

          {createRow(
            'en-most-popular',
            '🍿 All-Time Popular English Movies',
            'Widely watched, highly rated cinematic legends (The Dark Knight, Inception, Interstellar)',
            popularEnglishMovies,
            'movie'
          )}

          {createRow(
            'en-trending-series',
            'Trending TV Series',
            'Binge-worthy shows and series trending now',
            trendingTv,
            'tv'
          )}

          {createRow(
            'en-top-series',
            '🏆 Top Rated English TV Series',
            'Universally acclaimed television masterpieces (Breaking Bad, Game of Thrones, Succession)',
            popularEnglishTv,
            'tv'
          )}
        </>
      )}

      {/* --- HUB C: TV SERIES HUB ONLY --- */}
      {activeHub === 'tv' && (
        <>
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-violet-950/20 to-transparent border border-purple-500/20 mb-6">
            <div className="flex items-center gap-3 mb-1">
              <Tv className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Complete TV & Web Series Hub
              </h2>
            </div>
            <p className="text-xs text-purple-300/80">
              Explore global television epics, Hindi crime thrillers, and acclaimed streaming seasons.
            </p>
          </div>

          {createRow(
            'tv-trending-global',
            'Trending Series Worldwide',
            'Sensational series and television productions trending this week',
            trendingTv,
            'tv'
          )}

          {createRow(
            'tv-hindi-acclaimed',
            '⭐ Acclaimed Hindi Web Series',
            'Critically celebrated Indian thriller, crime, and drama series (Mirzapur, Sacred Games, Scam 1992)',
            popularHindiTv,
            'tv'
          )}

          {createRow(
            'tv-english-top',
            '🏆 Top Rated English TV Series',
            'All-time acclaimed television masterpieces (Breaking Bad, Game of Thrones, The Last of Us)',
            popularEnglishTv,
            'tv'
          )}

          {createRow(
            'tv-hindi-trending',
            '📺 Trending Indian Shows',
            'Popular streaming web series in India right now',
            trendingHindiTv,
            'tv'
          )}

          {createRow(
            'tv-popular-global',
            'Popular Series',
            'Widely watched and streaming television shows',
            popularTv,
            'tv'
          )}
        </>
      )}

      {/* --- HUB D: ALL DISCOVERIES (BALANCED RICH FEED) --- */}
      {activeHub === 'all' && (
        <>
          {createRow(
            'all-trending-movies',
            'Trending Movies',
            'The most popular motion pictures this week worldwide',
            trendingMovies,
            'movie'
          )}

          {createRow(
            'all-trending-hindi-movies',
            '🔥 Trending Hindi Cinema',
            'Latest Bollywood and Hindi theatrical & streaming releases',
            trendingHindiMovies,
            'movie'
          )}

          {createRow(
            'all-trending-tv',
            'Trending Series',
            'Binge-worthy shows and series trending now',
            trendingTv,
            'tv'
          )}

          {createRow(
            'all-acclaimed-hindi-series',
            '⭐ Acclaimed Hindi Web Series',
            'Critically celebrated Indian thriller, crime, and drama series (Mirzapur, Sacred Games, Scam 1992)',
            popularHindiTv,
            'tv'
          )}

          {createRow(
            'all-grossing-hindi',
            '💰 Highest Grossing Bollywood Hits',
            'Record-shattering box office blockbusters in Hindi cinema (Dangal, Jawan, Bajrangi Bhaijaan)',
            highestGrossingHindi,
            'movie'
          )}

          {createRow(
            'all-grossing-english',
            '💎 Highest Grossing Box Office Blockbusters',
            'All-time biggest worldwide box office hits (Avatar, Avengers: Endgame, Titanic)',
            highestGrossingEnglish,
            'movie'
          )}

          {createRow(
            'all-popular-hindi-movies',
            '🏆 All-Time Popular Bollywood Classics',
            'Universally beloved masterpieces (3 Idiots, DDLJ, Taare Zameen Par, Lagaan)',
            popularHindiMovies,
            'movie'
          )}

          {createRow(
            'all-popular-english-movies',
            '🍿 All-Time Popular Movies',
            'Widely watched, highly rated cinematic legends (The Dark Knight, Inception, Interstellar)',
            popularEnglishMovies,
            'movie'
          )}

          {createRow(
            'all-popular-english-tv',
            '🏆 Top Rated TV Series',
            'Universally acclaimed television and streaming productions (Breaking Bad, Game of Thrones)',
            popularEnglishTv,
            'tv'
          )}
        </>
      )}

      {/* SECTION 5: Recommended / Taste Architecture Banner */}
      <section className="p-8 rounded-3xl bg-gradient-to-r from-red-950/20 via-[#10121a] to-[#12141f] border border-white/5 text-center mt-12">
        <Sparkles className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Tailored Discovery Active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          WatchVault combines your personal watch tracking with your custom settings preferences to curate your home page.
        </p>
      </section>
    </div>
  );
}
