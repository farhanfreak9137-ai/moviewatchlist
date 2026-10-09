/**
 * Unified Smart Search Engine for WatchVault.
 * Handles Franchises (Marvel, DC, etc.), Genres (Action, etc.), Actors/Filmography,
 * Typo Correction with Levenshtein Distance, 1st-Letter Autocomplete, and Offline Search.
 */

import { tmdbService, TMDBMediaItem, TMDBPersonResult, getImageUrl } from '../metadata/tmdb';
import { LibraryItem, MediaType } from '../types';
import { matchFranchise, matchGenre, FRANCHISES, GENRE_MAP, FranchiseDefinition, GenreDefinition } from './franchises';
import { SEARCH_DICTIONARY } from './searchDictionary';
import {
  findBestCorrection,
  normalizeSearchString,
  stringSimilarity,
  damerauLevenshteinDistance,
} from './fuzzy';

export interface SmartSearchResult {
  type: 'standard' | 'franchise' | 'genre' | 'person';
  items: TMDBMediaItem[];
  entityInfo?: {
    id?: string | number;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string | null;
    bannerGradient?: string;
    badgeBorder?: string;
    badgeText?: string;
    iconType?: string;
    totalTitles?: number;
    hasMorePages?: boolean;
    lastFetchedPage?: number;
    lastFetchedMoviePage?: number;
    lastFetchedTvPage?: number;
    totalMoviePages?: number;
    totalTvPages?: number;
    totalAvailableTitles?: number;
  };
  originalQuery: string;
  executedQuery: string;
  correctedFrom?: string;
  didYouMean?: string;
}

export interface AutocompleteItem {
  id: string | number;
  title: string;
  subtitle?: string;
  category: 'title' | 'actor' | 'franchise' | 'genre' | 'correction';
  mediaType?: MediaType;
  year?: number | string;
  posterPath?: string | null;
  profilePath?: string | null;
  queryToExecute: string;
}

export interface AutocompleteResults {
  titles: AutocompleteItem[];
  actors: AutocompleteItem[];
  franchises: AutocompleteItem[];
  genres: AutocompleteItem[];
  didYouMean?: string;
}

export interface SearchFilterState {
  genres: string[];          // Genre IDs, e.g. ['action', 'scifi']
  minRating: number | null;  // e.g. 7.0, 7.5, 8.0, 8.5
  language: string | null;   // e.g. 'en', 'ja', 'ko', 'hi'
  year: string | null;       // e.g. '2026', '2025', '2024', '2020-2023', '2010s', '2000s', '90s', 'pre-1990', or specific year string
  sortBy: string;            // 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc' | 'primary_release_date.asc' | 'title.asc'
}

export const DEFAULT_SEARCH_FILTERS: SearchFilterState = {
  genres: [],
  minRating: null,
  language: null,
  year: null,
  sortBy: 'popularity.desc',
};

export function hasActiveSearchFilters(filters?: SearchFilterState | null): boolean {
  if (!filters) return false;
  return (
    filters.genres.length > 0 ||
    filters.minRating !== null ||
    filters.language !== null ||
    filters.year !== null ||
    (filters.sortBy !== 'popularity.desc' && Boolean(filters.sortBy))
  );
}

/**
 * Executes a full smart search query, automatically handling:
 * 1. Dedicated filter boxes (genres, rating, language, year, sort)
 * 2. Franchise detection (Marvel, DC, Star Wars, Pixar, etc.)
 * 3. Genre detection (Action, Sci-Fi, Horror, etc.)
 * 4. Actor / Director detection (Keanu Reeves, Christopher Nolan, etc.)
 * 5. Typo tolerance and automatic spell-correction fallback
 * 6. Offline search fallback across IndexedDB
 */
