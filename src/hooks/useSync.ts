'use client';

import { useState, useEffect } from 'react';
import { syncEngine } from '@/lib/sync/syncEngine';
import { db, getOrCreateDeviceId } from '@/lib/db';
import { SyncState } from '@/lib/types';

export function useSync() {
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');

  useEffect(() => {
    // Initial fetch of device info
    getOrCreateDeviceId().then(async (id) => {
      setDeviceId(id);
      const nameSetting = await db.app_settings.get('device_name');
      setDeviceName(nameSetting?.value || 'WatchVault Device');
    });

    const unsubscribe = syncEngine.subscribe((state, count, lastSync) => {
      setSyncState(state);
      setPendingCount(count);
      setLastSyncedAt(lastSync);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = async () => {
    return await syncEngine.triggerSync();
  };

  return {
    syncState,
    pendingCount,
    lastSyncedAt,
    deviceId,
    deviceName,
    triggerSync,
  };
}
