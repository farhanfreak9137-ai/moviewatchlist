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

// Fetch helper with local Dexie caching and offline fallback
async function fetchWithCache<T>(cacheKey: string, endpoint: string, ttlSeconds: number = 86400): Promise<T> {
  // 1. Try local cache first if offline
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const cached = await getCachedMetadata<T>(cacheKey);

  if (!isOnline && cached) {
    return cached;
  }

  try {
    // Check if user set custom TMDB API key in settings
    let customHeaders: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const customKeySetting = await db.app_settings.get('custom_tmdb_key');
      if (customKeySetting?.value) {
        customHeaders['x-tmdb-api-key'] = customKeySetting.value;
      }
    }

    const res = await fetch(`/api/tmdb/${endpoint}`, {
      headers: customHeaders,
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
    const endpoint = `movie/${id}?append_to_response=credits`;
    return fetchWithCache<TMDBDetailsResponse>(key, endpoint, 86400 * 7);
  },

  // Full Details for Series
  async getSeriesDetails(id: number): Promise<TMDBDetailsResponse> {
    const key = `details_tv_${id}`;
    const endpoint = `tv/${id}?append_to_response=credits`;
    return fetchWithCache<TMDBDetailsResponse>(key, endpoint, 86400 * 7);
  },

  // Season episodes for Series
  async getSeriesSeason(tvId: number, seasonNumber: number): Promise<{ episodes: EpisodeInfo[] }> {
    const key = `season_tv_${tvId}_s${seasonNumber}`;
    const endpoint = `tv/${tvId}/season/${seasonNumber}`;
    return fetchWithCache<{ episodes: EpisodeInfo[] }>(key, endpoint, 86400 * 7);
  },
};
