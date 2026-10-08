'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveLibraryItem, deleteLibraryItem, getOrCreateDeviceId } from '@/lib/db';
import { syncEngine } from '@/lib/sync/syncEngine';
import { LibraryItem, MediaType, WatchStatus } from '@/lib/types';
import { TMDBDetailsResponse } from '@/lib/metadata/tmdb';

// In-flight mutex to avoid duplicate additions from rapid concurrent clicks
const inFlightAdds = new Map<string, Promise<LibraryItem>>();

export function useLibrary() {
  const items = useLiveQuery(
    async () => {
      // Return only non-deleted items, sorted by updated_at descending
      const list = await db.library_items
        .filter((item) => !item.is_deleted)
        .toArray();
      const sorted = list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      // Auto-heal & deduplicate by (media_type + tmdb_id)
      const seen = new Set<string>();
      const deduped: LibraryItem[] = [];
      const duplicateIds: string[] = [];

      for (const item of sorted) {
        const key = `${item.media_type}_${item.tmdb_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        } else {
          // Extra ghost record with identical TMDB ID and media type
          duplicateIds.push(item.id);
        }
      }

      // Automatically prune duplicate records in background
      if (duplicateIds.length > 0) {
        setTimeout(async () => {
          try {
            await db.transaction('rw', db.library_items, async () => {
              for (const dupId of duplicateIds) {
                await db.library_items.delete(dupId);
              }
            });
          } catch (e) {
            console.warn('Failed to prune duplicate library items:', e);
          }
        }, 0);
      }

      return deduped;
    },
    [],
    [] // Default initial empty array: STRICTLY NO MOCK DATA
  );

  const isLoading = items === undefined;
  const libraryItems = items || [];

  // Compute live real stats strictly from local database
  const stats = {
    totalItems: libraryItems.length,
    totalMovies: libraryItems.filter((i) => i.media_type === 'movie').length,
    totalSeries: libraryItems.filter((i) => i.media_type === 'tv').length,
    watchingCount: libraryItems.filter((i) => i.status === 'watching').length,
    completedCount: libraryItems.filter((i) => i.status === 'completed').length,
    plannedCount: libraryItems.filter((i) => i.status === 'planned').length,
    droppedCount: libraryItems.filter((i) => i.status === 'dropped').length,
    favoritesCount: libraryItems.filter((i) => i.is_favorite).length,
    averageRating: libraryItems.filter((i) => i.rating > 0).length
      ? (
          libraryItems.filter((i) => i.rating > 0).reduce((acc, curr) => acc + curr.rating, 0) /
          libraryItems.filter((i) => i.rating > 0).length
        ).toFixed(1)
      : '0.0',
    totalRuntimeMinutes: libraryItems.reduce((acc, curr) => acc + (curr.runtime || 0), 0),
  };

  const getItemByTmdbId = (tmdbId: number, mediaType?: MediaType): LibraryItem | undefined => {
    return libraryItems.find(
      (item) => Number(item.tmdb_id) === Number(tmdbId) && (!mediaType || item.media_type === mediaType)
    );
  };

  const getItemById = (id: string): LibraryItem | undefined => {
    return libraryItems.find((item) => item.id === id);
  };

  const isItemInLibrary = (tmdbId: number, mediaType?: MediaType): boolean => {
    return !!getItemByTmdbId(tmdbId, mediaType);
  };

  // Add new title from TMDB details
  const addToLibrary = async (
    details: TMDBDetailsResponse,
    mediaType: MediaType,
    initialStatus: WatchStatus = 'planned',
    initialRating: number = 0,
    isFavorite: boolean = false
  ): Promise<LibraryItem> => {
    const lockKey = `${mediaType}_${details.id}`;
    if (inFlightAdds.has(lockKey)) {
      return inFlightAdds.get(lockKey)!;
    }

    const addPromise = (async () => {
      try {
        // Check if item already exists (matching by tmdb_id & media_type)
        const allMatching = await db.library_items
          .filter((item) => !item.is_deleted && Number(item.tmdb_id) === Number(details.id) && item.media_type === mediaType)
          .toArray();
        const existing = allMatching[0];

    const deviceId = await getOrCreateDeviceId();
    const now = new Date().toISOString();

    const releaseDate = details.release_date || details.first_air_date || '';
    const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : undefined;

    // Extract cast & crew
    const topCast = (details.credits?.cast || []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
    }));

    const director = details.credits?.crew?.find((c) => c.job === 'Director')?.name;
    const creator = details.created_by?.[0]?.name;

    const runtime = details.runtime || (details.episode_run_time?.[0] ? details.episode_run_time[0] : undefined);

    const seasons = details.seasons?.map((s) => ({
      id: s.id,
      season_number: s.season_number,
      name: s.name,
      episode_count: s.episode_count,
      air_date: s.air_date,
      poster_path: s.poster_path,
      overview: s.overview,
    }));

    const newItem: LibraryItem = {
      id: existing ? existing.id : `item_${crypto.randomUUID()}`,
      tmdb_id: details.id,
      media_type: mediaType,
      title: details.title || details.name || 'Untitled',
      original_title: details.original_title || details.original_name,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      release_date: releaseDate,
      release_year: releaseYear,
      genres: (details.genres || []).map((g) => g.name),
      overview: details.overview,
      runtime,
      number_of_seasons: details.number_of_seasons,
      number_of_episodes: details.number_of_episodes,
      seasons,
      director,
      creator,
      cast: topCast,
      budget: details.budget,
      revenue: details.revenue,
      status: initialStatus,
      rating: initialRating,
      is_favorite: isFavorite,
      notes: existing?.notes || '',
      start_date: initialStatus === 'watching' ? new Date().toISOString().substring(0, 10) : undefined,
      finish_date: initialStatus === 'completed' ? new Date().toISOString().substring(0, 10) : undefined,
      current_season: mediaType === 'tv' ? 1 : undefined,
      current_episode: mediaType === 'tv' ? 0 : undefined,
      rewatch_count: 0,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
      is_deleted: false,
      sync_version: (existing?.sync_version || 0) + 1,
      device_id: deviceId,
    };

        await saveLibraryItem(newItem);
        syncEngine.scheduleSync();
        return newItem;
      } finally {
        inFlightAdds.delete(lockKey);
      }
    })();

    inFlightAdds.set(lockKey, addPromise);
    return addPromise;
  };

  const updateItem = async (id: string, updates: Partial<LibraryItem>): Promise<void> => {
    const existing = await db.library_items.get(id);
    if (!existing) return;

    const updated: LibraryItem = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await saveLibraryItem(updated);
    syncEngine.scheduleSync();
  };

  const removeItem = async (id: string): Promise<void> => {
    await deleteLibraryItem(id);
    syncEngine.scheduleSync();
  };

  const toggleFavorite = async (id: string): Promise<void> => {
    const existing = await db.library_items.get(id);
    if (!existing) return;
    await updateItem(id, { is_favorite: !existing.is_favorite });
  };

  const setStatus = async (id: string, status: WatchStatus): Promise<void> => {
    const updates: Partial<LibraryItem> = { status };
    if (status === 'watching') {
      const existing = await db.library_items.get(id);
      if (!existing?.start_date) {
        updates.start_date = new Date().toISOString().substring(0, 10);
      }
    } else if (status === 'completed') {
      const existing = await db.library_items.get(id);
      if (!existing?.finish_date) {
        updates.finish_date = new Date().toISOString().substring(0, 10);
      }
    }
    await updateItem(id, updates);
  };

  const setRating = async (id: string, rating: number): Promise<void> => {
    await updateItem(id, { rating });
  };

  const incrementEpisode = async (
    id: string
  ): Promise<{ newSeason: number; newEpisode: number; isCompleted: boolean }> => {
    const existing = await db.library_items.get(id);
    if (!existing || existing.media_type !== 'tv') {
      return { newSeason: 1, newEpisode: 1, isCompleted: false };
    }

    const currentSeason = existing.current_season || 1;
    const currentEpisode = existing.current_episode || 0;

    const seasonData = existing.seasons?.find((s) => s.season_number === currentSeason);
    const maxEpInCurrentSeason = seasonData?.episode_count;

    let nextSeason = currentSeason;
    let nextEpisode = currentEpisode + 1;
    let isCompleted = false;

    if (maxEpInCurrentSeason && nextEpisode > maxEpInCurrentSeason) {
      const hasNextSeason = existing.seasons?.some((s) => s.season_number === currentSeason + 1);
      if (hasNextSeason) {
        nextSeason = currentSeason + 1;
        nextEpisode = 1;
      } else {
        isCompleted = true;
      }
    } else if (existing.number_of_episodes && (currentEpisode + 1) >= existing.number_of_episodes) {
      isCompleted = true;
    }

    const updates: Partial<LibraryItem> = {
      current_season: nextSeason,
      current_episode: nextEpisode,
      status: isCompleted ? 'completed' : 'watching',
      finish_date: isCompleted ? new Date().toISOString().substring(0, 10) : existing.finish_date,
    };

    try {
      const epKey = `${existing.id}_s${nextSeason}_e${nextEpisode}`;
      await db.episode_progress.put({
        id: epKey,
        library_item_id: existing.id,
        tmdb_id: existing.tmdb_id,
        season_number: nextSeason,
        episode_number: nextEpisode,
        is_watched: true,
        watched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {}

    await updateItem(id, updates);
    return { newSeason: nextSeason, newEpisode: nextEpisode, isCompleted };
  };

  return {
    libraryItems,
    isLoading,
    stats,
    getItemByTmdbId,
    getItemById,
    isItemInLibrary,
    addToLibrary,
    updateItem,
    removeItem,
    toggleFavorite,
    setStatus,
    setRating,
    incrementEpisode,
  };
}
