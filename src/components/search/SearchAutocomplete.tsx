'use client';

import React, { useEffect, useRef } from 'react';
import { AutocompleteResults, AutocompleteItem } from '@/lib/search/searchEngine';
import { getImageUrl } from '@/lib/metadata/tmdb';
import {
  Film,
  Tv,
  User,
  Shield,
  Tag,
  Sparkles,
  ArrowRight,
  Clock,
  Trash2,
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

function renderFranchiseIcon(id: string | number) {
  switch (id) {
    case 'marvel':
      return <MarvelLogo size="sm" />;
    case 'dc':
      return <DCLogo size="sm" />;
    case 'xmen':
      return <XMenLogo size="sm" />;
    case 'starwars':
      return <StarWarsLogo size="sm" />;
    case 'pixar':
      return <PixarLogo size="sm" />;
    case 'ghibli':
      return <StudioGhibliLogo size="sm" />;
    case 'a24':
      return <A24Logo size="sm" />;
    case 'disney':
      return <DisneyLogo size="sm" />;
    case 'dreamworks':
      return <DreamWorksLogo size="sm" />;
    case 'anime':
      return <AnimeLogo size="sm" />;
    case 'warnerbros':
      return <WarnerBrosLogo size="sm" />;
    default:
      return (
        <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
          <Shield className="w-4 h-4" />
        </div>
      );
  }
}

interface SearchAutocompleteProps {
  isOpen: boolean;
  onClose: () => void;
  results: AutocompleteResults;
  query: string;
  recentSearches: string[];
  selectedIndex: number;
  onSelectQuery: (query: string) => void;
  onRemoveRecentSearch: (query: string) => void;
  onClearAllRecentSearches: () => void;
}

export function SearchAutocomplete({
  isOpen,
  onClose,
  results,
  query,
  recentSearches,
  selectedIndex,
  onSelectQuery,
  onRemoveRecentSearch,
  onClearAllRecentSearches,
}: SearchAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten items for unified index highlighting
  const flattenedItems: Array<{ type: 'recent' | 'didYouMean' | 'item'; data: any }> = [];

  if (results.didYouMean) {
    flattenedItems.push({ type: 'didYouMean', data: results.didYouMean });
  }

  // Franchises
  results.franchises.forEach((item) => flattenedItems.push({ type: 'item', data: item }));
  // Genres
  results.genres.forEach((item) => flattenedItems.push({ type: 'item', data: item }));
  // Actors
  results.actors.forEach((item) => flattenedItems.push({ type: 'item', data: item }));
  // Titles
  results.titles.forEach((item) => flattenedItems.push({ type: 'item', data: item }));

  // Recent searches if query is empty or short
  const showRecent = query.trim().length === 0 && recentSearches.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasAnyResults =
    results.franchises.length > 0 ||
    results.genres.length > 0 ||
    results.actors.length > 0 ||
    results.titles.length > 0 ||
    results.didYouMean;

  if (!hasAnyResults && !showRecent) {
    return null;
  }

  let itemCounter = 0;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#121420]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* 1. "Did You Mean" Typo Banner */}
      {results.didYouMean && (
        <div
          onClick={() => onSelectQuery(results.didYouMean!)}
          className={cn(
            'flex items-center justify-between px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-b border-amber-500/20 cursor-pointer transition-colors group',
            selectedIndex === 0 && 'bg-amber-500/25 ring-1 ring-amber-400'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs sm:text-sm">
              Did you mean <strong className="font-semibold underline underline-offset-2">{results.didYouMean}</strong>?
            </span>
          </div>
          <span className="text-xs text-amber-400/80 group-hover:text-amber-300 flex items-center gap-1 font-medium">
            Search suggestion <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* 2. Recent Searches (Shown when input is empty / focused) */}
      {showRecent && (
        <div className="p-3">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Recent Searches
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAllRecentSearches();
              }}
              className="text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((rec) => (
              <div
                key={rec}
                onClick={() => onSelectQuery(rec)}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer transition-all"
              >
                <span>{rec}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecentSearch(rec);
                  }}
                  className="opacity-40 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                  title="Remove search"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Franchises & Studios */}
      {results.franchises.length > 0 && (
        <div className="p-2">
          <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            Studios & Franchises
          </div>
          <div className="space-y-0.5 mt-1">
            {results.franchises.map((item) => {
              const currentIndex = itemCounter++;
              const isSelected = selectedIndex === currentIndex;
              return (
                <div
                  key={`franchise-${item.id}`}
                  onClick={() => onSelectQuery(item.queryToExecute)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all',
                    isSelected
                      ? 'bg-red-500/20 text-white border border-red-500/30'
                      : 'hover:bg-white/5 text-slate-200 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0 flex items-center justify-center min-w-[28px]">
                      {renderFranchiseIcon(item.id)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate text-white">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                    Universe
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Genres */}
      {results.genres.length > 0 && (
        <div className="p-2">
          <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            Genres
          </div>
          <div className="space-y-0.5 mt-1">
            {results.genres.map((item) => {
              const currentIndex = itemCounter++;
              const isSelected = selectedIndex === currentIndex;
              return (
                <div
                  key={`genre-${item.id}`}
                  onClick={() => onSelectQuery(item.queryToExecute)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all',
                    isSelected
                      ? 'bg-amber-500/20 text-white border border-amber-500/30'
                      : 'hover:bg-white/5 text-slate-200 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate text-white">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    Genre
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Actors & Directors */}
      {results.actors.length > 0 && (
        <div className="p-2">
          <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Actors & Directors
          </div>
          <div className="space-y-0.5 mt-1">
            {results.actors.map((item) => {
              const currentIndex = itemCounter++;
              const isSelected = selectedIndex === currentIndex;
              const photoUrl = getImageUrl(item.profilePath, 'w185');
              return (
                <div
                  key={`actor-${item.id}`}
                  onClick={() => onSelectQuery(item.queryToExecute)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all',
                    isSelected
                      ? 'bg-blue-500/20 text-white border border-blue-500/30'
                      : 'hover:bg-white/5 text-slate-200 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={item.title}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate text-white">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    Filmography
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Titles (Movies & TV Shows) */}
      {results.titles.length > 0 && (
        <div className="p-2">
          <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-purple-400" />
            Titles & Shows
          </div>
          <div className="space-y-0.5 mt-1">
            {results.titles.map((item) => {
              const currentIndex = itemCounter++;
              const isSelected = selectedIndex === currentIndex;
              const posterUrl = getImageUrl(item.posterPath, 'w185');
              return (
                <div
                  key={`title-${item.id}`}
                  onClick={() => onSelectQuery(item.queryToExecute)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all',
                    isSelected
                      ? 'bg-purple-500/20 text-white border border-purple-500/30'
                      : 'hover:bg-white/5 text-slate-200 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={item.title}
                        className="w-6 h-9 rounded object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-6 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                        {item.mediaType === 'tv' ? (
                          <Tv className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Film className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.mediaType === 'tv' ? 'Series' : 'Movie'}
                        {item.year ? ` • ${item.year}` : ''}
                        {item.subtitle ? ` • ${item.subtitle}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 shrink-0">
                    {item.mediaType === 'tv' ? 'TV' : 'Movie'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="px-4 py-2 bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-400">
            ↑↓
          </kbd>{' '}
          to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-400">
            Enter
          </kbd>{' '}
          or click <strong className="text-white font-medium">Search</strong> to view all
        </span>
      </div>
    </div>
  );
}
