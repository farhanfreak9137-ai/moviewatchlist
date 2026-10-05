'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLibrary } from '@/hooks/useLibrary';
import { TMDBMediaItem } from '@/lib/metadata/tmdb';
import { MediaCard } from '@/components/media/MediaCard';
import { EmptyState } from '@/components/library/EmptyState';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import {
  executeSmartSearch,
  getSmartAutocomplete,
  SmartSearchResult,
  AutocompleteResults,
} from '@/lib/search/searchEngine';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/search/recentSearches';
import {
  Search,
  Film,
  Tv,
  Loader2,
  X,
  Sparkles,
  Shield,
  Tag,
  User,
  ArrowRight,
  BookmarkCheck,
  Flame,
  Star,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  MarvelLogo,
  DCLogo,
  XMenLogo,
  StarWarsLogo,
  PixarLogo,
  StudioGhibliLogo,
  A24Logo,
  DisneyLogo,
} from '@/components/icons/BrandLogos';

const SEARCH_STATE_STORAGE_KEY = 'watchvault_active_search_state';

interface SavedSearchState {
  query: string;
  inputQuery: string;
  searchResult: SmartSearchResult;
  filterType: 'all' | 'movie' | 'tv' | 'in_vault';
  sortBy: 'relevance' | 'rating' | 'release_date' | 'title';
  scrollY: number;
}

function renderHeroBrandLogo(iconType?: string, type?: string) {
  switch (iconType) {
    case 'marvel':
      return <MarvelLogo size="lg" />;
    case 'dc':
      return <DCLogo size="lg" />;
    case 'xmen':
      return <XMenLogo size="lg" />;
    case 'starwars':
      return <StarWarsLogo size="lg" />;
    case 'pixar':
      return <PixarLogo size="lg" />;
    case 'ghibli':
      return <StudioGhibliLogo size="lg" />;
    case 'a24':
      return <A24Logo size="lg" />;
    case 'disney':
      return <DisneyLogo size="lg" />;
    default:
      if (type === 'genre') {
        return (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xl">
            <Tag className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        );
      }
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xl">
          <User className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
        </div>
      );
  }
}

