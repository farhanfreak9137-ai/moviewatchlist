'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Star,
  Globe,
  Calendar,
  RotateCcw,
  Check,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SearchFilterState } from '@/lib/search/searchEngine';
import { GENRE_MAP } from '@/lib/search/franchises';

export interface SearchFilterDeckProps {
  filters: SearchFilterState;
  onChange: (newFilters: SearchFilterState) => void;
  onReset: () => void;
  className?: string;
}

const RATING_OPTIONS = [
  { value: null, label: 'Any Rating', desc: 'All scores & unrated' },
  { value: 8.5, label: '⭐ 8.5+ Legend', desc: 'Acclaimed masterpieces' },
  { value: 8.0, label: '⭐ 8.0+ Masterpiece', desc: 'Top tier IMDb & TMDB' },
  { value: 7.5, label: '⭐ 7.5+ Certified Great', desc: 'Critically praised' },
  { value: 7.0, label: '⭐ 7.0+ Entertaining', desc: 'High audience approval' },
  { value: 6.0, label: '⭐ 6.0+ Casual Watch', desc: 'Solid enjoyment' },
];

const LANGUAGE_OPTIONS = [
  { code: null, label: 'All Languages', flag: '🌐' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: 'Japanese (Anime)', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean (K-Drama)', flag: '🇰🇷' },
  { code: 'hi', label: 'Hindi (Bollywood)', flag: '🇮🇳' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
];

const YEAR_OPTIONS = [
  { value: null, label: 'All Years' },
  { value: '2026', label: '2026 (Upcoming & In Theaters)' },
  { value: '2025', label: '2025 (Latest Releases)' },
  { value: '2024', label: '2024' },
  { value: '2020-2023', label: '2020 – 2023 (Modern Era)' },
  { value: '2010s', label: '2010s Decade' },
  { value: '2000s', label: '2000s Era' },
  { value: '90s', label: '90s Classics' },
  { value: 'pre-1990', label: 'Retro & Vintage (Pre-1990)' },
];

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: '🔥 Most Popular' },
  { value: 'vote_average.desc', label: '⭐ Highest Rated (IMDb)' },
  { value: 'primary_release_date.desc', label: '🆕 Newest Release First' },
  { value: 'primary_release_date.asc', label: '🏛️ Oldest / Classic First' },
  { value: 'title.asc', label: '🔤 Title A – Z' },
];

type DropdownKey = 'genre' | 'rating' | 'language' | 'year' | 'sort';

