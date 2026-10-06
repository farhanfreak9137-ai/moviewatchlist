import { getCachedMetadata, setCachedMetadata, db } from '../db';
import { MediaType, CastMember, SeasonInfo, EpisodeInfo } from '../types';

export interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string; // TV shows use name
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: MediaType;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export interface TMDBPersonResult {
  id: number;
  name: string;
  original_name?: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity: number;
  known_for?: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
  }>;
}

export interface PersonCombinedCreditsResponse {
  id: number;
  cast: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    character?: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    overview?: string;
    genre_ids?: number[];
  }>;
  crew: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    job?: string;
    department?: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    overview?: string;
  }>;
}

export interface TMDBDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  budget?: number;
  revenue?: number;
  status?: string;
  vote_average?: number;
  vote_count?: number;
  genres: Array<{ id: number; name: string }>;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
      order: number;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
    }>;
  };
  created_by?: Array<{ id: number; name: string }>;
  videos?: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official?: boolean;
    }>;
  };
  'watch/providers'?: {
    results: Record<
      string,
      {
        link?: string;
        flatrate?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        rent?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        buy?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
      }
    >;
  };
  seasons?: Array<{
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
    overview: string;
  }>;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function getImageUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

const DEFAULT_TMDB_KEY = 'c56139572123d721aa33c2c33da73646';