export async function executeSmartSearch(
  rawQuery: string,
  options: {
    libraryItems?: LibraryItem[];
    forceOriginal?: boolean;
    searchType?: 'all' | 'person' | 'movie' | 'tv';
    personId?: number;
    filters?: SearchFilterState;
  } = {}
): Promise<SmartSearchResult> {
  const query = rawQuery.trim();
  const { libraryItems = [], forceOriginal = false, searchType = 'all', personId, filters } = options;
  const hasFilters = hasActiveSearchFilters(filters);

  if (!query) {
    if (hasFilters && filters) {
      return await resolveFilteredSearch(filters, libraryItems);
    }
    return {
      type: 'standard',
      items: [],
      originalQuery: '',
      executedQuery: '',
    };
  }

  const isOnline =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;

  // --- OFFLINE SEARCH FALLBACK ---
  if (!isOnline) {
    return performOfflineSearch(query, libraryItems);
  }

  try {
    const norm = normalizeSearchString(query);

    // 0. EXPLICIT PERSON SEARCH (e.g. from clicking an actor autocomplete suggestion)
    if (searchType === 'person') {
      if (personId) {
        return await resolvePersonById(personId, query);
      }
      const forcedPerson = await checkPersonMatch(query, true);
      if (forcedPerson) {
        return await resolvePersonSearch(forcedPerson, query);
      }
    }

    // 1. FRANCHISE / STUDIO RESOLUTION (e.g. "marvel", "mcu", "dc", "star wars", "pixar", "a24")
    const matchedFranchise = matchFranchise(query);
    if (matchedFranchise) {
      return await resolveFranchiseSearch(matchedFranchise, query);
    }

    // 2. GENRE RESOLUTION (e.g. "action", "comedy", "horror", "sci-fi")
    const matchedGenre = matchGenre(query);
    if (matchedGenre) {
      return await resolveGenreSearch(matchedGenre, query);
    }

    // 3. FETCH MEDIA SEARCH CANDIDATES FIRST
    let items = await tmdbService.searchMultiPages(query, 3);

    // Check if there is an exact or near-exact media title match
    const hasExactMediaTitleMatch = items.some((item) => {
      const itemTitle = normalizeSearchString(item.title || item.name || '');
      return itemTitle === norm || (norm.length >= 4 && itemTitle.startsWith(norm) && (item.popularity || 0) >= 8.0);
    });

    // 4. PERSON RESOLUTION (only if no exact media title exists or if person has overwhelmingly high popularity)
    if (!hasExactMediaTitleMatch) {
      const personMatch = await checkPersonMatch(query, false);
      if (personMatch) {
        const topItemPop = items[0]?.popularity || 0;
        // Require person popularity to be significantly higher than any vague movie match
        if (items.length === 0 || (personMatch.popularity || 0) > topItemPop) {
          return await resolvePersonSearch(personMatch, query);
        }
      }
    }

    // 5. STANDARD MULTI-SEARCH WITH TYPO DETECTION
    let correctedFrom: string | undefined;
    let didYouMean: string | undefined;

    // Check if query has a potential typo
    const bestCorrection = findBestCorrection(query, SEARCH_DICTIONARY);

    if (items.length === 0 && !forceOriginal) {
      // 5a. Language demonym or regional industry match (e.g. "french", "spanish", "korean", "hindi", etc.)
      const LANG_MAP: Record<string, string> = {
        french: 'fr',
        spanish: 'es',
        german: 'de',
        italian: 'it',
        japanese: 'ja',
        chinese: 'zh',
        cantonese: 'zh',
        korean: 'ko',
        russian: 'ru',
        turkish: 'tr',
        danish: 'da',
        swedish: 'sv',
        portuguese: 'pt',
        telugu: 'te',
        tamil: 'ta',
        malayalam: 'ml',
        hindi: 'hi',
        bengali: 'bn',
      };
      const matchedLang = LANG_MAP[norm];
      if (matchedLang) {
        const [langMovies, langTv] = await Promise.all([
          tmdbService.discoverAllByLanguage(matchedLang, 'movie', 4).catch(() => []),
          tmdbService.discoverAllByLanguage(matchedLang, 'tv', 3).catch(() => []),
        ]);
        const combined = [...langMovies, ...langTv];
        if (combined.length > 0) {
          return {
            type: 'standard',
            items: combined,
            originalQuery: query,
            executedQuery: query,
          };
        }
      }

      // 5b. Production company / studio lookup (dynamically discover ANY studio in world cinema)
      try {
        const companies = await tmdbService.searchCompanies(query, 1);
        if (companies && companies.length > 0) {
          const topCompany = companies[0];
          const [compMovies, compTv] = await Promise.all([
            tmdbService.discoverAllByCompanies([topCompany.id], 'movie', 4).catch(() => ({ results: [] })),
            tmdbService.discoverAllByCompanies([topCompany.id], 'tv', 3).catch(() => ({ results: [] })),
          ]);
          const compAll = [...compMovies.results, ...compTv.results];
          if (compAll.length > 0) {
            return {
              type: 'franchise',
              items: compAll,
              entityInfo: {
                id: topCompany.id,
                title: topCompany.name,
                subtitle: 'Production Studio & Company',
                imageUrl: topCompany.logo_path ? getImageUrl(topCompany.logo_path, 'w500') : null,
                totalTitles: compAll.length,
                hasMorePages: true,
                lastFetchedPage: 4,
              },
              originalQuery: query,
              executedQuery: topCompany.name,
            };
          }
        }
      } catch {}

      // 5c. Topic keyword discovery (e.g. "zombie", "cyberpunk", "time travel", "vampire", "apocalypse")
      try {
        const keywords = await tmdbService.searchKeywords(query, 1);
        if (keywords && keywords.length > 0) {
          const topKw = keywords[0];
          const [kwMovies, kwTv] = await Promise.all([
            tmdbService.discoverByKeywords([topKw.id], 'movie', 1).catch(() => []),
            tmdbService.discoverByKeywords([topKw.id], 'tv', 1).catch(() => []),
          ]);
          const kwAll = [...kwMovies, ...kwTv];
          if (kwAll.length > 0) {
            return {
              type: 'standard',
              items: kwAll,
              originalQuery: query,
              executedQuery: query,
            };
          }
        }
      } catch {}

      // 5d. Zero results: try searching with fuzzy corrected term if available
      if (bestCorrection) {
        const correctedItems = await tmdbService.searchMultiPages(bestCorrection.corrected, 3);
        if (correctedItems.length > 0) {
          return {
            type: 'standard',
            items: correctedItems,
            originalQuery: query,
            executedQuery: bestCorrection.corrected,
            correctedFrom: query,
            didYouMean: bestCorrection.corrected,
          };
        }
      }
    } else if (items.length > 0 && bestCorrection && bestCorrection.distance <= 2) {
      // Results found, but user may have made a slight typo
      const normBest = normalizeSearchString(bestCorrection.corrected);
      if (normBest !== norm) {
        didYouMean = bestCorrection.corrected;
      }
    }

    if (hasFilters && filters) {
      items = applyFiltersToMediaItems(items, filters);
    }

    return {
      type: 'standard',
      items,
      originalQuery: query,
      executedQuery: query,
      correctedFrom,
      didYouMean,
    };
  } catch (err) {
    console.warn('Smart search encountered network/service error, falling back to local vault:', err);
    return performOfflineSearch(query, libraryItems);
  }
}

/**
 * Instant autocomplete suggestions starting from the very first letter typed.
 * Combines fast client-side dictionary matching with lightweight online search.
 */
