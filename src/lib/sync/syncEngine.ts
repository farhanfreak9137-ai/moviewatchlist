import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { db, LOCAL_CHANGE_EVENT, runAsRemoteApply } from '../db';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import type { SyncState, LibraryItem, EpisodeProgress } from '../types';

/**
 * Offline-first cloud sync backed by Supabase.
 *
 * Local IndexedDB (Dexie) is always the source the UI reads from. Sync runs in two phases:
 *  1. PUSH  – every local record whose `updated_at` is newer than the last pushed watermark
 *             is upserted into `public.sync_records`. A server trigger ignores uploads that
 *             aren't newer than what's stored (last-write-wins).
 *  2. PULL  – every server record whose `server_updated_at` is newer than our pull cursor is
 *             downloaded and applied locally if it's newer than the local copy.
 *
 * Triggers: any local write (debounced), coming back online, app returning to foreground,
 * a Supabase Realtime event from another device, and a 60s safety interval.
 */

type EntityType = 'library_item' | 'episode_progress';
type SyncListener = (state: SyncState, pendingCount: number, lastSyncedAt: string | null) => void;
export type SyncResult = { success: boolean; pushed: number; pulled: number; error?: string };

const KEY_PUSH_WATERMARK = 'sync_push_watermark';
const KEY_PULL_CURSOR = 'sync_pull_cursor';
const KEY_LAST_SYNCED = 'last_synced_at';
const KEY_SYNC_USER = 'sync_user_id';

const PUSH_BATCH = 200;
const PULL_PAGE = 500;
const PULL_OVERLAP_MS = 10_000; // re-read a small window to never miss rows committed out of order

const getSetting = async (key: string): Promise<string | null> => (await db.app_settings.get(key))?.value ?? null;
const setSetting = (key: string, value: string | null) => db.app_settings.put({ key, value });

class SyncEngine {
  private listeners = new Set<SyncListener>();
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private rerunRequested = false;
  private lastError = false;
  private session: Session | null = null;
  private channel: RealtimeChannel | null = null;
  private started = false;