export function SearchFilterDeck({
  filters,
  onChange,
  onReset,
  className,
}: SearchFilterDeckProps) {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [customYearInput, setCustomYearInput] = useState('');
  const [dropdownLeft, setDropdownLeft] = useState<number>(0);
  const deckRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deckRef.current && !deckRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeCount =
    (filters.genres.length > 0 ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0) +
    (filters.language !== null ? 1 : 0) +
    (filters.year !== null ? 1 : 0) +
    (filters.sortBy !== 'popularity.desc' ? 1 : 0);

  const toggleDropdown = (key: DropdownKey, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown === key) {
      setOpenDropdown(null);
      return;
    }
    if (deckRef.current) {
      const parentRect = deckRef.current.getBoundingClientRect();
      const btnRect = e.currentTarget.getBoundingClientRect();
      const idealLeft = btnRect.left - parentRect.left;
      // Keep dropdown within parent bounds
      const maxLeft = Math.max(0, parentRect.width - 320);
      setDropdownLeft(Math.max(0, Math.min(idealLeft, maxLeft)));
    }
    setOpenDropdown(key);
  };

  const toggleGenre = (genreId: string) => {
    const isSelected = filters.genres.includes(genreId);
    const updated = isSelected
      ? filters.genres.filter((id) => id !== genreId)
      : [...filters.genres, genreId];
    onChange({ ...filters, genres: updated });
  };

  const handleCustomYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customYearInput.trim();
    if (clean && /^\d{4}$/.test(clean)) {
      onChange({ ...filters, year: clean });
      setOpenDropdown(null);
    }
  };

  return (
    <div ref={deckRef} className={cn('relative z-30', className)}>
      {/* Horizontal scrolling button row */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs"
      >
        {/* 🎭 Box 1: Genre (Multi-select) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => toggleDropdown('genre', e)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all border cursor-pointer select-none',
              filters.genres.length > 0
                ? 'bg-red-500/15 border-red-500/50 text-red-200 shadow-sm shadow-red-500/10'
                : 'bg-[#121422] hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
            )}
          >
            <span className="text-sm">🎭</span>
            <span>
              {filters.genres.length === 0
                ? 'Genre: All'
                : filters.genres.length === 1
                ? GENRE_MAP.find((g) => g.id === filters.genres[0])?.name || '1 Genre'
                : `Genres (${filters.genres.length})`}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform opacity-70',
                openDropdown === 'genre' && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* ⭐ Box 2: Rating (IMDb / TMDB) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => toggleDropdown('rating', e)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all border cursor-pointer select-none',
              filters.minRating !== null
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm shadow-amber-500/10'
                : 'bg-[#121422] hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
            )}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span>
              {filters.minRating === null
                ? 'Rating: Any'
                : `Rating: ${filters.minRating}+ ⭐`}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform opacity-70',
                openDropdown === 'rating' && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* 🌐 Box 3: Language */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => toggleDropdown('language', e)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all border cursor-pointer select-none',
              filters.language !== null
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-sm shadow-cyan-500/10'
                : 'bg-[#121422] hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
            )}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {filters.language === null
                ? 'Language: All'
                : LANGUAGE_OPTIONS.find((l) => l.code === filters.language)?.label || filters.language}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform opacity-70',
                openDropdown === 'language' && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* 📅 Box 4: Year Released */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => toggleDropdown('year', e)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all border cursor-pointer select-none',
              filters.year !== null
                ? 'bg-purple-500/15 border-purple-500/50 text-purple-200 shadow-sm shadow-purple-500/10'
                : 'bg-[#121422] hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
            )}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>
              {filters.year === null
                ? 'Year: All'
                : YEAR_OPTIONS.find((y) => y.value === filters.year)?.label || `Year: ${filters.year}`}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform opacity-70',
                openDropdown === 'year' && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* 🔀 Box 5: Sort By */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => toggleDropdown('sort', e)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all border cursor-pointer select-none',
              filters.sortBy !== 'popularity.desc'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-sm shadow-emerald-500/10'
                : 'bg-[#121422] hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
            )}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label || 'Sort'}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform opacity-70',
                openDropdown === 'sort' && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* ↺ Reset Filters Button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-200 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
            title="Clear all filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ({activeCount})</span>
          </button>
        )}
      </div>

      {/* Floating Popovers Rendered OUTSIDE the overflow-x-auto container to eliminate clipping */}
      {openDropdown === 'genre' && (
        <div
          style={{ left: `${dropdownLeft}px` }}
          className="absolute top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-3 bg-[#131625]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <span>Select Genres</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({filters.genres.length} selected)
              </span>
            </span>
            {filters.genres.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, genres: [] })}
                className="text-[11px] text-red-400 hover:text-red-300 font-medium cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1 no-scrollbar">
            {GENRE_MAP.map((genre) => {
              const isSelected = filters.genres.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-red-600/30 text-white font-medium border border-red-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'
                  )}
                >
                  <span className="truncate">{genre.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openDropdown === 'rating' && (
        <div
          style={{ left: `${dropdownLeft}px` }}
          className="absolute top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-2 bg-[#131625]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-slate-400 border-b border-white/10">
            Minimum IMDb / TMDB Score
          </div>
          <div className="space-y-1">
            {RATING_OPTIONS.map((opt) => {
              const isSelected = filters.minRating === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, minRating: opt.value });
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-amber-500/20 text-white font-medium border border-amber-500/40'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white'
                  )}
                >
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openDropdown === 'language' && (
        <div
          style={{ left: `${dropdownLeft}px` }}
          className="absolute top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-2 bg-[#131625]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-slate-400 border-b border-white/10">
            Original Language & Region
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = filters.language === opt.code;
              return (
                <button
                  key={String(opt.code)}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, language: opt.code });
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer text-xs',
                    isSelected
                      ? 'bg-cyan-500/20 text-white font-medium border border-cyan-500/40'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{opt.flag}</span>
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openDropdown === 'year' && (
        <div
          style={{ left: `${dropdownLeft}px` }}
          className="absolute top-full mt-2 w-72 max-w-[calc(100vw-2rem)] p-2.5 bg-[#131625]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-slate-400 border-b border-white/10">
            Release Year or Era
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto no-scrollbar">
            {YEAR_OPTIONS.map((opt) => {
              const isSelected = filters.year === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, year: opt.value });
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer text-xs',
                    isSelected
                      ? 'bg-purple-500/20 text-white font-medium border border-purple-500/40'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white'
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom year input */}
          <form onSubmit={handleCustomYearSubmit} className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Or custom year (e.g. 1994)"
              value={customYearInput}
              onChange={(e) => setCustomYearInput(e.target.value)}
              maxLength={4}
              className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Set
            </button>
          </form>
        </div>
      )}

      {openDropdown === 'sort' && (
        <div
          style={{ left: `${dropdownLeft}px` }}
          className="absolute top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-2 bg-[#131625]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-slate-400 border-b border-white/10">
            Catalog Sort Order
          </div>
          <div className="space-y-1">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = filters.sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, sortBy: opt.value });
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer text-xs',
                    isSelected
                      ? 'bg-emerald-500/20 text-white font-medium border border-emerald-500/40'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white'
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
