'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLibrary } from '@/hooks/useLibrary';
import { TMDBMediaItem } from '@/lib/metadata/tmdb';
import { MediaCard } from '@/components/media/MediaCard';
import { EmptyState } from '@/components/library/EmptyState';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import {
  executeSmartSearch,
  getSmartAutocomplete,
  loadMoreStudioCatalog,
  loadMoreGenreCatalog,
  loadMoreFilteredCatalog,
  SearchFilterState,
  DEFAULT_SEARCH_FILTERS,
  hasActiveSearchFilters,
  SmartSearchResult,
  AutocompleteResults,
  AutocompleteItem,
} from '@/lib/search/searchEngine';
import { SearchFilterDeck } from '@/components/search/SearchFilterDeck';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/search/recentSearches';
import { MediaType } from '@/lib/types';
import {
  Search,
  Film,
  Tv,
  Loader2,
  X,
  Sparkles,
  Tag,
  User,
  ArrowRight,
  BookmarkCheck,
  Flame,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Square,
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
  DreamWorksLogo,
  AnimeLogo,
  WarnerBrosLogo,
} from '@/components/icons/BrandLogos';

const SEARCH_STATE_STORAGE_KEY = 'watchvault_active_search_state';

interface SavedSearchState {
  query: string;
  inputQuery: string;
  searchResult: SmartSearchResult;
  filterType: 'all' | 'movie' | 'tv' | 'in_vault';
  sortBy: 'relevance' | 'rating' | 'release_date' | 'title';
  scrollY: number;
  currentPage?: number;
  pageSize?: number | 'all';
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-8 pb-4">
      {/* First Page */}
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[#121422] border border-white/5 hover:border-white/20 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
        title="First Page"
      >
        <ChevronsLeft className="w-4 h-4" />
        <span className="hidden sm:inline">First</span>
      </button>

      {/* Prev Page */}
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[#121422] border border-white/5 hover:border-white/20 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
        title="Previous Page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* Numbered buttons */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-9 h-9 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center',
                currentPage === p
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-[#121422] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
              )}
            >
              {p}
            </button>
          ) : (
            <span key={`dots-${idx}`} className="px-1 text-slate-500 text-xs select-none">
              •••
            </span>
          )
        )}
      </div>

      {/* Next Page */}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[#121422] border border-white/5 hover:border-white/20 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
        title="Next Page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Last Page */}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[#121422] border border-white/5 hover:border-white/20 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
        title="Last Page"
      >
        <span className="hidden sm:inline">Last</span>
        <ChevronsRight className="w-4 h-4" />
      </button>
    </div>
  );
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
    case 'dreamworks':
      return <DreamWorksLogo size="lg" />;
    case 'anime':
      return <AnimeLogo size="lg" />;
    case 'warnerbros':
      return <WarnerBrosLogo size="lg" />;
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
  { label: 'Bollywood', logo: <span className="text-xs">🇮🇳</span>, query: 'Bollywood' },
  { label: 'Marvel', logo: <MarvelLogo size="sm" />, query: 'Marvel' },
  { label: 'DC Studios', logo: <DCLogo size="sm" />, query: 'DC' },
  { label: 'K-Drama', logo: <span className="text-xs">🇰🇷</span>, query: 'Korean' },
  { label: 'HBO', logo: <span className="text-[11px] font-black text-purple-400">HBO</span>, query: 'HBO' },
  { label: 'Anime', logo: <AnimeLogo size="sm" />, query: 'Anime' },
  { label: 'Paramount', logo: <span className="text-[11px] font-bold text-sky-400">PARA</span>, query: 'Paramount' },
  { label: 'Warner Bros', logo: <WarnerBrosLogo size="sm" />, query: 'Warner Bros' },
  { label: 'Pixar', logo: <PixarLogo size="sm" />, query: 'Pixar' },
  { label: 'Disney', logo: <DisneyLogo size="sm" />, query: 'Disney' },
  { label: 'DreamWorks', logo: <DreamWorksLogo size="sm" />, query: 'DreamWorks' },
  { label: 'Studio Ghibli', logo: <StudioGhibliLogo size="sm" />, query: 'Studio Ghibli' },
  { label: 'X-Men', logo: <XMenLogo size="sm" />, query: 'X-Men' },
  { label: 'Star Wars', logo: <StarWarsLogo size="sm" />, query: 'Star Wars' },
  { label: 'A24', logo: <A24Logo size="sm" />, query: 'A24' },
  { label: 'Action', logo: <Flame className="w-3.5 h-3.5 text-orange-400" />, query: 'Action' },
  { label: 'Sci-Fi', logo: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />, query: 'Sci-Fi' },
  { label: 'Christopher Nolan', logo: <Film className="w-3.5 h-3.5 text-purple-400" />, query: 'Christopher Nolan' },
  { label: 'Keanu Reeves', logo: <User className="w-3.5 h-3.5 text-blue-400" />, query: 'Keanu Reeves' },
];