export async function getSmartAutocomplete(
  partialQuery: string,
  libraryItems: LibraryItem[] = []
): Promise<AutocompleteResults> {
  const query = partialQuery.trim();
  if (!query) {
    return { titles: [], actors: [], franchises: [], genres: [] };
  }

  const normQuery = normalizeSearchString(query);
  const results: AutocompleteResults = {
    titles: [],
    actors: [],
    franchises: [],
    genres: [],
  };

  // 1. Franchise & Studio matches
  for (const f of FRANCHISES) {
    const isMatch =
      f.aliases.some((alias) => {
        const normAlias = normalizeSearchString(alias);
        return normAlias.startsWith(normQuery) || (normQuery.length >= 3 && normAlias.includes(normQuery));
      }) || normalizeSearchString(f.name).includes(normQuery);

    if (isMatch) {
      results.franchises.push({
        id: f.id,
        title: f.name,
        subtitle: f.description,
        category: 'franchise',
        queryToExecute: f.aliases[0] || f.name,
      });
    }
  }

  // 2. Genre matches
  for (const g of GENRE_MAP) {
    const isMatch =
      g.aliases.some((alias) => {
        const normAlias = normalizeSearchString(alias);
        return normAlias.startsWith(normQuery) || (normQuery.length >= 3 && normAlias.includes(normQuery));
      }) || normalizeSearchString(g.name).includes(normQuery);

    if (isMatch) {
      results.genres.push({
        id: g.id,
        title: g.name,
        subtitle: g.description,
        category: 'genre',
        queryToExecute: g.aliases[0] || g.name,
      });
    }
  }

  // 3. Client Dictionary matches (Fast & Instantaneous)
  for (const entry of SEARCH_DICTIONARY) {
    const normText = normalizeSearchString(entry.text);
    const startsWith = normText.startsWith(normQuery);
    const contains = normText.includes(normQuery) && normQuery.length >= 2;

    if (startsWith || contains) {
      if (entry.category === 'actor') {
        if (!results.actors.some((a) => a.title.toLowerCase() === entry.text.toLowerCase())) {
          results.actors.push({
            id: entry.text,
            title: entry.text,
            subtitle: entry.subtitle,
            category: 'actor',
            queryToExecute: entry.text,
          });
        }
      } else if (entry.category === 'title') {
        if (!results.titles.some((t) => t.title.toLowerCase() === entry.text.toLowerCase())) {
          results.titles.push({
            id: entry.text,
            title: entry.text,
            subtitle: entry.subtitle,
            category: 'title',
            mediaType: entry.mediaType || 'movie',
            year: entry.year,
            queryToExecute: entry.text,
          });
        }
      }
    }
  }

  // 4. Local Library items (Personal vault titles)
  for (const item of libraryItems) {
    const normTitle = normalizeSearchString(item.title);
    if (normTitle.startsWith(normQuery) || (normQuery.length >= 2 && normTitle.includes(normQuery))) {
      if (!results.titles.some((t) => t.title.toLowerCase() === item.title.toLowerCase())) {
        results.titles.unshift({
          id: `local_${item.id}`,
          title: item.title,
          subtitle: `In Vault • ${item.release_year || 'Unknown'}`,
          category: 'title',
          mediaType: item.media_type,
          year: item.release_year,
          posterPath: item.poster_path,
          queryToExecute: item.title,
        });
      }
    }
  }

  // 5. If online and user has typed at least 2 characters, supplement with TMDB live autocomplete
  if ((typeof navigator === 'undefined' || navigator.onLine !== false) && query.length >= 2) {
    try {
      const liveResults = await tmdbService.searchMultiRaw(query, 1);
      for (const item of liveResults.slice(0, 10)) {
        const rawItem = item as unknown as (TMDBPersonResult & { media_type?: string });
        if (rawItem.media_type === 'person') {
          if (!results.actors.some((a) => a.title.toLowerCase() === (rawItem.name || '').toLowerCase())) {
            results.actors.push({
              id: rawItem.id,
              title: rawItem.name,
              subtitle: rawItem.known_for_department || 'Actor / Director',
              category: 'actor',
              profilePath: rawItem.profile_path,
              queryToExecute: rawItem.name,
            });
          }
        } else if (item.media_type === 'movie' || item.media_type === 'tv') {
          const title = item.title || item.name || '';
          if (title && !results.titles.some((t) => t.title.toLowerCase() === title.toLowerCase())) {
            results.titles.push({
              id: item.id,
              title,
              category: 'title',
              mediaType: (item.media_type || (item.name ? 'tv' : 'movie')) as MediaType,
              year: (item.release_date || item.first_air_date || '').slice(0, 4),
              posterPath: item.poster_path,
              queryToExecute: title,
            });
          }
        }
      }
    } catch {
      // Graceful fallback to client dictionary
    }
  }

  // 6. Typo suggestion
  const bestCorrection = findBestCorrection(query, SEARCH_DICTIONARY);
  if (bestCorrection && bestCorrection.distance <= 2 && bestCorrection.similarity >= 0.72) {
    results.didYouMean = bestCorrection.corrected;
  }

  // Cap results per category for a clean, non-cluttered dropdown
  results.franchises = results.franchises.slice(0, 3);
  results.genres = results.genres.slice(0, 3);
  results.actors = results.actors.slice(0, 4);
  results.titles = results.titles.slice(0, 6);

  return results;
}

// --- INTERNAL RESOLUTION HELPERS ---

