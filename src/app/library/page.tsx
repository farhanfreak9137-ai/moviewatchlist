'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLibrary } from '@/hooks/useLibrary';
import { LibraryItem, WatchStatus, MediaType } from '@/lib/types';
import { MediaCard } from '@/components/media/MediaCard';
import { LibraryItemRow } from '@/components/library/LibraryItemRow';
import { EmptyState } from '@/components/library/EmptyState';
import {
  BookmarkCheck,
  Search,
  Filter,
  LayoutGrid,
  List,
  ArrowUpDown,
  X,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

type LibraryTab = 'all' | 'movies' | 'tv' | 'watching' | 'completed' | 'planned' | 'dropped' | 'favorites';
type SortOption = 'recently_added' | 'recently_updated' | 'title' | 'rating' | 'release_date';

function LibraryContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as LibraryTab) || 'all';

  const { libraryItems, isLoading, stats, toggleFavorite } = useLibrary();

  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recently_added');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Extract all unique genres from user's actual library items
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    libraryItems.forEach((i) => i.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [libraryItems]);

  // Extract all unique release years from user's actual library items
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    libraryItems.forEach((i) => {
      if (i.release_year) set.add(i.release_year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [libraryItems]);

  // Filter & Sort Pipeline
  const filteredItems = useMemo(() => {
    return libraryItems
      .filter((item) => {
        // Tab filtering
        if (activeTab === 'movies' && item.media_type !== 'movie') return false;
        if (activeTab === 'tv' && item.media_type !== 'tv') return false;
        if (activeTab === 'watching' && item.status !== 'watching') return false;
        if (activeTab === 'completed' && item.status !== 'completed') return false;
        if (activeTab === 'planned' && item.status !== 'planned') return false;
        if (activeTab === 'dropped' && item.status !== 'dropped') return false;
        if (activeTab === 'favorites' && !item.is_favorite) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          const matchCast = item.cast?.some((c) => c.name.toLowerCase().includes(q));
          if (!matchTitle && !matchNotes && !matchCast) return false;
        }

        // Genre Filter
        if (selectedGenre !== 'all' && !item.genres?.includes(selectedGenre)) {
          return false;
        }

        // Year Filter
        if (selectedYear !== 'all' && item.release_year?.toString() !== selectedYear) {
          return false;
        }

        // Rating Filter
        if (selectedRating !== 'all') {
          if (selectedRating === 'unrated' && item.rating > 0) return false;
          if (selectedRating === '9+' && item.rating < 9) return false;
          if (selectedRating === '8+' && item.rating < 8) return false;
          if (selectedRating === '7+' && item.rating < 7) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recently_added') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'recently_updated') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'rating') {
          return b.rating - a.rating;
        }
        if (sortBy === 'release_date') {
          return (b.release_year || 0) - (a.release_year || 0);
        }
        return 0;
      });
  }, [
    libraryItems,
    activeTab,
    searchQuery,
    selectedGenre,
    selectedYear,
    selectedRating,
    sortBy,
  ]);

  const tabs: Array<{ id: LibraryTab; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.totalItems },
    { id: 'movies', label: 'Movies', count: stats.totalMovies },
    { id: 'tv', label: 'Series', count: stats.totalSeries },
    { id: 'watching', label: 'Watching', count: stats.watchingCount },
    { id: 'completed', label: 'Completed', count: stats.completedCount },
    { id: 'planned', label: 'Planned', count: stats.plannedCount },
    { id: 'dropped', label: 'Dropped', count: stats.droppedCount },
    { id: 'favorites', label: 'Favorites', count: stats.favoritesCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BookmarkCheck className="w-7 h-7 text-red-500" />
            <span>My Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Your private offline collection • {stats.totalItems} titles total
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-red-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Discover & Add</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-white/5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                isActive
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'bg-[#10121a] hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full font-mono text-[10px]',
                  isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filters, and View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#10121a] border border-white/5">
        {/* Search within library */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library by title, cast, or note..."
            className="w-full bg-[#181a24] text-xs text-white pl-9 pr-8 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-red-500 placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Genre Filter */}
          {availableGenres.length > 0 && (
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-[#181a24] text-white text-xs px-2.5 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="all">All Genres</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}

          {/* Year Filter */}
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-[#181a24] text-white text-xs px-2.5 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="all">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          )}

          {/* Rating Filter */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="bg-[#181a24] text-white text-xs px-2.5 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">All Ratings</option>
            <option value="9+">9+ Stars</option>
            <option value="8+">8+ Stars</option>
            <option value="7+">7+ Stars</option>
            <option value="unrated">Unrated</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-[#181a24] px-2.5 py-1 rounded-xl border border-white/10">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-white text-xs py-1 focus:outline-none cursor-pointer"
            >
              <option value="recently_added" className="bg-[#181a24]">Recently Added</option>
              <option value="recently_updated" className="bg-[#181a24]">Recently Modified</option>
              <option value="title" className="bg-[#181a24]">Title (A-Z)</option>
              <option value="rating" className="bg-[#181a24]">Personal Rating</option>
              <option value="release_date" className="bg-[#181a24]">Release Date</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#181a24] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                viewMode === 'list' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Empty State vs Items */}
      {filteredItems.length === 0 ? (
        libraryItems.length === 0 ? (
          <EmptyState type="library" />
        ) : (
          <EmptyState
            type={activeTab as any}
            title={searchQuery ? 'No matching titles found' : undefined}
            description={
              searchQuery
                ? `No titles in your library matched "${searchQuery}". Try a different keyword.`
                : undefined
            }
          />
        )
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <MediaCard
              key={item.id}
              id={item.tmdb_id}
              title={item.title}
              mediaType={item.media_type}
              posterPath={item.poster_path}
              releaseDate={item.release_date}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <LibraryItemRow
              key={item.id}
              item={item}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 text-xs">
          Loading library collection...
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
