import fs from 'fs';
import path from 'path';

export interface ServerSyncItem {
  id: string;
  entityType: string;
  entityId: string;
  action: 'upsert' | 'delete';
  payload: Record<string, unknown> | null;
  deviceId: string;
  timestamp: string;
  serverTimestamp: string;
}

export interface ServerChangeItem {
  entityType: string;
  entityId: string;
  action: 'upsert' | 'delete';
  payload: Record<string, unknown> | null;
  timestamp: string;
  serverTimestamp: string;
}

// In-memory sync store with persistence to a local sync cache file
const SYNC_CACHE_FILE = path.join(process.cwd(), '.next', 'watchvault-sync-store.json');

class ServerSyncStore {
  private items: Map<string, ServerSyncItem> = new Map();
  private isLoaded = false;

  private loadFromFile() {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(SYNC_CACHE_FILE)) {
        const raw = fs.readFileSync(SYNC_CACHE_FILE, 'utf-8');
        const list: ServerSyncItem[] = JSON.parse(raw);
        for (const item of list) {
          this.items.set(`${item.entityType}:${item.entityId}`, item);
        }
      }
    } catch (err) {
      console.warn('Could not read sync cache file, starting empty', err);
    }
    this.isLoaded = true;
  }

  private saveToFile() {
    try {
      const dir = path.dirname(SYNC_CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SYNC_CACHE_FILE, JSON.stringify(Array.from(this.items.values()), null, 2));
    } catch (err) {
      console.warn('Could not persist sync cache to file', err);
    }
  }

  pushChanges(changes: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: 'upsert' | 'delete';
    payload: Record<string, unknown> | null;
    deviceId: string;
    timestamp: string;
  }>): { acknowledgedIds: string[]; serverTimestamp: string } {
    this.loadFromFile();
    const serverTimestamp = new Date().toISOString();
    const acknowledgedIds: string[] = [];

    for (const change of changes) {
      const key = `${change.entityType}:${change.entityId}`;
      const existing = this.items.get(key);

      // Conflict handling: last-write-wins based on updated_at timestamp in payload or change timestamp
      if (existing) {
        const existingPayloadTime = (existing.payload?.updated_at as string | undefined);
        const incomingPayloadTime = (change.payload?.updated_at as string | undefined);
        const existingTime = new Date(existingPayloadTime || existing.timestamp).getTime();
        const incomingTime = new Date(incomingPayloadTime || change.timestamp).getTime();
        if (incomingTime < existingTime) {
          // Incoming change is older than existing server version, skip overwriting but acknowledge
          acknowledgedIds.push(change.id);
          continue;
        }
      }

      this.items.set(key, {
        ...change,
        serverTimestamp,
      });
      acknowledgedIds.push(change.id);
    }

    this.saveToFile();
    return { acknowledgedIds, serverTimestamp };
  }

  pullChanges(since: string | null, excludeDeviceId?: string | null): { changes: ServerChangeItem[]; serverTimestamp: string } {
    this.loadFromFile();
    const serverTimestamp = new Date().toISOString();
    const sinceTime = since ? new Date(since).getTime() : 0;

    const list: ServerChangeItem[] = [];
    for (const item of this.items.values()) {
      const itemServerTime = new Date(item.serverTimestamp).getTime();
      if (itemServerTime > sinceTime) {
        // If excludeDeviceId is provided, don't return changes that originated from the same device
        if (excludeDeviceId && item.deviceId === excludeDeviceId) {
          continue;
        }
        list.push({
          entityType: item.entityType,
          entityId: item.entityId,
          action: item.action,
          payload: item.payload,
          timestamp: item.timestamp,
          serverTimestamp: item.serverTimestamp,
        });
      }
    }

    return { changes: list, serverTimestamp };
  }
}

export const serverSyncStore = new ServerSyncStore();