async function resolveFranchiseSearch(
  franchise: FranchiseDefinition,
  originalQuery: string
): Promise<SmartSearchResult> {
  const map = new Map<string, TMDBMediaItem>();

  const addItem = (item: TMDBMediaItem) => {
    if (!item || !item.id) return;
    if (franchise.filterItems && !franchise.filterItems(item)) {
      return;
    }
    const mt = (item.media_type || (item.name ? 'tv' : 'movie')) as MediaType;
    const key = `${mt}_${item.id}`;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        media_type: mt,
      });
    }
  };

  const tasks: Promise<unknown>[] = [];

  // 1. Fetch using company IDs if available (deep parallel multi-page)
  if (franchise.companyIds && franchise.companyIds.length > 0) {
    const moviePages = franchise.maxMoviePages || 10;
    const tvPages = franchise.maxTvPages || 6;

    tasks.push(
      tmdbService
        .discoverAllByCompanies(franchise.companyIds, 'movie', moviePages)
        .then((res) => res.results.forEach(addItem))
        .catch(() => {})
    );
    tasks.push(
      tmdbService
        .discoverAllByCompanies(franchise.companyIds, 'tv', tvPages)
        .then((res) => res.results.forEach(addItem))
        .catch(() => {})
    );
  }

  // 2. Fetch collections if available (e.g. X-Men, Wolverine, Deadpool)
  if (franchise.collectionIds && franchise.collectionIds.length > 0) {
    for (const colId of franchise.collectionIds) {
      tasks.push(
        tmdbService
          .getCollection(colId)
          .then((parts) => parts.forEach(addItem))
          .catch(() => {})
      );
    }
  }

  // 3. Fetch language / languages if available (e.g. Bollywood, South Indian, Korean)
  if (franchise.languages && franchise.languages.length > 0) {
    const moviePages = Math.min(franchise.maxMoviePages || 8, 4);
    const tvPages = Math.min(franchise.maxTvPages || 6, 3);
    for (const lang of franchise.languages) {
      tasks.push(
        tmdbService
          .discoverAllByLanguage(lang, 'movie', moviePages)
          .then((items) => items.forEach(addItem))
          .catch(() => {})
      );
      tasks.push(
        tmdbService
          .discoverAllByLanguage(lang, 'tv', tvPages)
          .then((items) => items.forEach(addItem))
          .catch(() => {})
      );
    }
  } else if (franchise.language) {
    tasks.push(
      tmdbService
        .discoverAllByLanguage(franchise.language, 'movie', franchise.maxMoviePages || 8)
        .then((items) => items.forEach(addItem))
        .catch(() => {})
    );
    tasks.push(
      tmdbService
        .discoverAllByLanguage(franchise.language, 'tv', franchise.maxTvPages || 5)
        .then((items) => items.forEach(addItem))
        .catch(() => {})
    );
  }

  // 4. Fetch Anime if isAnime
  if (franchise.isAnime) {
    const moviePages = franchise.maxMoviePages || 12;
    const tvPages = franchise.maxTvPages || 12;
    tasks.push(
      tmdbService
        .discoverAllAnime('movie', moviePages)
        .then((items) => items.forEach(addItem))
        .catch(() => {})
    );
    tasks.push(
      tmdbService
        .discoverAllAnime('tv', tvPages)
        .then((items) => items.forEach(addItem))
        .catch(() => {})
    );
  }

  // 5. Query keywords to ensure complete universe coverage across multiple pages
  const keywords =
    franchise.queryKeywords && franchise.queryKeywords.length > 0
      ? franchise.queryKeywords
      : [franchise.name];

  for (const kw of keywords) {
    tasks.push(
      tmdbService
        .searchMultiPages(kw, 3)
        .then((items) => items.forEach(addItem))
        .catch(() => {})
    );
  }

  await Promise.all(tasks);

  const merged = Array.from(map.values()).sort(
    (a, b) => (b.popularity || 0) - (a.popularity || 0)
  );

  return {
    type: 'franchise',
    items: merged,
    entityInfo: {
      id: franchise.id,
      title: franchise.name,
      subtitle: `Studio & Franchise Universe`,
      description: franchise.description,
      bannerGradient: franchise.bannerGradient,
      badgeBorder: franchise.badgeBorder,
      badgeText: franchise.badgeText,
      iconType: franchise.iconType,
      totalTitles: merged.length,
      hasMorePages: true,
      lastFetchedPage: franchise.maxMoviePages || 8,
    },
    originalQuery,
    executedQuery: franchise.name,
  };
}

export async function loadMoreStudioCatalog(
  franchiseId: string,
  startPage: number,
  pageCount: number = 5
): Promise<TMDBMediaItem[]> {
  const franchise = FRANCHISES.find((f) => f.id === franchiseId);
  if (!franchise) {
    return [];
  }
  if (franchise.isAnime) {
    const [movies, tvs] = await Promise.all([
      tmdbService.discoverAllAnime('movie', pageCount, startPage).catch(() => []),
      tmdbService.discoverAllAnime('tv', pageCount, startPage).catch(() => []),
    ]);
    return [...movies, ...tvs];
  }
  if (franchise.languages && franchise.languages.length > 0) {
    const promises: Promise<TMDBMediaItem[]>[] = [];
    for (const lang of franchise.languages) {
      promises.push(tmdbService.discoverAllByLanguage(lang, 'movie', pageCount, startPage).catch(() => []));
      promises.push(tmdbService.discoverAllByLanguage(lang, 'tv', Math.max(1, Math.floor(pageCount / 2)), startPage).catch(() => []));
    }
    const res = await Promise.all(promises);
    return res.flat();
  }
  if (franchise.language) {
    const [movies, tvs] = await Promise.all([
      tmdbService.discoverAllByLanguage(franchise.language, 'movie', pageCount, startPage).catch(() => []),
      tmdbService.discoverAllByLanguage(franchise.language, 'tv', pageCount, startPage).catch(() => []),
    ]);
    return [...movies, ...tvs];
  }
  if (!franchise.companyIds || franchise.companyIds.length === 0) {
    return [];
  }
  const [movieRes, tvRes] = await Promise.all([
    tmdbService
      .discoverAllByCompanies(franchise.companyIds, 'movie', pageCount, startPage)
      .catch(() => ({ results: [] })),
    tmdbService
      .discoverAllByCompanies(franchise.companyIds, 'tv', Math.max(1, Math.floor(pageCount / 2)), startPage)
      .catch(() => ({ results: [] })),
  ]);
  const all = [...movieRes.results, ...tvRes.results];
  if (franchise.filterItems) {
    return all.filter(franchise.filterItems);
  }
  return all;
}

