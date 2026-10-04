'use client';

import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useLibrary } from '@/hooks/useLibrary';
import { tmdbService, TMDBMediaItem } from '@/lib/metadata/tmdb';
import { MediaCard } from '@/components/media/MediaCard';
import { EmptyState } from '@/components/library/EmptyState';
import { Search, Film, Tv, Loader2, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');

  const [results, setResults] = useState<TMDBMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const { libraryItems } = useLibrary();

  useEffect(() => {
    let isMounted = true;

    async function performSearch() {
      const q = debouncedQuery.trim();
      if (!q) {
        setResults([]);
        setSearched(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setSearched(true);

      try {
        // If offline, search local library and cached data
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const lower = q.toLowerCase();
          const localMatches = libraryItems
            .filter((item) => item.title.toLowerCase().includes(lower))
            .map((item) => ({
              id: item.tmdb_id,
              title: item.title,
              name: item.title,
              overview: item.overview || '',
              poster_path: item.poster_path || null,
              backdrop_path: item.backdrop_path || null,
              media_type: item.media_type,
              release_date: item.release_date,
              vote_average: item.rating || 0,
              vote_count: 0,
              popularity: 1,
            }));

          if (isMounted) setResults(localMatches as TMDBMediaItem[]);
        } else {
          // Online TMDB search
          const items = await tmdbService.searchMulti(q);
          if (isMounted) setResults(items);
        }
      } catch (err) {
        console.warn('Search query error:', err);
        // Fallback to local matches
        const lower = q.toLowerCase();
        const localMatches = libraryItems
          .filter((item) => item.title.toLowerCase().includes(lower))
          .map((item) => ({
            id: item.tmdb_id,
            title: item.title,
            name: item.title,
            overview: item.overview || '',
            poster_path: item.poster_path || null,
            backdrop_path: item.backdrop_path || null,
            media_type: item.media_type,
            release_date: item.release_date,
            vote_average: item.rating || 0,
            vote_count: 0,
            popularity: 1,
          }));
        if (isMounted) setResults(localMatches as TMDBMediaItem[]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, libraryItems]);

  const filteredResults = results.filter((item) => {
    if (filterType === 'movie') return item.media_type === 'movie';
    if (filterType === 'tv') return item.media_type === 'tv';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-red-500" />
          <span>Search & Discover</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Explore movies and series from the global metadata catalog and your personal vault.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies, TV series, franchises..."
          autoFocus
          className="w-full bg-[#12141e] border-2 border-white/10 hover:border-white/20 focus:border-red-500 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none transition-all shadow-xl"
        />
        {isLoading ? (
          <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />
        ) : query ? (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            filterType === 'all'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-[#10121a] text-slate-400 hover:text-white border border-white/5'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('movie')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            filterType === 'movie'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-[#10121a] text-slate-400 hover:text-white border border-white/5'
          )}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Movies</span>
        </button>
        <button
          onClick={() => setFilterType('tv')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            filterType === 'tv'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-[#10121a] text-slate-400 hover:text-white border border-white/5'
          )}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Series</span>
        </button>
      </div>

      {/* Search Results Grid */}
      {searched && filteredResults.length === 0 && !isLoading ? (
        <EmptyState
          type="search"
          title={`No results found for "${query}"`}
          description="Check the spelling or try searching for another title, franchise, or actor."
        />
      ) : filteredResults.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400">
              Found {filteredResults.length} title{filteredResults.length === 1 ? '' : 's'}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredResults.map((item) => (
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
      ) : !query ? (
        <div className="py-16 text-center max-w-sm mx-auto text-slate-500 space-y-2">
          <Sparkles className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Search the archive</p>
          <p className="text-xs text-slate-500">
            Find any movie or TV series. When added, metadata is automatically preserved offline in your IndexedDB vault.
          </p>
        </div>
      ) : null}
    </div>
  );
}