function getItemMediaType(item: TMDBMediaItem): 'movie' | 'tv' {
  if (item.media_type === 'tv' || item.media_type === 'movie') return item.media_type;
  if (item.first_air_date && !item.release_date) return 'tv';
  if (item.release_date && !item.first_air_date) return 'movie';
  if (item.name && !item.title) return 'tv';
  if (item.title && !item.name) return 'movie';
  return item.name ? 'tv' : 'movie';
}

function QuickExplorePills({
  chips,
  onSelectQuery,
}: {
  chips: typeof INSPIRATION_CHIPS;
  onSelectQuery: (query: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const handleScroll = (dir: 'left' | 'right') => {
    if (!containerRef.current) return;
    const amount = dir === 'left' ? -280 : 280;
    containerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    startScrollLeftRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative group/pills select-none py-1">
      {/* Left Chevron Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#131625]/95 hover:bg-[#1a1e35] text-white border border-white/20 backdrop-blur-md shadow-2xl items-center justify-center cursor-pointer transition-all hover:scale-110"
          title="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Right Chevron Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#131625]/95 hover:bg-[#1a1e35] text-white border border-white/20 backdrop-blur-md shadow-2xl items-center justify-center cursor-pointer transition-all hover:scale-110"
          title="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable Track */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs cursor-grab active:cursor-grabbing px-1"
      >
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 pl-1 pointer-events-none">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Quick explore:
        </span>
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => {
              if (!hasDraggedRef.current) {
                onSelectQuery(chip.query);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#121422] hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer pointer-events-auto active:scale-95"
          >
            <span className="shrink-0 flex items-center">{chip.logo}</span>
            <span className="font-medium">{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const typeFromUrl = searchParams.get('type') || '';
  const personIdFromUrl = searchParams.get('personId');

  const { libraryItems } = useLibrary();

  const [filters, setFilters] = useState<SearchFilterState>(DEFAULT_SEARCH_FILTERS);
  const [inputQuery, setInputQuery] = useState(queryFromUrl);
  const [executedQuery, setExecutedQuery] = useState(queryFromUrl);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv' | 'in_vault'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'release_date' | 'title'>('relevance');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(36);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingEverything, setIsLoadingEverything] = useState(false);
  const stopLoadingEverythingRef = useRef(false);
  const resultsTopRef = useRef<HTMLDivElement>(null);

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
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    return typeof window !== 'undefined' ? getRecentSearches() : [];
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Execute full search and populate results
  const handleExecuteSearch = useCallback(
    async (
      queryToRun: string,
      forceOriginal = false,
      explicitSearchType?: 'all' | 'person' | 'movie' | 'tv',
      explicitPersonId?: number,
      overrideFilters?: SearchFilterState
    ) => {
      const activeFilters = overrideFilters || filters;
      const trimmed = queryToRun.trim();
      const hasFilters = hasActiveSearchFilters(activeFilters);

      if (!trimmed && !hasFilters) return;

      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      setIsAutocompleteOpen(false);
      inputRef.current?.blur();

      setInputQuery(trimmed);
      setExecutedQuery(trimmed || 'Custom Discovery');
      setFilterType('all');
      setSortBy('relevance');
      setCurrentPage(1);
      setIsLoading(true);
      setHasSearched(true);

      const activeType = explicitSearchType || (typeFromUrl === 'person' ? 'person' : undefined);
      const activePersonId = explicitPersonId || (personIdFromUrl ? Number(personIdFromUrl) : undefined);

      if (typeof window !== 'undefined') {
        const url = activeType === 'person'
          ? `/search?q=${encodeURIComponent(trimmed)}&type=person${activePersonId ? `&personId=${activePersonId}` : ''}`
          : trimmed
          ? `/search?q=${encodeURIComponent(trimmed)}`
          : `/search`;
        window.history.replaceState(null, '', url);
      }

      // Save to recents
      if (trimmed) {
        const updatedRecents = addRecentSearch(trimmed);
        setRecentSearches(updatedRecents);
      }

      try {
        const result = await executeSmartSearch(trimmed, {
          libraryItems,
          forceOriginal,
          searchType: activeType,
          personId: activePersonId,
          filters: activeFilters,
        });
        setSearchResult(result);

        if (typeof window !== 'undefined') {
          const stateToSave: SavedSearchState = {
            query: trimmed,
            inputQuery: trimmed,
            searchResult: result,
            filterType: 'all',
            sortBy: 'relevance',
            scrollY: 0,
            currentPage: 1,
            pageSize,
          };
          sessionStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
        }
      } catch (err) {
        console.error('Search execution failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [typeFromUrl, personIdFromUrl, libraryItems, pageSize, filters]
  );

  const handleSelectItem = (item: AutocompleteItem) => {
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
    setIsAutocompleteOpen(false);
    inputRef.current?.blur();

    addRecentSearch(item.title || item.queryToExecute);
    setRecentSearches(getRecentSearches());

    if (item.category === 'title') {
      const realId = String(item.id).startsWith('local_')
        ? String(item.id).replace('local_', '')
        : item.id;
      router.push(`/title?id=${encodeURIComponent(realId)}&type=${encodeURIComponent(item.mediaType || 'movie')}`);
    } else if (item.category === 'actor') {
      handleExecuteSearch(item.title, false, 'person', Number(item.id));
    } else {
      handleExecuteSearch(item.queryToExecute);
    }
  };

  const isRestoredRef = useRef(false);
  const lastUrlQueryRef = useRef(queryFromUrl);

  // Sync updated filter/sort/pagination preferences to sessionStorage without re-triggering search
  useEffect(() => {
    if (!hasSearched || !executedQuery) return;
    try {
      const raw = sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY);
      if (raw) {
        const saved: SavedSearchState = JSON.parse(raw);
        const updated: SavedSearchState = {
          ...saved,
          filterType,
          sortBy,
          currentPage,
          pageSize,
        };
        sessionStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to update search state in sessionStorage:', err);
    }
  }, [filterType, sortBy, currentPage, pageSize, hasSearched, executedQuery]);

  const handleClearSearch = useCallback(() => {
    setInputQuery('');
    setExecutedQuery('');
    setFilters(DEFAULT_SEARCH_FILTERS);
    setSearchResult({
      type: 'standard',
      items: [],
      originalQuery: '',
      executedQuery: '',
    });
    setHasSearched(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SEARCH_STATE_STORAGE_KEY);
      sessionStorage.removeItem('watchvault_returning_from_title');
      window.history.replaceState(null, '', '/search');
    }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    window.addEventListener('watchvault-clear-search', handleClearSearch);
    return () => window.removeEventListener('watchvault-clear-search', handleClearSearch);
  }, [handleClearSearch]);

  // Restore previous search state ONLY when navigating back from title details
  useEffect(() => {
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;

    try {
      const isReturningFromTitle =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('watchvault_returning_from_title') === 'true'
          : false;

      // Clean up the one-time return flag so subsequent reloads don't resurrect old state
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('watchvault_returning_from_title');
      }

      if (isReturningFromTitle) {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY) : null;
        if (raw) {
          const saved: SavedSearchState = JSON.parse(raw);
          if (saved && saved.searchResult?.items?.length > 0) {
            setInputQuery(saved.inputQuery);
            setExecutedQuery(saved.query);
            setSearchResult(saved.searchResult);
            setFilterType(saved.filterType || 'all');
            setSortBy(saved.sortBy || 'relevance');
            if (saved.currentPage) setCurrentPage(saved.currentPage);
            if (saved.pageSize) setPageSize(saved.pageSize);
            setHasSearched(true);

            if (saved.scrollY > 0) {
              setTimeout(() => {
                window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
              }, 60);
            }
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore search state:', err);
    }

    if (queryFromUrl) {
      setInputQuery(queryFromUrl);
      handleExecuteSearch(
        queryFromUrl,
        false,
        typeFromUrl === 'person' ? 'person' : undefined,
        personIdFromUrl ? Number(personIdFromUrl) : undefined
      );
    } else {
      // Direct visit or fresh reload of /search without ?q=: clean start!
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SEARCH_STATE_STORAGE_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL query changes if navigated externally while already mounted
  useEffect(() => {
    if (!isRestoredRef.current) return;
    if (queryFromUrl && queryFromUrl !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = queryFromUrl;
      setInputQuery(queryFromUrl);
      handleExecuteSearch(
        queryFromUrl,
        false,
        typeFromUrl === 'person' ? 'person' : undefined,
        personIdFromUrl ? Number(personIdFromUrl) : undefined
      );
    }
  }, [queryFromUrl, typeFromUrl, personIdFromUrl, handleExecuteSearch]);

  // Live autocomplete triggered starting from 1st letter, but NOT if search just completed
  useEffect(() => {
    const trimmed = inputQuery.trim();

    if (!trimmed || (hasSearched && trimmed.toLowerCase() === executedQuery.toLowerCase())) {
      const resetTimer = setTimeout(() => {
        setAutocompleteResults({ titles: [], actors: [], franchises: [], genres: [] });
        setSelectedAutoIndex(-1);
      }, 0);
      return () => clearTimeout(resetTimer);
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

  const flattenedList = useMemo(() => {
    const list: Array<
      | { type: 'didYouMean'; data: string }
      | { type: 'item'; data: AutocompleteItem }
    > = [];
    if (autocompleteResults.didYouMean) {
      list.push({ type: 'didYouMean', data: autocompleteResults.didYouMean });
    }
    autocompleteResults.franchises.forEach((i) => list.push({ type: 'item', data: i }));
    autocompleteResults.genres.forEach((i) => list.push({ type: 'item', data: i }));
    autocompleteResults.actors.forEach((i) => list.push({ type: 'item', data: i }));
    autocompleteResults.titles.forEach((i) => list.push({ type: 'item', data: i }));
    return list;
  }, [autocompleteResults]);

  // Keyboard navigation across input and autocomplete popup
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isAutocompleteOpen && inputQuery.trim().length > 0) {
        setIsAutocompleteOpen(true);
        return;
      }
      setSelectedAutoIndex((prev) => (prev + 1 < flattenedList.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAutoIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flattenedList.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      setIsAutocompleteOpen(false);
      inputRef.current?.blur();
      if (isAutocompleteOpen && selectedAutoIndex >= 0 && selectedAutoIndex < flattenedList.length) {
        const selected = flattenedList[selectedAutoIndex];
        if (selected.type === 'item') {
          handleSelectItem(selected.data as AutocompleteItem);
          return;
        } else if (selected.type === 'didYouMean') {
          handleExecuteSearch(selected.data);
          return;
        }
      }
      handleExecuteSearch(inputQuery);
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
      list = list.filter((item) => getItemMediaType(item) === 'movie');
    } else if (filterType === 'tv') {
      list = list.filter((item) => getItemMediaType(item) === 'tv');
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

  const totalItems = filteredAndSortedResults.length;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / (pageSize as number)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedResults = useMemo(() => {
    if (pageSize === 'all') return filteredAndSortedResults;
    const start = (safeCurrentPage - 1) * (pageSize as number);
    return filteredAndSortedResults.slice(start, start + (pageSize as number));
  }, [filteredAndSortedResults, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  const handleLoadMoreCatalog = async () => {
    if (!searchResult.entityInfo?.id || isLoadingMore || isLoadingEverything) return;
    setIsLoadingMore(true);
    try {
      if (searchResult.type === 'genre') {
        const startMoviePage =
          searchResult.entityInfo.lastFetchedMoviePage ||
          searchResult.entityInfo.lastFetchedPage ||
          15;
        const startTvPage =
          searchResult.entityInfo.lastFetchedTvPage ||
          searchResult.entityInfo.lastFetchedPage ||
          15;
        const mediaFilter =
          filterType === 'movie' ? 'movie' : filterType === 'tv' ? 'tv' : 'all';

        let additional: TMDBMediaItem[] = [];
        let nextMoviePage = startMoviePage;
        let nextTvPage = startTvPage;
        let hasMorePages = true;

        if (searchResult.entityInfo.id === 'custom_filter' && hasActiveSearchFilters(filters)) {
          const res = await loadMoreFilteredCatalog(
            filters,
            startMoviePage,
            startTvPage,
            10,
            mediaFilter
          );
          additional = res.items;
          nextMoviePage = res.lastFetchedMoviePage;
          nextTvPage = res.lastFetchedTvPage;
          hasMorePages = res.hasMorePages;
        } else {
          const res = await loadMoreGenreCatalog(
            String(searchResult.entityInfo.id),
            startMoviePage,
            startTvPage,
            10,
            mediaFilter
          );
          additional = res.items;
          nextMoviePage = res.lastFetchedMoviePage;
          nextTvPage = res.lastFetchedTvPage;
          hasMorePages = res.hasMorePages;
        }

        if (additional && additional.length > 0) {
          setSearchResult((prev) => {
            const map = new Map<string, TMDBMediaItem>();
            prev.items.forEach((item) => {
              const key = `${getItemMediaType(item)}_${item.id}`;
              map.set(key, item);
            });
            additional.forEach((item) => {
              const key = `${getItemMediaType(item)}_${item.id}`;
              if (!map.has(key)) map.set(key, item);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => (b.popularity || 0) - (a.popularity || 0)
            );
            return {
              ...prev,
              items: merged,
              entityInfo: prev.entityInfo
                ? {
                    ...prev.entityInfo,
                    totalTitles: merged.length,
                    lastFetchedPage: Math.max(nextMoviePage, nextTvPage),
                    lastFetchedMoviePage: nextMoviePage,
                    lastFetchedTvPage: nextTvPage,
                    hasMorePages,
                  }
                : undefined,
            };
          });
        } else {
          setSearchResult((prev) => ({
            ...prev,
            entityInfo: prev.entityInfo ? { ...prev.entityInfo, hasMorePages: false } : undefined,
          }));
        }
      } else {
        const startPage = searchResult.entityInfo.lastFetchedPage || 15;
        const additional = await loadMoreStudioCatalog(
          String(searchResult.entityInfo.id),
          startPage,
          5
        );
        if (additional && additional.length > 0) {
          setSearchResult((prev) => {
            const map = new Map<string, TMDBMediaItem>();
            prev.items.forEach((item) => {
              const key = `${getItemMediaType(item)}_${item.id}`;
              map.set(key, item);
            });
            additional.forEach((item) => {
              const key = `${getItemMediaType(item)}_${item.id}`;
              if (!map.has(key)) map.set(key, item);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => (b.popularity || 0) - (a.popularity || 0)
            );
            return {
              ...prev,
              items: merged,
              entityInfo: prev.entityInfo
                ? {
                    ...prev.entityInfo,
                    totalTitles: merged.length,
                    lastFetchedPage: startPage + 5,
                  }
                : undefined,
            };
          });
        }
      }
    } catch (err) {
      console.error('Failed to load more catalog:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadEverythingCatalog = async () => {
    if (!searchResult.entityInfo?.id || isLoadingMore || isLoadingEverything) return;
    setIsLoadingEverything(true);
    stopLoadingEverythingRef.current = false;

    try {
      let currentMoviePage =
        searchResult.entityInfo.lastFetchedMoviePage ||
        searchResult.entityInfo.lastFetchedPage ||
        15;
      let currentTvPage =
        searchResult.entityInfo.lastFetchedTvPage ||
        searchResult.entityInfo.lastFetchedPage ||
        15;
      let hasMore = searchResult.entityInfo.hasMorePages ?? true;
      const mediaFilter =
        filterType === 'movie' ? 'movie' : filterType === 'tv' ? 'tv' : 'all';

      // Iteratively load batches of 10 pages each (up to 15 batches = 150 pages = 3,000 titles)
      for (let batch = 0; batch < 15 && hasMore && !stopLoadingEverythingRef.current; batch++) {
        let additional: TMDBMediaItem[] = [];
        let nextMoviePage = currentMoviePage;
        let nextTvPage = currentTvPage;
        let moreAvailable = false;

        if (searchResult.entityInfo.id === 'custom_filter' && hasActiveSearchFilters(filters)) {
          const res = await loadMoreFilteredCatalog(
            filters,
            currentMoviePage,
            currentTvPage,
            10,
            mediaFilter
          );
          additional = res.items;
          nextMoviePage = res.lastFetchedMoviePage;
          nextTvPage = res.lastFetchedTvPage;
          moreAvailable = res.hasMorePages;
        } else {
          const res = await loadMoreGenreCatalog(
            String(searchResult.entityInfo.id),
            currentMoviePage,
            currentTvPage,
            10,
            mediaFilter
          );
          additional = res.items;
          nextMoviePage = res.lastFetchedMoviePage;
          nextTvPage = res.lastFetchedTvPage;
          moreAvailable = res.hasMorePages;
        }

        currentMoviePage = nextMoviePage;
        currentTvPage = nextTvPage;
        hasMore = moreAvailable;

        if (additional && additional.length > 0) {
          setSearchResult((prev) => {
            const map = new Map<string, TMDBMediaItem>();
            prev.items.forEach((item) => {
              const key = `${getItemMediaType(item)}_${item.id}`;
              map.set(key, item);
            });
            additional.forEach((item) => {
              const key = `${getItemMediaType(item)}_${item.id}`;
              if (!map.has(key)) map.set(key, item);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => (b.popularity || 0) - (a.popularity || 0)
            );
            return {
              ...prev,
              items: merged,
              entityInfo: prev.entityInfo
                ? {
                    ...prev.entityInfo,
                    totalTitles: merged.length,
                    lastFetchedPage: Math.max(nextMoviePage, nextTvPage),
                    lastFetchedMoviePage: nextMoviePage,
                    lastFetchedTvPage: nextTvPage,
                    hasMorePages: moreAvailable,
                  }
                : undefined,
            };
          });
        } else {
          break;
        }

        // Brief delay between batches to yield thread
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch (err) {
      console.error('Failed to sync full catalog:', err);
    } finally {
      setIsLoadingEverything(false);
    }
  };

  const handleStopLoadingEverything = () => {
    stopLoadingEverythingRef.current = true;
    setIsLoadingEverything(false);
  };

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
      <form onSubmit={handleFormSubmit} action="javascript:void(0);" className="relative animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            {/* Clickable Search Icon: Clears/Resets if active, or focuses input */}
            <button
              type="button"
              onClick={() => {
                if (inputQuery || hasSearched || hasActiveSearchFilters(filters)) {
                  handleClearSearch();
                } else {
                  inputRef.current?.focus();
                }
              }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg z-10"
              title={inputQuery || hasSearched || hasActiveSearchFilters(filters) ? "Clear & reset search" : "Search"}
            >
              <Search className="w-5 h-5" />
            </button>
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
              className="w-full bg-[#121420] border-2 border-white/10 hover:border-white/20 focus:border-red-500 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none transition-all shadow-xl [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden"
            />
            {isLoading ? (
              <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />
            ) : inputQuery || hasSearched || hasActiveSearchFilters(filters) ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer z-10"
                title="Clear & Reset"
              >
                <X className="w-5 h-5" />
              </button>
            ) : null}
          </div>

          {/* Explicit "OK / Search" Button */}
          <button
            type="submit"
            disabled={(!inputQuery.trim() && !hasActiveSearchFilters(filters)) || isLoading}
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
          onSelectItem={handleSelectItem}
          onRemoveRecentSearch={(q) => setRecentSearches(removeRecentSearch(q))}
          onClearAllRecentSearches={() => {
            clearRecentSearches();
            setRecentSearches([]);
          }}
        />
      </form>

      {/* Dedicated Filter Boxes (Genre, Rating, Language, Year, Sort) */}
      <SearchFilterDeck
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters);
          handleExecuteSearch(inputQuery, false, undefined, undefined, newFilters);
        }}
        onReset={() => {
          setFilters(DEFAULT_SEARCH_FILTERS);
          if (inputQuery.trim()) {
            handleExecuteSearch(inputQuery, false, undefined, undefined, DEFAULT_SEARCH_FILTERS);
          } else {
            setSearchResult({
              type: 'standard',
              items: [],
              originalQuery: '',
              executedQuery: '',
            });
            setHasSearched(false);
          }
        }}
      />

      {/* Quick Inspiration & Trending Chips with Desktop Mouse-Wheel & Drag Controls */}
      <QuickExplorePills
        chips={INSPIRATION_CHIPS}
        onSelectQuery={(q) => handleExecuteSearch(q)}
      />

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
                  <span className="text-xs text-slate-300 flex items-center gap-1.5">
                    • {searchResult.entityInfo.totalTitles} titles discovered
                    {searchResult.entityInfo.hasMorePages && (
                      <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Deep Catalog
                      </span>
                    )}
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
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
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
              onClick={() => {
                setFilterType('movie');
                setCurrentPage(1);
              }}
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
                    (i) => getItemMediaType(i) === 'movie'
                  ).length
                }
                )
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('tv');
                setCurrentPage(1);
              }}
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
                    (i) => getItemMediaType(i) === 'tv'
                  ).length
                }
                )
              </span>
            </button>
            {vaultItemsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('in_vault');
                  setCurrentPage(1);
                }}
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
              onChange={(e) => {
                setSortBy(e.target.value as 'relevance' | 'rating' | 'release_date' | 'title');
                setCurrentPage(1);
              }}
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
        <div ref={resultsTopRef} className="scroll-mt-24 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-white/5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-white">
                Found {filteredAndSortedResults.length} title
                {filteredAndSortedResults.length === 1 ? '' : 's'}
              </h2>
              {pageSize !== 'all' && totalPages > 1 && (
                <span className="text-xs text-slate-400">
                  • Showing {(safeCurrentPage - 1) * (pageSize as number) + 1}–
                  {Math.min(safeCurrentPage * (pageSize as number), filteredAndSortedResults.length)} (Page{' '}
                  {safeCurrentPage} of {totalPages})
                </span>
              )}
            </div>

            {/* Items Per Page View Toggle */}
            <div className="flex items-center gap-1 text-xs self-start sm:self-auto">
              <span className="text-slate-400 text-[11px] font-medium mr-1">View:</span>
              {[36, 72].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    pageSize === size
                      ? 'bg-red-600/25 border border-red-500/50 text-red-300 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
                  )}
                >
                  {size} / page
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPageSize('all');
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  pageSize === 'all'
                    ? 'bg-red-600/25 border border-red-500/50 text-red-300 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
                )}
              >
                All ({filteredAndSortedResults.length})
              </button>
            </div>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            onClickCapture={() => {
              // Persist exact scroll position, page, and filter state when navigating to title
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
                        currentPage: safeCurrentPage,
                        pageSize,
                      })
                    );
                  }
                }
              } catch (e) {
                console.error(e);
              }
            }}
          >
            {paginatedResults.map((item) => (
              <MediaCard
                key={`${getItemMediaType(item)}-${item.id}`}
                id={item.id}
                title={item.title || item.name || 'Untitled'}
                mediaType={getItemMediaType(item)}
                posterPath={item.poster_path}
                releaseDate={item.release_date || item.first_air_date}
                voteAverage={item.vote_average}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pageSize !== 'all' && totalPages > 1 && (
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}

          {/* Load More & Deep Catalog Sync Controls for studios and genres with huge catalogs */}
          {(searchResult.type === 'franchise' || searchResult.type === 'genre') &&
            searchResult.entityInfo?.hasMorePages && (
              <div className="pt-6 pb-2 flex flex-col items-center justify-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={isLoadingMore || isLoadingEverything}
                    onClick={handleLoadMoreCatalog}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600/20 via-purple-600/20 to-blue-600/20 hover:from-red-600/35 hover:via-purple-600/35 hover:to-blue-600/35 border border-white/15 text-white font-semibold text-sm transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        <span>Loading more titles from catalog...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>
                          {searchResult.type === 'genre'
                            ? `Load 200+ More ${
                                filterType === 'movie'
                                  ? 'Movies'
                                  : filterType === 'tv'
                                  ? 'TV Series'
                                  : 'Titles'
                              }`
                            : 'Load 100 More Titles from Catalog'}
                        </span>
                      </>
                    )}
                  </button>

                  {searchResult.type === 'genre' && (
                    <>
                      {isLoadingEverything ? (
                        <button
                          type="button"
                          onClick={handleStopLoadingEverything}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600/30 hover:bg-red-600/45 border border-red-500/40 text-red-200 font-semibold text-sm transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Square className="w-4 h-4 fill-current text-red-400" />
                          <span>Stop Syncing ({searchResult.items.length} titles loaded)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoadingMore}
                          onClick={handleLoadEverythingCatalog}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600/25 via-red-600/25 to-pink-600/25 hover:from-amber-600/40 hover:via-red-600/40 hover:to-pink-600/40 border border-amber-500/35 text-amber-200 font-semibold text-sm transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>⚡ Load Everything (Deep Catalog Sync)</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 text-center max-w-md">
                  Showing <span className="text-white font-medium">{filteredAndSortedResults.length}</span> of{' '}
                  <span className="text-white font-medium">{searchResult.items.length}</span> loaded titles
                  {searchResult.entityInfo?.totalAvailableTitles ? (
                    <span> • {searchResult.entityInfo.totalAvailableTitles.toLocaleString()} titles total in TMDB vault</span>
                  ) : (
                    <span> • Deep catalog discovery enabled</span>
                  )}
                </p>
              </div>
            )}
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
