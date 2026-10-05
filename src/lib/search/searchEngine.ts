/**
 * Unified Smart Search Engine for WatchVault.
 * Handles Franchises (Marvel, DC, etc.), Genres (Action, etc.), Actors/Filmography,
 * Typo Correction with Levenshtein Distance, 1st-Letter Autocomplete, and Offline Search.
 */

import { tmdbService, TMDBMediaItem, TMDBPersonResult, getImageUrl } from '../metadata/tmdb';
import { LibraryItem, MediaType } from '../types';
import { matchFranchise, matchGenre, FRANCHISES, GENRE_MAP, FranchiseDefinition, GenreDefinition } from './franchises';
import { SEARCH_DICTIONARY, DictionaryEntry } from './searchDictionary';
import {
  findBestCorrection,
  normalizeSearchString,
  stringSimilarity,
  damerauLevenshteinDistance,
  CorrectionCandidate,
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

/**
 * Executes a full smart search query, automatically handling:
 * 1. Franchise detection (Marvel, DC, Star Wars, Pixar, etc.)
 * 2. Genre detection (Action, Sci-Fi, Horror, etc.)
 * 3. Actor / Director detection (Keanu Reeves, Christopher Nolan, etc.)
 * 4. Typo tolerance and automatic spell-correction fallback
 * 5. Offline search fallback across IndexedDB
 */
export async function executeSmartSearch(
  rawQuery: string,
  options: {
    libraryItems?: LibraryItem[];
    forceOriginal?: boolean;
  } = {}
): Promise<SmartSearchResult> {
  const query = rawQuery.trim();
  const { libraryItems = [], forceOriginal = false } = options;

  if (!query) {
    return {
      type: 'standard',
      items: [],
      originalQuery: '',
      executedQuery: '',
    };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // --- OFFLINE SEARCH FALLBACK ---
  if (!isOnline) {
    return performOfflineSearch(query, libraryItems);
  }

  try {
    const norm = normalizeSearchString(query);

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

    // 3. ACTOR / PERSON RESOLUTION (e.g. "Keanu Reeves", "Cillian Murphy", "Leonardo DiCaprio")
    // Check if query is likely an actor or director
    const personMatch = await checkPersonMatch(query);
    if (personMatch) {
      return await resolvePersonSearch(personMatch, query);
    }

    // 4. STANDARD MULTI-SEARCH WITH TYPO DETECTION
    let items = await tmdbService.searchMulti(query);
    let correctedFrom: string | undefined;
    let didYouMean: string | undefined;

    // Check if query has a potential typo
    const bestCorrection = findBestCorrection(query, SEARCH_DICTIONARY);

    if (items.length === 0 && !forceOriginal) {
      // Zero results: try searching with fuzzy corrected term if available
      if (bestCorrection) {
        const correctedItems = await tmdbService.searchMulti(bestCorrection.corrected);
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

  // 1. Franchise matches
  for (const f of FRANCHISES) {
    const isMatch = f.aliases.some((alias) => {
      const normAlias = normalizeSearchString(alias);
      return normAlias.startsWith(normQuery) || (normQuery.length >= 3 && normAlias.includes(normQuery));
    });
    if (isMatch) {
      results.franchises.push({
        id: f.id,
        title: f.name,
        subtitle: f.description,
        category: 'franchise',
        queryToExecute: f.name,
      });
    }
  }

  // 2. Genre matches
  for (const g of GENRE_MAP) {
    const isMatch = g.aliases.some((alias) => {
      const normAlias = normalizeSearchString(alias);
      return normAlias.startsWith(normQuery) || (normQuery.length >= 3 && normAlias.includes(normQuery));
    });
    if (isMatch) {
      results.genres.push({
        id: g.id,
        title: g.name,
        subtitle: g.description,
        category: 'genre',
        queryToExecute: g.name,
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
  if (typeof navigator !== 'undefined' && navigator.onLine && query.length >= 2) {
    try {
      const liveResults = await tmdbService.searchMultiRaw(query, 1);
      for (const item of liveResults.slice(0, 10)) {
        const rawItem = item as any;
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
  let movies: TMDBMediaItem[] = [];
  let series: TMDBMediaItem[] = [];

  // 1. Fetch using company IDs if available
  if (franchise.companyIds && franchise.companyIds.length > 0) {
    const [compMovies, compTv] = await Promise.all([
      tmdbService.discoverByCompanies(franchise.companyIds, 'movie', 1).catch(() => []),
      tmdbService.discoverByCompanies(franchise.companyIds, 'tv', 1).catch(() => []),
    ]);
    movies = compMovies;
    series = compTv;
  }

  // 2. Query keywords to ensure complete universe coverage
  const keywords = franchise.queryKeywords && franchise.queryKeywords.length > 0
    ? franchise.queryKeywords
    : [franchise.name];

  const keywordSearches = await Promise.all(
    keywords.map((kw) => tmdbService.searchMulti(kw).catch(() => []))
  );

  // Merge and deduplicate
  const map = new Map<string, TMDBMediaItem>();
  [...movies, ...series, ...keywordSearches.flat()].forEach((item) => {
    if (franchise.filterItems && !franchise.filterItems(item)) {
      return;
    }
    const key = `${item.media_type || (item.name ? 'tv' : 'movie')}_${item.id}`;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        media_type: (item.media_type || (item.name ? 'tv' : 'movie')) as MediaType,
      });
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

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
    },
    originalQuery,
    executedQuery: franchise.name,
  };
}

async function resolveGenreSearch(genre: GenreDefinition, originalQuery: string): Promise<SmartSearchResult> {
  const [movies, series] = await Promise.all([
    tmdbService.discoverByGenres([genre.movieGenreId], 'movie', 1).catch(() => []),
    tmdbService.discoverByGenres([genre.tvGenreId], 'tv', 1).catch(() => []),
  ]);

  const map = new Map<string, TMDBMediaItem>();
  [...movies, ...series].forEach((item) => {
    const key = `${item.media_type || (item.name ? 'tv' : 'movie')}_${item.id}`;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        media_type: (item.media_type || (item.name ? 'tv' : 'movie')) as MediaType,
      });
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  return {
    type: 'genre',
    items: merged,
    entityInfo: {
      id: genre.id,
      title: `${genre.name} Catalog`,
      subtitle: `Curated Genre Collection`,
      description: genre.description,
      bannerGradient: genre.bannerGradient,
      badgeBorder: genre.badgeBorder,
      badgeText: genre.badgeText,
      totalTitles: merged.length,
    },
    originalQuery,
    executedQuery: genre.name,
  };
}

async function checkPersonMatch(query: string): Promise<TMDBPersonResult | null> {
  const normQuery = normalizeSearchString(query);
  if (normQuery.length < 3) return null;

  try {
    const people = await tmdbService.searchPerson(query, 1);
    if (!people || people.length === 0) return null;

    const topPerson = people[0];
    const normPersonName = normalizeSearchString(topPerson.name);

    // Person must have minimum notoriety to avoid random obscure extras/music creators
    const popularity = topPerson.popularity || 0;
    if (popularity < 4.0 && normPersonName !== normQuery) {
      return null;
    }

    const similarity = stringSimilarity(normQuery, normPersonName);
    const dist = damerauLevenshteinDistance(normQuery, normPersonName);
    const wordsCount = normQuery.split(' ').filter(Boolean).length;

    // 1. Exact match
    if (normPersonName === normQuery) {
      return topPerson;
    }

    // 2. High similarity or 1-char typo for single/multi word queries
    if (similarity >= 0.88 && dist <= 2 && popularity >= 5.0) {
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