async function resolveGenreSearch(genre: GenreDefinition, originalQuery: string): Promise<SmartSearchResult> {
  const initialPages = 15; // 15 pages = 300 movies + 300 tv shows = 600 titles initially!
  const [movieRes, seriesRes] = await Promise.all([
    tmdbService.discoverAllByGenres([genre.movieGenreId], 'movie', initialPages, 1).catch(() => ({
      results: [] as TMDBMediaItem[],
      totalPages: 0,
      totalResults: 0,
      lastPageFetched: 0,
    })),
    tmdbService.discoverAllByGenres([genre.tvGenreId], 'tv', initialPages, 1).catch(() => ({
      results: [] as TMDBMediaItem[],
      totalPages: 0,
      totalResults: 0,
      lastPageFetched: 0,
    })),
  ]);

  const map = new Map<string, TMDBMediaItem>();
  [...movieRes.results, ...seriesRes.results].forEach((item) => {
    const key = `${item.media_type || (item.name ? 'tv' : 'movie')}_${item.id}`;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        media_type: (item.media_type || (item.name ? 'tv' : 'movie')) as MediaType,
      });
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const hasMore = movieRes.totalPages > initialPages || seriesRes.totalPages > initialPages;
  const totalAvailable = (movieRes.totalResults || 0) + (seriesRes.totalResults || 0);

  return {
    type: 'genre',
    items: merged,
    entityInfo: {
      id: genre.id,
      title: `${genre.name} Catalog`,
      subtitle:
        totalAvailable > 0
          ? `Curated Genre Collection • ${totalAvailable.toLocaleString()} Available Titles in Vault`
          : `Curated Genre Collection`,
      description: genre.description,
      bannerGradient: genre.bannerGradient,
      badgeBorder: genre.badgeBorder,
      badgeText: genre.badgeText,
      totalTitles: merged.length,
      hasMorePages: hasMore,
      lastFetchedPage: initialPages,
      lastFetchedMoviePage: movieRes.lastPageFetched || initialPages,
      lastFetchedTvPage: seriesRes.lastPageFetched || initialPages,
      totalMoviePages: movieRes.totalPages,
      totalTvPages: seriesRes.totalPages,
      totalAvailableTitles: totalAvailable,
    },
    originalQuery,
    executedQuery: genre.name,
  };
}

export async function loadMoreGenreCatalog(
  genreId: string,
  startMoviePage: number,
  startTvPage: number,
  pageCount: number = 10,
  mediaTypeFilter: 'all' | 'movie' | 'tv' = 'all'
): Promise<{
  items: TMDBMediaItem[];
  lastFetchedMoviePage: number;
  lastFetchedTvPage: number;
  hasMorePages: boolean;
}> {
  const genre = GENRE_MAP.find((g) => g.id === genreId);
  if (!genre) {
    return {
      items: [],
      lastFetchedMoviePage: startMoviePage,
      lastFetchedTvPage: startTvPage,
      hasMorePages: false,
    };
  }

  const tasks: Promise<{
    type: 'movie' | 'tv';
    results: TMDBMediaItem[];
    totalPages: number;
    lastPageFetched: number;
  }>[] = [];

  if (mediaTypeFilter === 'all' || mediaTypeFilter === 'movie') {
    tasks.push(
      tmdbService
        .discoverAllByGenres([genre.movieGenreId], 'movie', pageCount, startMoviePage + 1)
        .then((res) => ({ type: 'movie' as const, ...res }))
        .catch(() => ({ type: 'movie' as const, results: [], totalPages: 0, lastPageFetched: startMoviePage }))
    );
  }

  if (mediaTypeFilter === 'all' || mediaTypeFilter === 'tv') {
    tasks.push(
      tmdbService
        .discoverAllByGenres([genre.tvGenreId], 'tv', pageCount, startTvPage + 1)
        .then((res) => ({ type: 'tv' as const, ...res }))
        .catch(() => ({ type: 'tv' as const, results: [], totalPages: 0, lastPageFetched: startTvPage }))
    );
  }

  const responses = await Promise.all(tasks);
  const movieRes = responses.find((r) => r.type === 'movie');
  const tvRes = responses.find((r) => r.type === 'tv');

  const newLastMoviePage = movieRes ? movieRes.lastPageFetched : startMoviePage;
  const newLastTvPage = tvRes ? tvRes.lastPageFetched : startTvPage;

  const hasMoreMovies = movieRes ? movieRes.lastPageFetched < movieRes.totalPages : true;
  const hasMoreTv = tvRes ? tvRes.lastPageFetched < tvRes.totalPages : true;

  const hasMore =
    mediaTypeFilter === 'movie'
      ? hasMoreMovies
      : mediaTypeFilter === 'tv'
      ? hasMoreTv
      : hasMoreMovies || hasMoreTv;

  const combined = responses.flatMap((r) => r.results);

  return {
    items: combined,
    lastFetchedMoviePage: newLastMoviePage,
    lastFetchedTvPage: newLastTvPage,
    hasMorePages: hasMore,
  };
}

async function resolvePersonById(
  personId: number,
  originalQuery: string
): Promise<SmartSearchResult> {
  const details = await tmdbService.getPersonDetails(personId).catch(() => null);
  if (!details) {
    const forcedPerson = await checkPersonMatch(originalQuery, true);
    if (forcedPerson) {
      return resolvePersonSearch(forcedPerson, originalQuery);
    }
    return {
      type: 'standard',
      items: [],
      originalQuery,
      executedQuery: originalQuery,
    };
  }
  return resolvePersonSearch(
    {
      id: details.id,
      name: details.name,
      popularity: 10,
      profile_path: details.profile_path,
      known_for_department: details.known_for_department,
    },
    originalQuery
  );
}