const INSPIRATION_CHIPS = [
  { label: 'Marvel', logo: <MarvelLogo size="sm" />, query: 'Marvel' },
  { label: 'DC Studios', logo: <DCLogo size="sm" />, query: 'DC' },
  { label: 'X-Men', logo: <XMenLogo size="sm" />, query: 'X-Men' },
  { label: 'Star Wars', logo: <StarWarsLogo size="sm" />, query: 'Star Wars' },
  { label: 'Pixar', logo: <PixarLogo size="sm" />, query: 'Pixar' },
  { label: 'Studio Ghibli', logo: <StudioGhibliLogo size="sm" />, query: 'Studio Ghibli' },
  { label: 'A24', logo: <A24Logo size="sm" />, query: 'A24' },
  { label: 'Disney', logo: <DisneyLogo size="sm" />, query: 'Disney' },
  { label: 'Action', logo: <Flame className="w-3.5 h-3.5 text-orange-400" />, query: 'Action' },
  { label: 'Sci-Fi', logo: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />, query: 'Sci-Fi' },
  { label: 'Christopher Nolan', logo: <Film className="w-3.5 h-3.5 text-purple-400" />, query: 'Christopher Nolan' },
  { label: 'Keanu Reeves', logo: <User className="w-3.5 h-3.5 text-blue-400" />, query: 'Keanu Reeves' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';

  const { libraryItems } = useLibrary();

  const [inputQuery, setInputQuery] = useState(queryFromUrl);
  const [executedQuery, setExecutedQuery] = useState(queryFromUrl);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv' | 'in_vault'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'release_date' | 'title'>('relevance');

  const [searchResult, setSearchResult] = useState<SmartSearchResult>({
    type: 'standard',
    items: [],
    originalQuery: '',
    executedQuery: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Autocomplete state
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResults>({
    titles: [],
    actors: [],
    franchises: [],
    genres: [],
  });
  const [selectedAutoIndex, setSelectedAutoIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Restore previous search state when navigating back from title details
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY) : null;
      if (raw) {
        const saved: SavedSearchState = JSON.parse(raw);
        if (
          saved &&
          saved.searchResult?.items?.length > 0 &&
          (!queryFromUrl || queryFromUrl.toLowerCase() === saved.query.toLowerCase())
        ) {
          setInputQuery(saved.inputQuery);
          setExecutedQuery(saved.query);
          setSearchResult(saved.searchResult);
          setFilterType(saved.filterType || 'all');
          setSortBy(saved.sortBy || 'relevance');
          setHasSearched(true);

          if (!queryFromUrl && typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/search?q=${encodeURIComponent(saved.query)}`);
          }

          if (saved.scrollY > 0) {
            setTimeout(() => {
              window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
            }, 60);
          }
          return;
        }
      }
    } catch (err) {
      console.error('Failed to restore search state:', err);
    }

    if (queryFromUrl) {
      setInputQuery(queryFromUrl);
      handleExecuteSearch(queryFromUrl);
    }
  }, [queryFromUrl]);

  // Live autocomplete triggered starting from 1st letter, but NOT if search just completed
  useEffect(() => {
    const trimmed = inputQuery.trim();

    if (!trimmed || (hasSearched && trimmed.toLowerCase() === executedQuery.toLowerCase())) {
      setAutocompleteResults({ titles: [], actors: [], franchises: [], genres: [] });
      setSelectedAutoIndex(-1);
      return;
    }

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Fast 80ms debounce so 1st letter is near instantaneous
    autocompleteTimeoutRef.current = setTimeout(async () => {
      const results = await getSmartAutocomplete(trimmed, libraryItems);
      setAutocompleteResults(results);
      setIsAutocompleteOpen(true);
      setSelectedAutoIndex(-1);
    }, 80);

    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, [inputQuery, libraryItems, hasSearched, executedQuery]);

  // Execute full search and populate results
  const handleExecuteSearch = async (queryToRun: string, forceOriginal = false) => {
    const trimmed = queryToRun.trim();
    if (!trimmed) return;

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
    setIsAutocompleteOpen(false);
    inputRef.current?.blur();

    setInputQuery(trimmed);
    setExecutedQuery(trimmed);
    setIsLoading(true);
    setHasSearched(true);

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(trimmed)}`);
    }

    // Save to recents
    const updatedRecents = addRecentSearch(trimmed);
    setRecentSearches(updatedRecents);

    try {
      const result = await executeSmartSearch(trimmed, {
        libraryItems,
        forceOriginal,
      });
      setSearchResult(result);

      if (typeof window !== 'undefined') {
        const stateToSave: SavedSearchState = {
          query: trimmed,
          inputQuery: trimmed,
          searchResult: result,
          filterType,
          sortBy,
          scrollY: 0,
        };
        sessionStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
      }
    } catch (err) {
      console.error('Search execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation across input and autocomplete popup
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allItems: string[] = [];
    if (autocompleteResults.didYouMean) allItems.push(autocompleteResults.didYouMean);
    autocompleteResults.franchises.forEach((i) => allItems.push(i.queryToExecute));
    autocompleteResults.genres.forEach((i) => allItems.push(i.queryToExecute));
    autocompleteResults.actors.forEach((i) => allItems.push(i.queryToExecute));
    autocompleteResults.titles.forEach((i) => allItems.push(i.queryToExecute));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isAutocompleteOpen && inputQuery.trim().length > 0) {
        setIsAutocompleteOpen(true);
        return;
      }
      setSelectedAutoIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAutoIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      setIsAutocompleteOpen(false);
      inputRef.current?.blur();
      if (isAutocompleteOpen && selectedAutoIndex >= 0 && selectedAutoIndex < allItems.length) {
        handleExecuteSearch(allItems[selectedAutoIndex]);
      } else {
        handleExecuteSearch(inputQuery);
      }
    } else if (e.key === 'Escape') {
      setIsAutocompleteOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
    setIsAutocompleteOpen(false);
    inputRef.current?.blur();
    handleExecuteSearch(inputQuery);
  };

  // Filter & Sort Pipeline
  const filteredAndSortedResults = useMemo(() => {
    let list = [...searchResult.items];

    // 1. Media Type Filter
    if (filterType === 'movie') {
      list = list.filter((item) => (item.media_type || (item.title ? 'movie' : 'tv')) === 'movie');
    } else if (filterType === 'tv') {
      list = list.filter((item) => (item.media_type || (item.name ? 'tv' : 'movie')) === 'tv');
    } else if (filterType === 'in_vault') {
      const vaultTmdbIds = new Set(libraryItems.map((li) => li.tmdb_id));
      list = list.filter((item) => vaultTmdbIds.has(item.id));
    }

    // 2. Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'release_date') {
      list.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';
        return dateB.localeCompare(dateA);
      });
    } else if (sortBy === 'title') {
      list.sort((a, b) => {
        const titleA = a.title || a.name || '';
        const titleB = b.title || b.name || '';
        return titleA.localeCompare(titleB);
      });
    } else {
      // Relevance / Popularity
      list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    return list;
  }, [searchResult.items, filterType, sortBy, libraryItems]);

  const vaultItemsCount = useMemo(() => {
    const vaultTmdbIds = new Set(libraryItems.map((li) => li.tmdb_id));
    return searchResult.items.filter((item) => vaultTmdbIds.has(item.id)).length;
  }, [searchResult.items, libraryItems]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-red-500" />
          <span>Search & Cinematic Vault</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Explore movies, series, studios, actors, and genres with instant typo correction and smart suggestions.
        </p>
      </div>

      {/* Main Search Bar wrapped in form with 1st-letter Autocomplete and Search button */}
      <form onSubmit={handleFormSubmit} action="javascript:void(0);" className="relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onFocus={() => {
                if (inputQuery.trim() && (!hasSearched || inputQuery.trim().toLowerCase() !== executedQuery.toLowerCase())) {
                  setIsAutocompleteOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by title, actor, 'Marvel', 'DC', 'Action'..."
              autoFocus
              className="w-full bg-[#121420] border-2 border-white/10 hover:border-white/20 focus:border-red-500 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none transition-all shadow-xl"
            />
            {isLoading ? (
              <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />
            ) : inputQuery ? (
              <button
                type="button"
                onClick={() => {
                  setInputQuery('');
                  setAutocompleteResults({ titles: [], actors: [], franchises: [], genres: [] });
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-5 h-5" />
              </button>
            ) : null}
          </div>

          {/* Explicit "OK / Search" Button */}
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="flex items-center gap-2 px-5 py-3.5 bg-red-600 hover:bg-red-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm rounded-2xl shadow-lg shadow-red-600/30 transition-all cursor-pointer shrink-0"
          >
            <span>Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Instant Categorized Dropdown */}
        <SearchAutocomplete
          isOpen={isAutocompleteOpen}
          onClose={() => setIsAutocompleteOpen(false)}
          results={autocompleteResults}
          query={inputQuery}
          recentSearches={recentSearches}
          selectedIndex={selectedAutoIndex}
          onSelectQuery={(q) => handleExecuteSearch(q)}
          onRemoveRecentSearch={(q) => setRecentSearches(removeRecentSearch(q))}
          onClearAllRecentSearches={() => {
            clearRecentSearches();
            setRecentSearches([]);
          }}
        />
      </form>

      {/* Quick Inspiration & Trending Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 pl-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Quick explore:
        </span>
        {INSPIRATION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleExecuteSearch(chip.query)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#121422] hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
          >
            <span className="shrink-0 flex items-center">{chip.logo}</span>
            <span className="font-medium">{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Typo Correction / "Did You Mean" Banner */}
      {searchResult.correctedFrom && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm">
              Showing results for{' '}
              <strong className="font-bold underline underline-offset-4 text-white">
                {searchResult.executedQuery}
              </strong>{' '}
              (searched for &quot;{searchResult.correctedFrom}&quot;).
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleExecuteSearch(searchResult.correctedFrom!, true)}
            className="text-xs underline text-amber-400/80 hover:text-amber-200 transition-colors ml-4 shrink-0 cursor-pointer"
          >
            Search for &quot;{searchResult.correctedFrom}&quot; instead
          </button>
        </div>
      )}

      {/* "Did You Mean" chip when query was NOT auto-corrected but has a high-confidence match */}
      {!searchResult.correctedFrom && searchResult.didYouMean && (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs sm:text-sm text-red-300">
          <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
          <span>Did you mean:</span>
          <button
            type="button"
            onClick={() => handleExecuteSearch(searchResult.didYouMean!)}
            className="font-semibold text-white underline underline-offset-4 hover:text-red-300 transition-colors cursor-pointer"
          >
            {searchResult.didYouMean}
          </button>
        </div>
      )}

      {/* Specialized Hero Banner for Franchises (Marvel/DC/X-Men), Genres, and Actors */}
      {searchResult.entityInfo && (
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-6 sm:p-8 border bg-gradient-to-r shadow-2xl transition-all',
            searchResult.entityInfo.bannerGradient || 'from-[#171a2a] to-transparent',
            searchResult.entityInfo.badgeBorder || 'border-white/10'
          )}
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {searchResult.entityInfo.imageUrl ? (
              <img
                src={searchResult.entityInfo.imageUrl}
                alt={searchResult.entityInfo.title}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/20 shadow-2xl shrink-0"
              />
            ) : (
              <div className="shrink-0 flex items-center justify-center">
                {renderHeroBrandLogo(searchResult.entityInfo.iconType, searchResult.type)}
              </div>
            )}

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-white/5',
                    searchResult.entityInfo.badgeBorder || 'border-white/20',
                    searchResult.entityInfo.badgeText || 'text-white'
                  )}
                >
                  {searchResult.type === 'franchise'
                    ? 'Studio & Universe'
                    : searchResult.type === 'genre'
                    ? 'Genre Catalog'
                    : 'Filmography & Actor'}
                </span>
                {searchResult.entityInfo.totalTitles ? (
                  <span className="text-xs text-slate-300">
                    • {searchResult.entityInfo.totalTitles} titles discovered
                  </span>
                ) : null}
              </div>

              <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                {searchResult.entityInfo.title}
              </h2>
              {searchResult.entityInfo.subtitle && (
                <p className="text-xs sm:text-sm font-medium text-slate-300">
                  {searchResult.entityInfo.subtitle}
                </p>
              )}
              {searchResult.entityInfo.description && (
                <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl pt-1">
                  {searchResult.entityInfo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter & Sorting Toolbar */}
      {hasSearched && searchResult.items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Media Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0',
                filterType === 'all'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-[#10121a] text-slate-400 hover:text-white border border-white/5'
              )}
            >
              All ({searchResult.items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('movie')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0',
                filterType === 'movie'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-[#10121a] text-slate-400 hover:text-white border border-white/5'
              )}
            >
              <Film className="w-3.5 h-3.5" />
              <span>
                Movies (
                {
                  searchResult.items.filter(
                    (i) => (i.media_type || (i.title ? 'movie' : 'tv')) === 'movie'
                  ).length
                }
                )
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('tv')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0',
                filterType === 'tv'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-[#10121a] text-slate-400 hover:text-white border border-white/5'
              )}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>
                Series (
                {
                  searchResult.items.filter(
                    (i) => (i.media_type || (i.name ? 'tv' : 'movie')) === 'tv'
                  ).length
                }
                )
              </span>
            </button>
            {vaultItemsCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('in_vault')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0',
                  filterType === 'in_vault'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20'
                )}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>In My Vault ({vaultItemsCount})</span>
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#121420] text-xs text-white border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="relevance">Popularity / Relevance</option>
              <option value="rating">Rating (Highest First)</option>
              <option value="release_date">Release Date (Newest)</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {/* Search Results Grid */}
      {hasSearched && filteredAndSortedResults.length === 0 && !isLoading ? (
        <EmptyState
          type="search"
          title={`No results found for "${executedQuery}"`}
          description="Check the spelling, try another title, search for Marvel or DC, or browse by actors and genres."
        />
      ) : filteredAndSortedResults.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400">
              Found {filteredAndSortedResults.length} title
              {filteredAndSortedResults.length === 1 ? '' : 's'}
            </h2>
          </div>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            onClickCapture={() => {
              // Persist exact scroll position and filter state when navigating to title
              try {
                if (typeof window !== 'undefined') {
                  const raw = sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY);
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    sessionStorage.setItem(
                      SEARCH_STATE_STORAGE_KEY,
                      JSON.stringify({
                        ...parsed,
                        scrollY: window.scrollY || 0,
                        filterType,
                        sortBy,
                      })
                    );
                  }
                }
              } catch (e) {
                console.error(e);
              }
            }}
          >
            {filteredAndSortedResults.map((item) => (
              <MediaCard
                key={`${item.media_type}-${item.id}`}
                id={item.id}
                title={item.title || item.name || 'Untitled'}
                mediaType={(item.media_type || (item.name ? 'tv' : 'movie')) as any}
                posterPath={item.poster_path}
                releaseDate={item.release_date || item.first_air_date}
                voteAverage={item.vote_average}
              />
            ))}
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="py-20 text-center max-w-md mx-auto text-slate-500 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center text-red-400 shadow-xl">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">Smart Cinematic Search</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Type anything — misspelled titles are automatically corrected. Type <span className="text-red-400 font-semibold">&quot;Marvel&quot;</span> or <span className="text-blue-400 font-semibold">&quot;DC&quot;</span> to see their full universe, <span className="text-amber-400 font-semibold">&quot;Action&quot;</span> for curated genres, or any actor&apos;s name to explore their filmography.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