// Fetch helper with local Dexie caching and offline fallback
async function fetchWithCache<T>(cacheKey: string, endpoint: string, ttlSeconds: number = 86400): Promise<T> {
  // 1. Try local cache first if offline
  const isOnline =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  const cached = await getCachedMetadata<T>(cacheKey);

  if (!isOnline && cached) {
    return cached;
  }

  try {
    // Check if user set custom TMDB API key in settings
    let apiKey = DEFAULT_TMDB_KEY;
    if (typeof window !== 'undefined') {
      try {
        const customKeySetting = await db.app_settings.get('custom_tmdb_key');
        if (customKeySetting?.value) {
          apiKey = customKeySetting.value;
        }
      } catch {
        // Safe fallback to default key
      }
    }

    const sep = endpoint.includes('?') ? '&' : '?';
    const tmdbUrl = `https://api.themoviedb.org/3/${endpoint}${sep}api_key=${apiKey}`;

    const res = await fetch(tmdbUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (cached) return cached;
      const err = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    const data: T = await res.json();
    // Cache for future offline usage
    await setCachedMetadata(cacheKey, data, ttlSeconds);
    return data;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export const tmdbService = {
  // Trending movies/series
  async getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week') {
    const key = `trending_${mediaType}_${timeWindow}`;
    const endpoint = `trending/${mediaType}/${timeWindow}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400); // 4 hour cache
    return (res.results || []).map((item) => ({
      ...item,
      media_type: (item.media_type || (mediaType !== 'all' ? mediaType : item.name ? 'tv' : 'movie')) as MediaType,
    }));
  },

  // Popular movies/series
  async getPopular(mediaType: 'movie' | 'tv', page: number = 1) {
    const key = `popular_${mediaType}_p${page}`;
    const endpoint = `${mediaType}/popular?page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },

  // Multi-search (movies & series)
  async searchMulti(query: string, page: number = 1) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const key = `search_${encodeURIComponent(trimmed.toLowerCase())}_p${page}`;
    const endpoint = `search/multi?query=${encodeURIComponent(trimmed)}&page=${page}&include_adult=false`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 86400);
    return (res.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item) => ({
        ...item,
        media_type: item.media_type as MediaType,
      }));
  },

  // Full Details for Movie
  async getMovieDetails(id: number): Promise<TMDBDetailsResponse> {
    const key = `details_movie_${id}`;
    const endpoint = `movie/${id}?append_to_response=credits,videos,watch/providers`;
    return fetchWithCache<TMDBDetailsResponse>(key, endpoint, 86400 * 7);
  },

  // Full Details for Series
  async getSeriesDetails(id: number): Promise<TMDBDetailsResponse> {
    const key = `details_tv_${id}`;
    const endpoint = `tv/${id}?append_to_response=credits,videos,watch/providers`;
    return fetchWithCache<TMDBDetailsResponse>(key, endpoint, 86400 * 7);
  },

  // Season episodes for Series
  async getSeriesSeason(tvId: number, seasonNumber: number): Promise<{ episodes: EpisodeInfo[] }> {
    const key = `season_tv_${tvId}_s${seasonNumber}`;
    const endpoint = `tv/${tvId}/season/${seasonNumber}`;
    return fetchWithCache<{ episodes: EpisodeInfo[] }>(key, endpoint, 86400 * 7);
  },

  // Discover media by genre and quality preferences
  async discoverMedia(
    mediaType: 'movie' | 'tv',
    options: {
      withGenres?: number[];
      minVoteAverage?: number;
      minVoteCount?: number;
      sortBy?: string;
      yearGte?: number;
      yearLte?: number;
      page?: number;
    } = {}
  ): Promise<TMDBMediaItem[]> {
    const {
      withGenres = [],
      minVoteAverage,
      minVoteCount = 80,
      sortBy = 'popularity.desc',
      yearGte,
      yearLte,
      page = 1,
    } = options;

    const genreParam = withGenres.length > 0 ? withGenres.join(',') : '';
    const cacheKey = `discover_${mediaType}_g${genreParam}_min${minVoteAverage || 0}_sort${sortBy}_p${page}`;

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('sort_by', sortBy);
    if (genreParam) params.set('with_genres', genreParam);
    if (minVoteAverage) {
      params.set('vote_average.gte', String(minVoteAverage));
      params.set('vote_count.gte', String(minVoteCount));
    }
    if (yearGte) {
      if (mediaType === 'movie') params.set('primary_release_date.gte', `${yearGte}-01-01`);
      else params.set('first_air_date.gte', `${yearGte}-01-01`);
    }
    if (yearLte) {
      if (mediaType === 'movie') params.set('primary_release_date.lte', `${yearLte}-12-31`);
      else params.set('first_air_date.lte', `${yearLte}-12-31`);
    }

    const endpoint = `discover/${mediaType}?${params.toString()}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(cacheKey, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },

  // Search people / actors
  async searchPerson(query: string, page: number = 1): Promise<TMDBPersonResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const key = `person_search_${encodeURIComponent(trimmed.toLowerCase())}_p${page}`;
    const endpoint = `search/person?query=${encodeURIComponent(trimmed)}&page=${page}&include_adult=false`;
    const res = await fetchWithCache<{ results: TMDBPersonResult[] }>(key, endpoint, 86400);
    return res.results || [];
  },

  // Get person details (bio, profile picture)
  async getPersonDetails(personId: number) {
    const key = `person_details_${personId}`;
    const endpoint = `person/${personId}`;
    return fetchWithCache<{
      id: number;
      name: string;
      biography?: string;
      profile_path: string | null;
      known_for_department?: string;
      birthday?: string;
      place_of_birth?: string;
    }>(key, endpoint, 86400 * 7);
  },

  // Get all movie and TV credits for a person / actor
  async getPersonCombinedCredits(personId: number): Promise<PersonCombinedCreditsResponse> {
    const key = `person_credits_${personId}`;
    const endpoint = `person/${personId}/combined_credits`;
    return fetchWithCache<PersonCombinedCreditsResponse>(key, endpoint, 86400 * 3);
  },

  // Discover by production companies (e.g. Marvel Studios, DC Films, Pixar, Ghibli, A24)
  async discoverByCompanies(
    companyIds: number[],
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
  ): Promise<TMDBMediaItem[]> {
    if (!companyIds || companyIds.length === 0) return [];
    const key = `discover_comp_${mediaType}_${companyIds.join('_')}_p${page}`;
    const endpoint = `discover/${mediaType}?with_companies=${companyIds.join('|')}&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },

  // Discover by companies returning pagination metadata (total_pages, total_results)
  async discoverByCompaniesWithMeta(
    companyIds: number[],
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
  ): Promise<{ results: TMDBMediaItem[]; totalPages: number; totalResults: number }> {
    if (!companyIds || companyIds.length === 0) {
      return { results: [], totalPages: 0, totalResults: 0 };
    }
    const key = `discover_comp_${mediaType}_${companyIds.join('_')}_p${page}`;
    const endpoint = `discover/${mediaType}?with_companies=${companyIds.join('|')}&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[]; total_pages: number; total_results: number }>(
      key,
      endpoint,
      14400
    );
    return {
      results: (res.results || []).map((item) => ({
        ...item,
        media_type: mediaType,
      })),
      totalPages: res.total_pages || 1,
      totalResults: res.total_results || 0,
    };
  },

  // Discover all or deep multiple pages for production companies in parallel
  async discoverAllByCompanies(
    companyIds: number[],
    mediaType: 'movie' | 'tv' = 'movie',
    maxPages: number = 10,
    startPage: number = 1
  ): Promise<{ results: TMDBMediaItem[]; totalPages: number; totalResults: number; lastPageFetched: number }> {
    if (!companyIds || companyIds.length === 0) {
      return { results: [], totalPages: 0, totalResults: 0, lastPageFetched: 0 };
    }
    const firstPage = await this.discoverByCompaniesWithMeta(companyIds, mediaType, startPage);
    const totalPages = firstPage.totalPages || 1;
    const endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage <= startPage) {
      return {
        results: firstPage.results,
        totalPages,
        totalResults: firstPage.totalResults,
        lastPageFetched: startPage,
      };
    }

    const pagePromises: Promise<{ results: TMDBMediaItem[]; totalPages: number; totalResults: number }>[] = [];
    for (let p = startPage + 1; p <= endPage; p++) {
      pagePromises.push(
        this.discoverByCompaniesWithMeta(companyIds, mediaType, p).catch(() => ({
          results: [],
          totalPages: 0,
          totalResults: 0,
        }))
      );
    }

    const otherPages = await Promise.all(pagePromises);
    const combined = [...firstPage.results];
    for (const op of otherPages) {
      combined.push(...op.results);
    }

    return {
      results: combined,
      totalPages,
      totalResults: firstPage.totalResults,
      lastPageFetched: endPage,
    };
  },

  // Fetch full franchise collection parts (e.g. X-Men, Wolverine, Deadpool)
  async getCollection(collectionId: number): Promise<TMDBMediaItem[]> {
    const key = `collection_${collectionId}`;
    const endpoint = `collection/${collectionId}`;
    try {
      const res = await fetchWithCache<{ parts: TMDBMediaItem[] }>(key, endpoint, 86400 * 7);
      return (res.parts || []).map((item) => ({
        ...item,
        media_type: 'movie' as MediaType,
      }));
    } catch {
      return [];
    }
  },

  // Discover multiple pages by genres
  async discoverAllByGenres(
    genreIds: number[],
    mediaType: 'movie' | 'tv' = 'movie',
    maxPages: number = 5
  ): Promise<TMDBMediaItem[]> {
    if (!genreIds || genreIds.length === 0) return [];
    const pagePromises = [];
    for (let p = 1; p <= maxPages; p++) {
      pagePromises.push(this.discoverByGenres(genreIds, mediaType, p).catch(() => []));
    }
    const pages = await Promise.all(pagePromises);
    return pages.flat();
  },

  // Multi-search fetching multiple pages (e.g. up to 3 pages = 60 items)
  async searchMultiPages(query: string, maxPages: number = 3): Promise<TMDBMediaItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const pagePromises = [];
    for (let p = 1; p <= maxPages; p++) {
      pagePromises.push(this.searchMulti(trimmed, p).catch(() => []));
    }
    const pages = await Promise.all(pagePromises);
    const map = new Map<string, TMDBMediaItem>();
    pages.flat().forEach((item) => {
      const k = `${item.media_type}_${item.id}`;
      if (!map.has(k)) map.set(k, item);
    });
    return Array.from(map.values());
  },

  // Discover multiple pages of Hindi / Bollywood cinema
  async discoverAllHindi(
    mediaType: 'movie' | 'tv' = 'movie',
    maxPages: number = 5
  ): Promise<TMDBMediaItem[]> {
    const pagePromises = [];
    for (let p = 1; p <= maxPages; p++) {
      pagePromises.push(this.getTrendingHindi(mediaType, p).catch(() => []));
    }
    const pages = await Promise.all(pagePromises);
    return pages.flat();
  },

  // Discover Anime (Japanese animation movies or series across multiple pages)
  async discoverAllAnime(
    mediaType: 'movie' | 'tv' = 'movie',
    maxPages: number = 8,
    startPage: number = 1
  ): Promise<TMDBMediaItem[]> {
    const pagePromises = [];
    const endPage = startPage + maxPages - 1;
    for (let p = startPage; p <= endPage; p++) {
      const key = `discover_anime_${mediaType}_p${p}`;
      const endpoint = `discover/${mediaType}?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${p}`;
      pagePromises.push(
        fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400)
          .then((res) =>
            (res.results || []).map((item) => ({
              ...item,
              media_type: mediaType,
            }))
          )
          .catch(() => [])
      );
    }
    const pages = await Promise.all(pagePromises);
    return pages.flat();
  },

  // Discover by genres (e.g. Action, Sci-Fi, Horror, Animation)
  async discoverByGenres(
    genreIds: number[],
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
  ): Promise<TMDBMediaItem[]> {
    if (!genreIds || genreIds.length === 0) return [];
    const key = `discover_genre_${mediaType}_${genreIds.join('_')}_p${page}`;
    const endpoint = `discover/${mediaType}?with_genres=${genreIds.join(',')}&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },

  // Raw multi-search that includes person results (used by autocomplete and entity recognition)
  async searchMultiRaw(query: string, page: number = 1) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const key = `search_raw_${encodeURIComponent(trimmed.toLowerCase())}_p${page}`;
    const endpoint = `search/multi?query=${encodeURIComponent(trimmed)}&page=${page}&include_adult=false`;
    const res = await fetchWithCache<{
      results: Array<TMDBMediaItem & { name?: string; media_type: string; profile_path?: string | null; known_for_department?: string }>;
    }>(key, endpoint, 86400);
    return res.results || [];
  },

  // Trending Hindi / Bollywood (Movies or Series)
  async getTrendingHindi(mediaType: 'movie' | 'tv' = 'movie', page: number = 1): Promise<TMDBMediaItem[]> {
    const key = `trending_hindi_${mediaType}_p${page}`;
    const endpoint = `discover/${mediaType}?with_original_language=hi&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },

  // Most Popular / Highly Voted Hindi (Movies or Series)
  async getMostPopularHindi(mediaType: 'movie' | 'tv' = 'movie', page: number = 1): Promise<TMDBMediaItem[]> {
    const minVotes = mediaType === 'tv' ? 10 : 50;
    const key = `popular_hindi_${mediaType}_p${page}`;
    const endpoint = `discover/${mediaType}?with_original_language=hi&sort_by=vote_count.desc&vote_count.gte=${minVotes}&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },

  // Highest Grossing / Most Earned Movies (Hindi or English)
  async getHighestGrossing(language: 'hi' | 'en' = 'hi', page: number = 1): Promise<TMDBMediaItem[]> {
    const minVotes = language === 'hi' ? 30 : 100;
    const key = `highest_grossing_${language}_p${page}`;
    const endpoint = `discover/movie?with_original_language=${language}&sort_by=revenue.desc&vote_count.gte=${minVotes}&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: 'movie' as MediaType,
    }));
  },

  // Most Popular / Acclaimed English Media (Movies or Series)
  async getMostPopularEnglish(mediaType: 'movie' | 'tv' = 'movie', page: number = 1): Promise<TMDBMediaItem[]> {
    const minVotes = mediaType === 'tv' ? 300 : 500;
    const key = `popular_english_${mediaType}_p${page}`;
    const endpoint = `discover/${mediaType}?with_original_language=en&sort_by=vote_count.desc&vote_count.gte=${minVotes}&page=${page}`;
    const res = await fetchWithCache<{ results: TMDBMediaItem[] }>(key, endpoint, 14400);
    return (res.results || []).map((item) => ({
      ...item,
      media_type: mediaType,
    }));
  },
};