async function checkPersonMatch(query: string, force = false): Promise<TMDBPersonResult | null> {
  const normQuery = normalizeSearchString(query);
  if (normQuery.length < 3) return null;

  try {
    const people = await tmdbService.searchPerson(query, 1);
    if (!people || people.length === 0) return null;

    const topPerson = people[0];
    const normPersonName = normalizeSearchString(topPerson.name);
    const popularity = topPerson.popularity || 0;
    const wordsCount = normQuery.split(' ').filter(Boolean).length;

    if (force) {
      return topPerson;
    }

    // Minimum popularity filter:
    // If single word (e.g. "Jack", "Suzume"), require very high notoriety (>= 12.0)
    // If multi-word (e.g. "Tom Cruise", "Keanu Reeves"), require >= 4.0
    const minPopularity = wordsCount === 1 ? 12.0 : 4.0;
    if (popularity < minPopularity) {
      return null;
    }

    const similarity = stringSimilarity(normQuery, normPersonName);
    const dist = damerauLevenshteinDistance(normQuery, normPersonName);

    // 1. Exact match
    if (normPersonName === normQuery) {
      return topPerson;
    }

    // 2. High similarity or 1-char typo for single/multi word queries
    if (similarity >= 0.88 && dist <= 2 && popularity >= (wordsCount === 1 ? 15.0 : 5.0)) {
      return topPerson;
    }

    // 3. Multi-word prefix/start match (e.g. "Keanu Reeves", "Cillian Murphy")
    if (
      wordsCount >= 2 &&
      popularity >= 5.0 &&
      (normPersonName.startsWith(normQuery) || normQuery.startsWith(normPersonName))
    ) {
      return topPerson;
    }
  } catch {
    // Ignore person check failure
  }
  return null;
}

async function resolvePersonSearch(
  person: TMDBPersonResult,
  originalQuery: string
): Promise<SmartSearchResult> {
  const [credits, details] = await Promise.all([
    tmdbService.getPersonCombinedCredits(person.id).catch(() => ({ id: person.id, cast: [], crew: [] })),
    tmdbService.getPersonDetails(person.id).catch(() => null),
  ]);

  const map = new Map<string, TMDBMediaItem>();

  // Add movies & series where person is in cast
  (credits.cast || []).forEach((c) => {
    const key = `${c.media_type}_${c.id}`;
    if (!map.has(key)) {
      map.set(key, {
        id: c.id,
        title: c.title || c.name || '',
        name: c.name || c.title || '',
        overview: c.overview || '',
        poster_path: c.poster_path,
        backdrop_path: c.backdrop_path,
        media_type: c.media_type as MediaType,
        release_date: c.release_date || c.first_air_date,
        first_air_date: c.first_air_date,
        vote_average: c.vote_average,
        vote_count: c.vote_count,
        popularity: c.popularity,
      });
    }
  });

  // If director or creator, also add directing credits
  (credits.crew || [])
    .filter((cr) => cr.job === 'Director' || cr.department === 'Directing')
    .forEach((cr) => {
      const key = `${cr.media_type}_${cr.id}`;
      if (!map.has(key)) {
        map.set(key, {
          id: cr.id,
          title: cr.title || cr.name || '',
          name: cr.name || cr.title || '',
          overview: cr.overview || '',
          poster_path: cr.poster_path,
          backdrop_path: cr.backdrop_path,
          media_type: cr.media_type as MediaType,
          release_date: cr.release_date || cr.first_air_date,
          first_air_date: cr.first_air_date,
          vote_average: cr.vote_average,
          vote_count: cr.vote_count,
          popularity: cr.popularity,
        });
      }
    });

  const merged = Array.from(map.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  return {
    type: 'person',
    items: merged,
    entityInfo: {
      id: person.id,
      title: person.name,
      subtitle: details?.known_for_department || person.known_for_department || 'Actor / Filmography',
      description:
        details?.biography && details.biography.length > 300
          ? `${details.biography.slice(0, 300)}...`
          : details?.biography || `Filmography and starred works featuring ${person.name}.`,
      imageUrl: getImageUrl(details?.profile_path || person.profile_path, 'w342'),
      bannerGradient: 'from-amber-950/70 via-stone-900/40 to-transparent',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-400',
      totalTitles: merged.length,
    },
    originalQuery,
    executedQuery: person.name,
  };
}

function performOfflineSearch(query: string, libraryItems: LibraryItem[]): SmartSearchResult {
  const normQuery = normalizeSearchString(query);

  const matched = libraryItems
    .map((item) => {
      const normTitle = normalizeSearchString(item.title);
      const similarity = stringSimilarity(normQuery, normTitle);
      const includes = normTitle.includes(normQuery);
      const genreMatch = item.genres?.some((g) => normalizeSearchString(g).includes(normQuery));
      const castMatch = item.cast?.some((c) => normalizeSearchString(c.name).includes(normQuery));

      let score = 0;
      if (normTitle === normQuery) score = 100;
      else if (normTitle.startsWith(normQuery)) score = 80;
      else if (includes) score = 60;
      else if (similarity >= 0.7) score = 40 + similarity * 10;
      else if (genreMatch) score = 30;
      else if (castMatch) score = 30;

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      id: entry.item.tmdb_id,
      title: entry.item.title,
      name: entry.item.title,
      overview: entry.item.overview || '',
      poster_path: entry.item.poster_path || null,
      backdrop_path: entry.item.backdrop_path || null,
      media_type: entry.item.media_type,
      release_date: entry.item.release_date,
      vote_average: entry.item.rating || 0,
      vote_count: 0,
      popularity: 1,
    }));

    return {
      type: 'standard',
      items: matched as TMDBMediaItem[],
      originalQuery: query,
      executedQuery: query,
    };
  }