  /** Called once from the client (useSync). Safe to call repeatedly. */
  public start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    window.addEventListener(LOCAL_CHANGE_EVENT, () => this.scheduleSync(1500));
    window.addEventListener('online', () => this.scheduleSync(300));
    window.addEventListener('offline', () => this.notify());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.scheduleSync(300);
    });
    setInterval(() => this.scheduleSync(0), 60_000);

    const supabase = getSupabase();
    if (!supabase) {
      this.notify();
      return;
    }
    supabase.auth.getSession().then(({ data }) => this.handleSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      setTimeout(() => this.handleSession(session), 0);
    });
  }

  public get user() {
    return this.session?.user ?? null;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  public scheduleSync(delayMs = 1500) {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.notify();
    this.syncTimeout = setTimeout(() => void this.triggerSync(), delayMs);
  }

  // --- Auth ------------------------------------------------------------------

  public async signIn(email: string, password: string) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Cloud sync is not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /** Returns true if the account is ready, false if email confirmation is required first. */
  public async signUp(email: string, password: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Cloud sync is not configured');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return Boolean(data.session);
  }

  public async signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  private async handleSession(session: Session | null) {
    const prevUserId = this.session?.user.id ?? null;
    this.session = session;
    const userId = session?.user.id ?? null;

    if (userId && userId !== prevUserId) {
      // New account on this device → upload everything and download everything once.
      const lastUser = await getSetting(KEY_SYNC_USER);
      if (lastUser !== userId) {
        await setSetting(KEY_PUSH_WATERMARK, null);
        await setSetting(KEY_PULL_CURSOR, null);
        await setSetting(KEY_SYNC_USER, userId);
      }
      this.subscribeRealtime(userId);
      this.scheduleSync(0);
    } else if (!userId) {
      this.unsubscribeRealtime();
    }
    this.notify();
  }

  private subscribeRealtime(userId: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    this.unsubscribeRealtime();
    this.channel = supabase
      .channel(`sync-records-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sync_records', filter: `user_id=eq.${userId}` },
        () => this.scheduleSync(400)
      )
      .subscribe();
  }

  private unsubscribeRealtime() {
    const supabase = getSupabase();
    if (supabase && this.channel) supabase.removeChannel(this.channel);
    this.channel = null;
  }

  // --- Status ----------------------------------------------------------------

  private async countPending(): Promise<number> {
    const wm = await getSetting(KEY_PUSH_WATERMARK);
    if (!wm) {
      return (await db.library_items.count()) + (await db.episode_progress.count());
    }
    return (
      (await db.library_items.where('updated_at').above(wm).count()) +
      (await db.episode_progress.where('updated_at').above(wm).count())
    );
  }

  private async notify() {
    if (typeof window === 'undefined') return;
    let state: SyncState;
    let pending = 0;
    if (!isSupabaseConfigured || !this.session) {
      state = 'signed_out';
    } else {
      pending = await this.countPending();
      if (!navigator.onLine) state = 'offline';
      else if (this.isSyncing) state = 'syncing';
      else if (this.lastError) state = 'error';
      else if (pending > 0) state = 'pending';
      else state = 'synced';
    }
    const lastSyncedAt = await getSetting(KEY_LAST_SYNCED);
    this.listeners.forEach((fn) => fn(state, pending, lastSyncedAt));
  }

  // --- Sync cycle ------------------------------------------------------------

  public async triggerSync(): Promise<SyncResult> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, pushed: 0, pulled: 0, error: 'Cloud sync is not configured' };
    if (!this.session) return { success: false, pushed: 0, pulled: 0, error: 'Sign in to sync' };
    if (!navigator.onLine) return { success: false, pushed: 0, pulled: 0, error: 'You are offline' };
    if (this.isSyncing) {
      this.rerunRequested = true;
      return { success: false, pushed: 0, pulled: 0, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.notify();
    const userId = this.session.user.id;

    try {
      const pushed = await this.push(userId);
      const pulled = await this.pull();
      await setSetting(KEY_LAST_SYNCED, new Date().toISOString());
      this.lastError = false;
      return { success: true, pushed, pulled };
    } catch (error: any) {
      console.warn('Sync cycle error (local changes are safe):', error);
      this.lastError = true;
      return { success: false, pushed: 0, pulled: 0, error: error?.message || String(error) };
    } finally {
      this.isSyncing = false;
      this.notify();
      if (this.rerunRequested) {
        this.rerunRequested = false;
        this.scheduleSync(500);
      }
    }
  }

  private async push(userId: string): Promise<number> {
    const supabase = getSupabase()!;
    const wm = await getSetting(KEY_PUSH_WATERMARK);

    const items = wm
      ? await db.library_items.where('updated_at').above(wm).toArray()
      : await db.library_items.toArray();
    const episodes = wm
      ? await db.episode_progress.where('updated_at').above(wm).toArray()
      : await db.episode_progress.toArray();

    const rows = [
      ...items.filter((i) => i.updated_at).map((i) => this.toRow(userId, 'library_item', i.id, i, i.updated_at, !!i.is_deleted)),
      ...episodes.filter((e) => e.updated_at).map((e) => this.toRow(userId, 'episode_progress', e.id, e, e.updated_at, false)),
    ];
    if (rows.length === 0) return 0;

    let maxUpdated = wm ?? '';
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
      const batch = rows.slice(i, i + PUSH_BATCH);
      const { error } = await supabase
        .from('sync_records')
        .upsert(batch, { onConflict: 'user_id,entity_type,entity_id' });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      for (const r of batch) {
        const local = (r.payload as { updated_at: string }).updated_at;
        if (local > maxUpdated) maxUpdated = local;
      }
      // Advance the watermark per batch so a failure mid-way doesn't re-upload everything.
      await setSetting(KEY_PUSH_WATERMARK, maxUpdated);
    }
    return rows.length;
  }

  private toRow(userId: string, type: EntityType, id: string, payload: unknown, updatedAt: string, deleted: boolean) {
    return { user_id: userId, entity_type: type, entity_id: id, payload, updated_at: updatedAt, deleted };
  }

  private async pull(): Promise<number> {
    const supabase = getSupabase()!;
    const cursor = await getSetting(KEY_PULL_CURSOR);
    let from = cursor ? new Date(new Date(cursor).getTime() - PULL_OVERLAP_MS).toISOString() : null;
    let newCursor = cursor;
    let applied = 0;

    for (;;) {
      let query = supabase
        .from('sync_records')
        .select('entity_type, entity_id, payload, server_updated_at')
        .order('server_updated_at', { ascending: true })
        .limit(PULL_PAGE);
      if (from) query = query.gt('server_updated_at', from);

      const { data, error } = await query;
      if (error) throw new Error(`Download failed: ${error.message}`);
      if (!data || data.length === 0) break;

      applied += await this.applyRemote(data);
      const last = data[data.length - 1].server_updated_at as string;
      newCursor = last;
      from = last;
      if (data.length < PULL_PAGE) break;
    }

    if (newCursor && newCursor !== cursor) await setSetting(KEY_PULL_CURSOR, newCursor);
    return applied;
  }

  /** Applies downloaded rows, keeping whichever copy (local vs remote) was edited last. */
  private async applyRemote(
    rows: Array<{ entity_type: string; entity_id: string; payload: any }>
  ): Promise<number> {
    const libIncoming = rows.filter((r) => r.entity_type === 'library_item').map((r) => r.payload as LibraryItem);
    const epIncoming = rows.filter((r) => r.entity_type === 'episode_progress').map((r) => r.payload as EpisodeProgress);

    return runAsRemoteApply(() =>
      db.transaction('rw', db.library_items, db.episode_progress, async () => {
        const libLocal = await db.library_items.bulkGet(libIncoming.map((i) => i.id));
        const libToWrite = libIncoming.filter((r, i) => !libLocal[i] || (libLocal[i]!.updated_at || '') < r.updated_at);

        const epLocal = await db.episode_progress.bulkGet(epIncoming.map((e) => e.id));
        const epToWrite = epIncoming.filter((r, i) => !epLocal[i] || (epLocal[i]!.updated_at || '') < r.updated_at);

        if (libToWrite.length) await db.library_items.bulkPut(libToWrite);
        if (epToWrite.length) await db.episode_progress.bulkPut(epToWrite);
        return libToWrite.length + epToWrite.length;
      })
    );
  }
}

export const syncEngine = new SyncEngine();
