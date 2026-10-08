'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLibrary } from '@/hooks/useLibrary';
import { tmdbService, TMDBDetailsResponse, TMDBMediaItem, getImageUrl } from '@/lib/metadata/tmdb';
import { MediaType, WatchStatus } from '@/lib/types';
import { formatMinutes } from '@/lib/utils/format';
import { StatusBadge } from '@/components/media/StatusBadge';
import { PersonalWatchSection } from '@/components/details/PersonalWatchSection';
import { CastCarousel } from '@/components/details/CastCarousel';
import { EpisodeTracker } from '@/components/details/EpisodeTracker';
import {
  Film,
  Tv,
  Clock,
  Star,
  Plus,
  Check,
  ChevronLeft,
  Loader2,
  Play,
} from 'lucide-react';
import { TrailerModal } from '@/components/details/TrailerModal';
import { StreamingProviders } from '@/components/details/StreamingProviders';
import { UpNextEpisodeCard } from '@/components/details/UpNextEpisodeCard';
import { FinancialPerformanceSection } from '@/components/details/FinancialPerformanceSection';
import { MediaRow } from '@/components/media/MediaRow';

function TitleDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mediaType = (searchParams.get('mediaType') as MediaType) || (searchParams.get('type') as MediaType) || 'movie';
  const tmdbId = Number(searchParams.get('id'));

  const {
    getItemByTmdbId,
    addToLibrary,
    updateItem,
    removeItem,
  } = useLibrary();

  const libraryItem = getItemByTmdbId(tmdbId, mediaType);
  const isInLibrary = !!libraryItem;

  const [metadata, setMetadata] = useState<TMDBDetailsResponse | null>(null);
  const [recommendations, setRecommendations] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!tmdbId) return;

      try {
        setLoading(true);
        setError(null);

        const detailsPromise =
          mediaType === 'movie'
            ? tmdbService.getMovieDetails(tmdbId)
            : tmdbService.getSeriesDetails(tmdbId);
        const recsPromise = tmdbService.getRecommendations(tmdbId, mediaType).catch(() => []);

        const [details, recs] = await Promise.all([detailsPromise, recsPromise]);

        if (isMounted) {
          setMetadata(details);
          setRecommendations(recs || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (isInLibrary) {
            // If offline but in library, we have saved data
            setMetadata(null);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load title metadata');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [tmdbId, mediaType, isInLibrary]);

  const handleAddWithStatus = async (status: WatchStatus) => {
    if (!metadata || isAdding) return;
    try {
      setIsAdding(true);
      await addToLibrary(metadata, mediaType, status);
    } catch (err) {
      console.error('Failed to add title to library:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!libraryItem) return;
    await removeItem(libraryItem.id);
  };

  // Derive title, poster, overview, etc. (favoring local library data if offline)
  const title = libraryItem?.title || metadata?.title || metadata?.name || 'Untitled';
  const originalTitle = libraryItem?.original_title || metadata?.original_title || metadata?.original_name;
  const overview = libraryItem?.overview || metadata?.overview || 'No synopsis available.';
  const posterPath = libraryItem?.poster_path || metadata?.poster_path;
  const backdropPath = libraryItem?.backdrop_path || metadata?.backdrop_path;
  const releaseDate = libraryItem?.release_date || metadata?.release_date || metadata?.first_air_date;
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : '';
  const runtime = libraryItem?.runtime || metadata?.runtime;
  const genres = libraryItem?.genres || (metadata?.genres || []).map((g) => g.name);
  const cast = libraryItem?.cast || (metadata?.credits?.cast || []).slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profile_path: c.profile_path,
  }));
  const director = libraryItem?.director || metadata?.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const creator = libraryItem?.creator || metadata?.created_by?.[0]?.name;

  const backdropUrl = getImageUrl(backdropPath, 'original') || getImageUrl(posterPath, 'original');
  const posterUrl = getImageUrl(posterPath, 'w500');

  // Extract official YouTube trailer
  const trailer = metadata?.videos?.results?.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  ) || metadata?.videos?.results?.find((v) => v.site === 'YouTube');
  const trailerKey = trailer?.key || null;

  if (loading && !libraryItem && !metadata) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-sm text-slate-400">Loading title details...</p>
      </div>
    );
  }

  if (error && !libraryItem && !metadata) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative -mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
      {/* Cinematic Backdrop Hero */}
      <div className="relative w-full h-[260px] sm:h-[400px] md:h-[520px] bg-[#0c0d14] overflow-hidden">
        {backdropUrl && (
          <>
            {/* Ambient diffused OLED light spill */}
            <img
              src={backdropUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-top scale-110 blur-3xl opacity-50 select-none pointer-events-none"
            />
            <img
              src={backdropUrl}
              alt={title}
              className="relative w-full h-full object-cover object-top opacity-40 sm:opacity-45"
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090d] via-transparent to-[#08090d]/80" />

        {/* Back navigation button */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content Container overlaying backdrop */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 sm:-mt-48">
        {/* MOBILE HEADER (Visible only on < md screens: compact side-by-side poster + info) */}
        <div className="flex md:hidden flex-col gap-3.5 mb-6">
          <div className="flex items-start gap-3.5">
            {/* Mobile Poster Thumbnail */}
            <div className="relative w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-[#141624] border-2 border-white/10">
              {posterUrl ? (
                <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  {mediaType === 'movie' ? <Film className="w-8 h-8" /> : <Tv className="w-8 h-8" />}
                </div>
              )}
              {isInLibrary && (
                <div className="absolute top-1.5 right-1.5">
                  <StatusBadge status={libraryItem.status} size="sm" />
                </div>
              )}
            </div>

            {/* Mobile Title & Meta Column */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-semibold uppercase tracking-wider">
                  {mediaType === 'movie' ? 'Movie' : 'TV Series'}
                </span>
                {releaseYear && (
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[10px]">
                    {releaseYear}
                  </span>
                )}
                {runtime ? (
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[10px] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {formatMinutes(runtime)}
                  </span>
                ) : null}
              </div>

              <h1 className="text-xl font-black text-white tracking-tight leading-snug line-clamp-2 mb-1.5">
                {title}
              </h1>

              {metadata?.vote_average && metadata.vote_average > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-bold mb-2">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{metadata.vote_average.toFixed(1)} / 10</span>
                </div>
              ) : null}

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#141724] border border-white/10 text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons (Full width right under header) */}
          <div className="space-y-2">
            {!isInLibrary ? (
              <div className="p-2.5 rounded-xl bg-[#12141f] border border-white/10 space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
                  Add to Personal Library
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="add-planned-mobile"
                    onClick={() => handleAddWithStatus('planned')}
                    disabled={isAdding}
                    className="py-2.5 px-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-[11px] leading-tight transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg shadow-red-900/30 disabled:opacity-60"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Plan to Watch</span>
                  </button>
                  <button
                    id="add-watching-mobile"
                    onClick={() => handleAddWithStatus('watching')}
                    disabled={isAdding}
                    className="py-2.5 px-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-[11px] leading-tight transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Watching</span>
                  </button>
                  <button
                    id="add-completed-mobile"
                    onClick={() => handleAddWithStatus('completed')}
                    disabled={isAdding}
                    className="py-2.5 px-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-[11px] leading-tight transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Completed</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between px-3.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>In Your Library</span>
                </div>
                <span className="text-xs font-mono font-bold text-white capitalize bg-emerald-500/20 px-2.5 py-0.5 rounded-md">
                  {libraryItem.status}
                </span>
              </div>
            )}

            {trailerKey && (
              <button
                onClick={() => setShowTrailer(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#141624] hover:bg-[#1a1e2f] border border-white/10 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                <span>Watch Official Trailer</span>
              </button>
            )}
          </div>
        </div>

        {/* DESKTOP LAYOUT (Hidden on mobile, flex on md and up) */}
        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
          {/* Desktop Poster Column */}
          <div className="hidden md:block w-60 md:w-64 shrink-0">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-[#141622] border-2 border-white/10">
              {posterUrl ? (
                <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  {mediaType === 'movie' ? <Film className="w-12 h-12" /> : <Tv className="w-12 h-12" />}
                </div>
              )}

              {/* Status Ribbon if in library */}
              {isInLibrary && (
                <div className="absolute top-3 right-3">
                  <StatusBadge status={libraryItem.status} size="sm" />
                </div>
              )}
            </div>

            {/* Quick Action below poster */}
            <div className="mt-4 space-y-2">
              {!isInLibrary ? (
                <div className="p-3 rounded-xl bg-[#12141f] border border-white/10 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
                    Add to Personal Library
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      id="add-planned-desktop"
                      onClick={() => handleAddWithStatus('planned')}
                      disabled={isAdding}
                      className="py-2 px-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] leading-tight transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Plan to Watch</span>
                    </button>
                    <button
                      id="add-watching-desktop"
                      onClick={() => handleAddWithStatus('watching')}
                      disabled={isAdding}
                      className="py-2 px-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] leading-tight transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Watching</span>
                    </button>
                    <button
                      id="add-completed-desktop"
                      onClick={() => handleAddWithStatus('completed')}
                      disabled={isAdding}
                      className="py-2 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] leading-tight transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Completed</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>In Your Library</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Status: <span className="text-white capitalize">{libraryItem.status}</span>
                  </p>
                </div>
              )}

              {trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#141624] hover:bg-[#1a1e2f] border border-white/10 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-red-500 text-red-500" />
                  <span>Watch Official Trailer</span>
                </button>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0 w-full max-w-full pt-0 sm:pt-2 md:pt-6">
            {/* Desktop Badges & Title (Hidden on mobile since already shown in mobile header) */}
            <div className="hidden md:block">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-white font-mono text-xs font-semibold uppercase tracking-wider">
                  {mediaType === 'movie' ? 'Movie' : 'TV Series'}
                </span>
                {releaseYear && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono text-xs">
                    {releaseYear}
                  </span>
                )}
                {runtime && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatMinutes(runtime)}
                  </span>
                )}
                {metadata?.number_of_seasons && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono text-xs">
                    {metadata.number_of_seasons} Seasons ({metadata.number_of_episodes || 0} eps)
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                {title}
              </h1>

              {/* Original title or tagline if different */}
              {originalTitle && originalTitle !== title && (
                <p className="text-sm text-slate-400 font-sans mb-3 italic">
                  Original title: {originalTitle}
                </p>
              )}

              {/* Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#141724] border border-white/10 text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Overview / Synopsis */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Synopsis
              </h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-3xl">
                {overview}
              </p>
            </div>

            {/* Director / Creator */}
            {(director || creator) && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                <span className="font-semibold text-slate-300">
                  {director ? 'Directed by:' : 'Created by:'}
                </span>
                <span className="text-white font-medium">{director || creator}</span>
              </div>
            )}

            {/* Cast Carousel */}
            <CastCarousel cast={cast} />

            {/* Box Office, Earnings & Success Rate Metrics */}
            <FinancialPerformanceSection
              mediaType={mediaType}
              title={title}
              budget={metadata?.budget || libraryItem?.budget || 0}
              revenue={metadata?.revenue || libraryItem?.revenue || 0}
              voteAverage={metadata?.vote_average || libraryItem?.rating || 0}
              voteCount={metadata?.vote_count || 0}
              status={metadata?.status}
              numberOfSeasons={metadata?.number_of_seasons || libraryItem?.number_of_seasons}
              numberOfEpisodes={metadata?.number_of_episodes || libraryItem?.number_of_episodes}
            />

            {/* Where to Watch / Streaming Availability */}
            <StreamingProviders providersData={metadata?.['watch/providers']} />

            {/* 1-Tap Up Next Episode & Overall Progress Bar */}
            {mediaType === 'tv' && isInLibrary && (
              <UpNextEpisodeCard
                tvId={tmdbId}
                libraryItemId={libraryItem.id}
                seasons={metadata?.seasons || libraryItem.seasons || []}
                onEpisodeWatched={(s, ep) => {
                  updateItem(libraryItem.id, {
                    current_season: s,
                    current_episode: ep,
                  });
                }}
              />
            )}

            {/* TV Series Seasons & Episodes Tracker */}
            {mediaType === 'tv' && (
              <EpisodeTracker
                tvId={tmdbId}
                libraryItemId={libraryItem?.id}
                seasons={metadata?.seasons || libraryItem?.seasons || []}
                currentSeason={libraryItem?.current_season || 1}
                currentEpisode={libraryItem?.current_episode || 0}
                onProgressUpdate={(s, ep) => {
                  if (libraryItem) {
                    updateItem(libraryItem.id, {
                      current_season: s,
                      current_episode: ep,
                    });
                  }
                }}
              />
            )}

            {/* "MY WATCH" SECTION - Strictly separated personal tracking archive */}
            {isInLibrary && (
              <PersonalWatchSection
                item={libraryItem}
                onUpdate={async (updates) => {
                  await updateItem(libraryItem.id, updates);
                }}
                onRemove={handleRemove}
              />
            )}

            {/* "More Like This" Recommendations Carousel */}
            {recommendations.length > 0 && (
              <div className="pt-6 border-t border-white/10">
                <MediaRow
                  title="More Like This"
                  subtitle={`Titles recommended for fans of ${title}`}
                  items={recommendations.map((item) => ({
                    id: item.id,
                    title: item.title || item.name || '',
                    mediaType: item.media_type || mediaType,
                    posterPath: item.poster_path,
                    releaseDate: item.release_date || item.first_air_date,
                    voteAverage: item.vote_average,
                  }))}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cinema Lightbox Trailer Modal */}
      <TrailerModal
        videoKey={showTrailer ? trailerKey : null}
        title={title}
        onClose={() => setShowTrailer(false)}
      />
    </div>
  );
}

export default function TitleDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-xs">Loading title details...</span>
        </div>
      }
    >
      <TitleDetailContent />
    </Suspense>
  );
}