export function parseYearFilter(year: string | null): { exactYear?: number; yearGte?: number; yearLte?: number } {
  if (!year) return {};
  if (year === '2020-2023') return { yearGte: 2020, yearLte: 2023 };
  if (year === '2010s') return { yearGte: 2010, yearLte: 2019 };
  if (year === '2000s') return { yearGte: 2000, yearLte: 2009 };
  if (year === '90s') return { yearGte: 1990, yearLte: 1999 };
  if (year === 'pre-1990') return { yearLte: 1989 };
  const num = parseInt(year, 10);
  if (!isNaN(num) && num > 1800 && num < 2100) {
    return { exactYear: num };
  }
  return {};
}

export function parseGenreIds(genreIds: string[]): { movieGenreIds: number[]; tvGenreIds: number[] } {
  const movieGenreIds: number[] = [];
  const tvGenreIds: number[] = [];
  for (const gid of genreIds) {
    const def = GENRE_MAP.find((g) => g.id === gid);
    if (def) {
      if (!movieGenreIds.includes(def.movieGenreId)) movieGenreIds.push(def.movieGenreId);
      if (!tvGenreIds.includes(def.tvGenreId)) tvGenreIds.push(def.tvGenreId);
    }
  }
  return { movieGenreIds, tvGenreIds };
}

export function applyFiltersToMediaItems(
  items: TMDBMediaItem[],
  filters: SearchFilterState
): TMDBMediaItem[] {
  let filtered = [...items];
  const { movieGenreIds, tvGenreIds } = parseGenreIds(filters.genres);
  const allGenreIds = new Set([...movieGenreIds, ...tvGenreIds]);
  const yearOpts = parseYearFilter(filters.year);

  // 1. Genre filter
  if (allGenreIds.size > 0) {
    filtered = filtered.filter((item) => {
      if (!item.genre_ids || item.genre_ids.length === 0) return true;
      return item.genre_ids.some((gid) => allGenreIds.has(gid));
    });
  }

  // 2. Minimum Rating
  if (filters.minRating !== null && filters.minRating > 0) {
    filtered = filtered.filter((item) => (item.vote_average || 0) >= filters.minRating!);
  }

  // 3. Year
  if (yearOpts.exactYear) {
    filtered = filtered.filter((item) => {
      const date = item.release_date || item.first_air_date || '';
      return date.startsWith(String(yearOpts.exactYear));
    });
  } else if (yearOpts.yearGte || yearOpts.yearLte) {
    filtered = filtered.filter((item) => {
      const date = item.release_date || item.first_air_date || '';
      const year = parseInt(date.slice(0, 4), 10);
      if (isNaN(year)) return false;
      if (yearOpts.yearGte && year < yearOpts.yearGte) return false;
      if (yearOpts.yearLte && year > yearOpts.yearLte) return false;
      return true;
    });
  }

  // 4. Sort
  filtered.sort((a, b) => {
    if (filters.sortBy === 'vote_average.desc') {
      return (b.vote_average || 0) - (a.vote_average || 0);
    }
    if (filters.sortBy === 'primary_release_date.desc') {
      return (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || '');
    }
    if (filters.sortBy === 'primary_release_date.asc') {
      return (a.release_date || a.first_air_date || '').localeCompare(b.release_date || b.first_air_date || '');
    }
    if (filters.sortBy === 'title.asc') {
      return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    }
    return (b.popularity || 0) - (a.popularity || 0);
  });

  return filtered;
}

