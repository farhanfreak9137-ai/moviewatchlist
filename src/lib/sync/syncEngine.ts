import { db, getOrCreateDeviceId } from '../db';
import { SyncState, LibraryItem, EpisodeProgress, ConflictHistory } from '../types';

type SyncListener = (state: SyncState, pendingCount: number, lastSyncedAt: string | null) => void;

class SyncEngine {
  private currentState: SyncState = 'synced';
  private listeners: Set<SyncListener> = new Set();
  private syncTimeout: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());
      // Periodic background sync check every 45 seconds
      setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.triggerSync();
        }
      }, 45000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    if (typeof window === 'undefined') return;
    const pendingCount = await db.sync_queue.where('status').equals('pending').count();
    const lastSyncSetting = await db.app_settings.get('last_synced_at');
    const lastSyncedAt = lastSyncSetting?.value || null;

    let state = this.currentState;
    if (!navigator.onLine) {
      state = 'offline';
    } else if (this.isSyncing) {
      state = 'syncing';
    } else if (pendingCount > 0) {
      state = 'pending';
    }

    this.listeners.forEach((fn) => fn(state, pendingCount, lastSyncedAt));
  }

  private handleNetworkChange() {
    if (navigator.onLine) {
      this.triggerSync();
    } else {
      this.currentState = 'offline';
      this.notify();
    }
  }

  public scheduleSync(delayMs = 1500) {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.notify();
    this.syncTimeout = setTimeout(() => {
      this.triggerSync();
    }, delayMs);
  }

  public async triggerSync(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    if (typeof window === 'undefined' || !navigator.onLine || this.isSyncing) {
      return { success: false, pushed: 0, pulled: 0, error: 'Offline or sync in progress' };
    }

    this.isSyncing = true;
    this.currentState = 'syncing';
    this.notify();

    let pushedCount = 0;
    let pulledCount = 0;

    try {
      const deviceId = await getOrCreateDeviceId();

      // 1. Push Phase: Send pending outbox queue items
      const pendingItems = await db.sync_queue
        .where('status')
        .equals('pending')
        .limit(50)
        .toArray();

      if (pendingItems.length > 0) {
        // Mark as syncing
        await db.sync_queue
          .where('id')
          .anyOf(pendingItems.map((p) => p.id))
          .modify({ status: 'syncing' });

        const pushRes = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            changes: pendingItems,
          }),
        });

        if (!pushRes.ok) {
          throw new Error(`Sync push failed with status ${pushRes.status}`);
        }

        const pushData = await pushRes.json();
        const ackedIds: string[] = pushData.acknowledgedIds || [];

        // Remove acknowledged items from sync_queue
        await db.sync_queue.where('id').anyOf(ackedIds).delete();
        pushedCount = ackedIds.length;
      }

      // 2. Pull Phase: Fetch updates from server since last sync
      const lastSyncSetting = await db.app_settings.get('last_synced_at');
      const since = lastSyncSetting?.value || null;

      const pullUrl = `/api/sync/pull?deviceId=${encodeURIComponent(deviceId)}${
        since ? `&since=${encodeURIComponent(since)}` : ''
      }`;
      const pullRes = await fetch(pullUrl);

      if (!pullRes.ok) {
        throw new Error(`Sync pull failed with status ${pullRes.status}`);
      }

      const pullData = await pullRes.json();
      const remoteChanges: any[] = pullData.changes || [];
      const newServerTimestamp: string = pullData.serverTimestamp;

      // Process remote changes with conflict resolution
      for (const change of remoteChanges) {
        if (change.entityType === 'library_item') {
          await this.applyRemoteLibraryChange(change.payload as LibraryItem);
          pulledCount++;
        }
      }

      // Update last_synced_at
      await db.app_settings.put({
        key: 'last_synced_at',
        value: newServerTimestamp,
      });

      this.currentState = 'synced';
      this.isSyncing = false;
      this.notify();
      return { success: true, pushed: pushedCount, pulled: pulledCount };
    } catch (error: any) {
      console.warn('Sync cycle error (local changes are safe):', error);
      // Revert syncing items back to pending
      await db.sync_queue.where('status').equals('syncing').modify({ status: 'pending' });
      this.currentState = 'error';
      this.isSyncing = false;
      this.notify();
      return { success: false, pushed: 0, pulled: 0, error: error.message };
    }
  }

  // Conflict Resolution for Library Items
  private async applyRemoteLibraryChange(remoteItem: LibraryItem) {
    const localItem = await db.library_items.get(remoteItem.id);

    if (!localItem) {
      // Doesn't exist locally: if remote is deleted, ignore, else insert
      if (!remoteItem.is_deleted) {
        await db.library_items.put(remoteItem);
      }
      return;
    }

    const localTime = new Date(localItem.updated_at).getTime();
    const remoteTime = new Date(remoteItem.updated_at).getTime();

    // If local version is newer or equal, keep local version
    if (localTime >= remoteTime) {
      return;
    }

    // Remote is newer: check for personal field conflict (notes, rating, status)
    let mergedNotes = remoteItem.notes;
    if (
      localItem.notes &&
      remoteItem.notes &&
      localItem.notes.trim() !== remoteItem.notes.trim()
    ) {
      // Preserve both notes if divergent
      mergedNotes = `${localItem.notes}\n\n[Synced Note from other device]:\n${remoteItem.notes}`;
      
      const conflictRecord: ConflictHistory = {
        id: `conf_${crypto.randomUUID()}`,
        record_id: remoteItem.id,
        timestamp: new Date().toISOString(),
        local_data: localItem,
        remote_data: remoteItem,
        resolved_data: { ...remoteItem, notes: mergedNotes },
        description: `Preserved divergent notes for "${remoteItem.title}"`,
      };
      await db.conflict_history.put(conflictRecord);
    }

    const finalItem: LibraryItem = {
      ...remoteItem,
      notes: mergedNotes,
    };

    if (finalItem.is_deleted) {
      // Soft-deleted tombstone
      await db.library_items.put(finalItem);
    } else {
      await db.library_items.put(finalItem);
    }
  }
}

export const syncEngine = new SyncEngine();
