'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { getSmartAutocomplete, AutocompleteResults } from '@/lib/search/searchEngine';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/search/recentSearches';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { cn } from '@/lib/utils/cn';

interface GlobalTopSearchBarProps {
  className?: string;
}

export function GlobalTopSearchBar({ className }: GlobalTopSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { libraryItems } = useLibrary();

  const urlQuery = pathname === '/search' ? searchParams.get('q') || '' : '';

  const [query, setQuery] = useState(urlQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResults>({
    titles: [],
    actors: [],
    franchises: [],
    genres: [],
  });
  const [selectedAutoIndex, setSelectedAutoIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state if URL changes on /search
  useEffect(() => {
    if (pathname === '/search') {
      const q = searchParams.get('q') || '';
      setQuery(q);
    }
  }, [pathname, searchParams]);

  // Load recent searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Keyboard shortcut: '/' focuses the top search bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape' && isAutocompleteOpen) {
        setIsAutocompleteOpen(false);
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAutocompleteOpen]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsAutocompleteOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live autocomplete debounced
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setAutocompleteResults({ titles: [], actors: [], franchises: [], genres: [] });
      setSelectedAutoIndex(-1);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await getSmartAutocomplete(trimmed, libraryItems);
        setAutocompleteResults(results);
        setSelectedAutoIndex(-1);
      } catch (err) {
        console.error('Top search autocomplete error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 140);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, libraryItems]);

  const handleExecuteSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsAutocompleteOpen(false);
    setIsFocused(false);
    inputRef.current?.blur();

    addRecentSearch(trimmed);
    setRecentSearches(getRecentSearches());

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSearch(query);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-lg', className)}>
      <form onSubmit={handleFormSubmit} action="javascript:void(0);" className="relative w-full flex items-center">
        <div className="relative w-full flex items-center">
          <Search
            className={cn(
              'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none',
              isFocused ? 'text-red-400' : 'text-slate-400'
            )}
          />

          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsAutocompleteOpen(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setIsAutocompleteOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, series, studios, actors..."
            className={cn(
              'w-full bg-[#12141e] border rounded-xl pl-10 text-sm text-white placeholder-slate-400 transition-all duration-200 outline-none',
              query ? 'pr-16' : 'pr-9',
              isFocused
                ? 'border-red-500/60 ring-2 ring-red-500/20 py-2 bg-[#141724]'
                : 'border-white/10 hover:border-white/20 py-2'
            )}
          />

          {/* Right side items: Loader / Clear button / Slash shortcut */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            ) : query ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setAutocompleteResults({ titles: [], actors: [], franchises: [], genres: [] });
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="submit"
                  className="p-1 text-slate-400 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                  title="Search"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-slate-400 pointer-events-none">
                /
              </kbd>
            )}
          </div>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      <SearchAutocomplete
        isOpen={isAutocompleteOpen && isFocused}
        onClose={() => {
          setIsAutocompleteOpen(false);
          setIsFocused(false);
        }}
        results={autocompleteResults}
        query={query}
        recentSearches={recentSearches}
        selectedIndex={selectedAutoIndex}
        onSelectQuery={(selectedQuery) => {
          setQuery(selectedQuery);
          handleExecuteSearch(selectedQuery);
        }}
        onRemoveRecentSearch={(searchToRemove) => {
          setRecentSearches(removeRecentSearch(searchToRemove));
        }}
        onClearAllRecentSearches={() => {
          clearRecentSearches();
          setRecentSearches([]);
        }}
      />
    </div>
  );
}