export async function resolveFilteredSearch(
  filters: SearchFilterState,
  libraryItems: LibraryItem[] = []
): Promise<SmartSearchResult> {
  const initialPages = 15;
  const { movieGenreIds, tvGenreIds } = parseGenreIds(filters.genres);
  const yearOpts = parseYearFilter(filters.year);

  const [movieRes, seriesRes] = await Promise.all([
    tmdbService
      .discoverAllMedia('movie', {
        withGenres: movieGenreIds,
        minVoteAverage: filters.minRating || undefined,
        language: filters.language || undefined,
        sortBy: filters.sortBy || 'popularity.desc',
        exactYear: yearOpts.exactYear,
        yearGte: yearOpts.yearGte,
        yearLte: yearOpts.yearLte,
        maxPages: initialPages,
        startPage: 1,
      })
      .catch(() => ({ results: [] as TMDBMediaItem[], totalPages: 0, totalResults: 0, lastPageFetched: 0 })),
    tmdbService
      .discoverAllMedia('tv', {
        withGenres: tvGenreIds,
        minVoteAverage: filters.minRating || undefined,
        language: filters.language || undefined,
        sortBy: filters.sortBy || 'popularity.desc',
        exactYear: yearOpts.exactYear,
        yearGte: yearOpts.yearGte,
        yearLte: yearOpts.yearLte,
        maxPages: initialPages,
        startPage: 1,
      })
      .catch(() => ({ results: [] as TMDBMediaItem[], totalPages: 0, totalResults: 0, lastPageFetched: 0 })),
  ]);

  const map = new Map<string, TMDBMediaItem>();
  [...movieRes.results, ...seriesRes.results].forEach((item) => {
    const key = `${item.media_type || (item.name ? 'tv' : 'movie')}_${item.id}`;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        media_type: (item.media_type || (item.name ? 'tv' : 'movie')) as MediaType,
      });
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => {
    if (filters.sortBy === 'vote_average.desc') {
      return (b.vote_average || 0) - (a.vote_average || 0);
    }
    if (filters.sortBy === 'primary_release_date.desc') {
      return (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || '');
    }
    if (filters.sortBy === 'primary_release_date.asc') {
      return (a.release_date || a.first_air_date || '').localeCompare(b.release_date || b.first_air_date || '');
    }
    if (filters.sortBy === 'title.asc') {
      return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    }
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const hasMore = movieRes.totalPages > initialPages || seriesRes.totalPages > initialPages;
  const totalAvailable = (movieRes.totalResults || 0) + (seriesRes.totalResults || 0);

  // Generate readable title & subtitle
  const titleParts: string[] = [];
  if (filters.genres.length > 0) {
    const genreNames = filters.genres
      .map((gid) => GENRE_MAP.find((g) => g.id === gid)?.name || gid)
      .join(' & ');
    titleParts.push(genreNames);
  } else {
    titleParts.push('Cinema Vault');
  }

  const subParts: string[] = [];
  if (filters.language) {
    const langMap: Record<string, string> = {
      en: 'English',
      ja: 'Japanese',
      ko: 'Korean',
      hi: 'Hindi',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      zh: 'Chinese',
    };
    subParts.push(langMap[filters.language] || filters.language.toUpperCase());
  }
  if (filters.year) subParts.push(filters.year);
  if (filters.minRating) subParts.push(`Rated ${filters.minRating}+ ⭐`);
  if (filters.sortBy && filters.sortBy !== 'popularity.desc') {
    const sortLabels: Record<string, string> = {
      'vote_average.desc': 'Top Rated',
      'primary_release_date.desc': 'Newest',
      'primary_release_date.asc': 'Oldest',
      'title.asc': 'A-Z',
    };
    if (sortLabels[filters.sortBy]) subParts.push(sortLabels[filters.sortBy]);
  }

  const subtitleStr = subParts.length > 0 ? subParts.join(' • ') : 'Custom Filtered Discovery';

  return {
    type: 'genre',
    items: merged,
    entityInfo: {
      id: 'custom_filter',
      title: `${titleParts.join(' ')} Discovery`,
      subtitle:
        totalAvailable > 0
          ? `${subtitleStr} • ${totalAvailable.toLocaleString()} Available Titles in Vault`
          : subtitleStr,
      description: `Curated discovery matched across your selected filters in WatchVault.`,
      bannerGradient: 'from-purple-950/80 via-red-950/40 to-transparent',
      badgeBorder: 'border-purple-500/40',
      badgeText: 'text-purple-300',
      totalTitles: merged.length,
      hasMorePages: hasMore,
      lastFetchedPage: initialPages,
      lastFetchedMoviePage: movieRes.lastPageFetched || initialPages,
      lastFetchedTvPage: seriesRes.lastPageFetched || initialPages,
      totalMoviePages: movieRes.totalPages,
      totalTvPages: seriesRes.totalPages,
      totalAvailableTitles: totalAvailable,
    },
    originalQuery: '',
    executedQuery: titleParts.join(' '),
  };
}

export async function loadMoreFilteredCatalog(
  filters: SearchFilterState,
  startMoviePage: number,
  startTvPage: number,
  pageCount: number = 10,
  mediaTypeFilter: 'all' | 'movie' | 'tv' = 'all'
): Promise<{
  items: TMDBMediaItem[];
  lastFetchedMoviePage: number;
  lastFetchedTvPage: number;
  hasMorePages: boolean;
}> {
  const { movieGenreIds, tvGenreIds } = parseGenreIds(filters.genres);
  const yearOpts = parseYearFilter(filters.year);

  const tasks: Promise<{
    type: 'movie' | 'tv';
    results: TMDBMediaItem[];
    totalPages: number;
    lastPageFetched: number;
  }>[] = [];

  if (mediaTypeFilter === 'all' || mediaTypeFilter === 'movie') {
    tasks.push(
      tmdbService
        .discoverAllMedia('movie', {
          withGenres: movieGenreIds,
          minVoteAverage: filters.minRating || undefined,
          language: filters.language || undefined,
          sortBy: filters.sortBy || 'popularity.desc',
          exactYear: yearOpts.exactYear,
          yearGte: yearOpts.yearGte,
          yearLte: yearOpts.yearLte,
          maxPages: pageCount,
          startPage: startMoviePage + 1,
        })
        .then((res) => ({ type: 'movie' as const, ...res }))
        .catch(() => ({ type: 'movie' as const, results: [], totalPages: 0, lastPageFetched: startMoviePage }))
    );
  }

  if (mediaTypeFilter === 'all' || mediaTypeFilter === 'tv') {
    tasks.push(
      tmdbService
        .discoverAllMedia('tv', {
          withGenres: tvGenreIds,
          minVoteAverage: filters.minRating || undefined,
          language: filters.language || undefined,
          sortBy: filters.sortBy || 'popularity.desc',
          exactYear: yearOpts.exactYear,
          yearGte: yearOpts.yearGte,
          yearLte: yearOpts.yearLte,
          maxPages: pageCount,
          startPage: startTvPage + 1,
        })
        .then((res) => ({ type: 'tv' as const, ...res }))
        .catch(() => ({ type: 'tv' as const, results: [], totalPages: 0, lastPageFetched: startTvPage }))
    );
  }

  const responses = await Promise.all(tasks);
  const movieRes = responses.find((r) => r.type === 'movie');
  const tvRes = responses.find((r) => r.type === 'tv');

  const newLastMoviePage = movieRes ? movieRes.lastPageFetched : startMoviePage;
  const newLastTvPage = tvRes ? tvRes.lastPageFetched : startTvPage;

  const hasMoreMovies = movieRes ? movieRes.lastPageFetched < movieRes.totalPages : true;
  const hasMoreTv = tvRes ? tvRes.lastPageFetched < tvRes.totalPages : true;

  const hasMore =
    mediaTypeFilter === 'movie'
      ? hasMoreMovies
      : mediaTypeFilter === 'tv'
      ? hasMoreTv
      : hasMoreMovies || hasMoreTv;

  const combined = responses.flatMap((r) => r.results);

  return {
    items: combined,
    lastFetchedMoviePage: newLastMoviePage,
    lastFetchedTvPage: newLastTvPage,
    hasMorePages: hasMore,
  };
}
