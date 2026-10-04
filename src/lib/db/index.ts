import Dexie, { type Table } from 'dexie';
import {
  LibraryItem,
  EpisodeProgress,
  SyncQueueItem,
  CachedMetadata,
  AppSetting,
  ConflictHistory,
} from '../types';

export class WatchVaultDatabase extends Dexie {
  library_items!: Table<LibraryItem, string>;
  episode_progress!: Table<EpisodeProgress, string>;
  sync_queue!: Table<SyncQueueItem, string>;
  cached_metadata!: Table<CachedMetadata, string>;
  app_settings!: Table<AppSetting, string>;
  conflict_history!: Table<ConflictHistory, string>;

  constructor() {
    super('WatchVaultDB');

    this.version(1).stores({
      library_items: 'id, tmdb_id, media_type, status, is_favorite, rating, release_year, updated_at, is_deleted, [media_type+status]',
      episode_progress: 'id, library_item_id, [library_item_id+season_number], is_watched',
      sync_queue: 'id, status, timestamp, entity_id',
      cached_metadata: 'key, expires_at',
      app_settings: 'key',
      conflict_history: 'id, record_id, timestamp',
    });
  }
}

export const db = new WatchVaultDatabase();

// Device identification
export async function getOrCreateDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return 'server';
  const existing = await db.app_settings.get('device_id');
  if (existing?.value) return existing.value;

  const newId = `dev_${crypto.randomUUID()}`;
  await db.app_settings.put({ key: 'device_id', value: newId });
  
  // Set default friendly name based on user agent
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const defaultName = isMobile ? 'Mobile Device' : 'Desktop Browser';
  await db.app_settings.put({ key: 'device_name', value: defaultName });

  return newId;
}

// Queue an action to sync_queue
export async function queueSyncAction(
  entityType: 'library_item' | 'episode_progress' | 'settings',
  entityId: string,
  action: 'upsert' | 'delete',
  payload: any
) {
  const syncItem: SyncQueueItem = {
    id: `sync_${crypto.randomUUID()}`,
    entity_type: entityType,
    entity_id: entityId,
    action,
    payload,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retry_count: 0,
  };
  await db.sync_queue.put(syncItem);
}

// Database Operations with automatic sync queueing
export async function saveLibraryItem(item: LibraryItem): Promise<void> {
  const now = new Date().toISOString();
  const updatedItem: LibraryItem = {
    ...item,
    updated_at: now,
    sync_version: (item.sync_version || 0) + 1,
  };

  await db.transaction('rw', db.library_items, db.sync_queue, async () => {
    await db.library_items.put(updatedItem);
    await queueSyncAction('library_item', updatedItem.id, 'upsert', updatedItem);
  });
}

// Soft delete (tombstone) so other devices know it's deleted
export async function deleteLibraryItem(id: string): Promise<void> {
  const existing = await db.library_items.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  const tombstone: LibraryItem = {
    ...existing,
    is_deleted: true,
    deleted_at: now,
    updated_at: now,
    sync_version: (existing.sync_version || 0) + 1,
  };

  await db.transaction('rw', db.library_items, db.sync_queue, async () => {
    await db.library_items.put(tombstone);
    await queueSyncAction('library_item', id, 'delete', tombstone);
  });
}

// Hard delete for cleanup if user explicitly resets
export async function hardDeleteLibraryItem(id: string): Promise<void> {
  await db.transaction('rw', db.library_items, db.episode_progress, db.sync_queue, async () => {
    await db.library_items.delete(id);
    await db.episode_progress.where('library_item_id').equals(id).delete();
  });
}

// Cache TMDB metadata for offline access
export async function setCachedMetadata(key: string, data: any, ttlSeconds: number = 86400 * 3): Promise<void> {
  const now = Date.now();
  await db.cached_metadata.put({
    key,
    data,
    cached_at: now,
    expires_at: now + ttlSeconds * 1000,
  });
}

export async function getCachedMetadata<T = any>(key: string): Promise<T | null> {
  const entry = await db.cached_metadata.get(key);
  if (!entry) return null;
  // If expired, we can still return it offline, but mark it
  return entry.data as T;
}

// Clear only discovery cache, keeping library 100% intact
export async function clearDiscoveryCache(): Promise<number> {
  const count = await db.cached_metadata.count();
  await db.cached_metadata.clear();
  return count;
}
