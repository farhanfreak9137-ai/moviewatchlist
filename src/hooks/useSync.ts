'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncEngine } from '@/lib/sync/syncEngine';
import { db, getOrCreateDeviceId } from '@/lib/db';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { SyncState } from '@/lib/types';

export function useSync() {
  const [syncState, setSyncState] = useState<SyncState>('signed_out');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    syncEngine.start();

    getOrCreateDeviceId().then(async (id) => {
      setDeviceId(id);
      const nameSetting = await db.app_settings.get('device_name');
      setDeviceName(nameSetting?.value || 'WatchVault Device');
    });

    const unsubscribe = syncEngine.subscribe((state, count, lastSync) => {
      setSyncState(state);
      setPendingCount(count);
      setLastSyncedAt(lastSync);
      setUserEmail(syncEngine.user?.email ?? null);
    });

    const supabase = getSupabase();
    const authSub = supabase?.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      unsubscribe();
      authSub?.data.subscription.unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => syncEngine.triggerSync(), []);
  const signIn = useCallback((email: string, password: string) => syncEngine.signIn(email, password), []);
  const signUp = useCallback((email: string, password: string) => syncEngine.signUp(email, password), []);
  const signOut = useCallback(() => syncEngine.signOut(), []);

  return {
    syncState,
    pendingCount,
    lastSyncedAt,
    deviceId,
    deviceName,
    userEmail,
    isConfigured: isSupabaseConfigured,
    triggerSync,
    signIn,
    signUp,
    signOut,
  };
}
