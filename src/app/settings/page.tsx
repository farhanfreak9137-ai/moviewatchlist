'use client';

import React, { useState, useEffect } from 'react';
import { useSync } from '@/hooks/useSync';
import { useLibrary } from '@/hooks/useLibrary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { db, clearDiscoveryCache } from '@/lib/db';
import { LibraryItem, ContentPreferences, MediaFocus, QualityFilter, ReleaseWindow } from '@/lib/types';
import {
  getContentPreferences,
  saveContentPreferences,
  POPULAR_GENRES,
  DEFAULT_PREFERENCES,
} from '@/lib/preferences/contentPreferences';
import {
  SlidersHorizontal,
  RefreshCw,
  HardDrive,
  Download,
  Upload,
  Key,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Database,
  Wifi,
  WifiOff,
  Sparkles,
  Film,
  Tv,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { InstallBanner } from '@/components/layout/InstallBanner';
import { CsvImporter } from '@/components/settings/CsvImporter';
import { CloudAccountCard } from '@/components/settings/CloudAccountCard';

export default function SettingsPage() {
  const { syncState, pendingCount, lastSyncedAt, deviceId, deviceName, triggerSync } = useSync();
  const { libraryItems } = useLibrary();
  const isOnline = useNetworkStatus();

  // Local state
  const [editingDeviceName, setEditingDeviceName] = useState(deviceName);
  const [customKey, setCustomKey] = useState('');
  const [preferences, setPreferences] = useState<ContentPreferences>(DEFAULT_PREFERENCES);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: string; quota: string } | null>(null);
  const [discoveryCacheCount, setDiscoveryCacheCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Danger zone modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Import preview
  const [importFile, setImportFile] = useState<{ library_items: LibraryItem[]; episode_progress?: unknown[] } | null>(null);
  const [importPreviewCount, setImportPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setEditingDeviceName(deviceName), 0);
    return () => clearTimeout(timer);
  }, [deviceName]);

  useEffect(() => {
    async function loadStats() {
      if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate();
        const usageMb = est.usage ? (est.usage / (1024 * 1024)).toFixed(1) : '0';
        const quotaMb = est.quota ? (est.quota / (1024 * 1024)).toFixed(0) : '0';
        setStorageEstimate({ usage: `${usageMb} MB`, quota: `${quotaMb} MB` });
      }

      const cacheCount = await db.cached_metadata.count();
      setDiscoveryCacheCount(cacheCount);

      const customKeySetting = await db.app_settings.get('custom_tmdb_key');
      if (customKeySetting?.value && typeof customKeySetting.value === 'string') {
        setCustomKey(customKeySetting.value);
      }

      const prefs = await getContentPreferences();
      setPreferences(prefs);
    }
    loadStats();
  }, [libraryItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSavePreferences = async () => {
    try {
      await saveContentPreferences(preferences);
      showToast('Discovery preferences saved & queued for sync');
      if (isOnline) {
        triggerSync();
      }
    } catch (err: unknown) {
      alert(`Failed to save preferences: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSaveDeviceName = async () => {
    if (!editingDeviceName.trim()) return;
    await db.app_settings.put({ key: 'device_name', value: editingDeviceName.trim() });
    showToast('Device name updated');
  };

  const handleSaveCustomKey = async () => {
    await db.app_settings.put({ key: 'custom_tmdb_key', value: customKey.trim() });
    showToast('TMDB API Key updated');
  };

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    const res = await triggerSync();
    setIsSyncing(false);
    if (res.success) {
      setSyncFeedback(`Sync complete: ${res.pushed} sent, ${res.pulled} received`);
      showToast('Synchronization completed successfully');
    } else {
      setSyncFeedback(`Sync note: ${res.error || 'Changes preserved locally'}`);
    }
  };

  const handleClearCache = async () => {
    const cleared = await clearDiscoveryCache();
    setDiscoveryCacheCount(0);
    showToast(`Cleared ${cleared} cached discovery records`);
  };

  // Export Library JSON
  const handleExportLibrary = async () => {
    const allItems = await db.library_items.filter((item) => !item.is_deleted).toArray();
    const allEpisodes = await db.episode_progress.toArray();

    const exportData = {
      app: 'WatchVault',
      schema_version: 1,
      export_date: new Date().toISOString(),
      item_count: allItems.length,
      library_items: allItems,
      episode_progress: allEpisodes,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchvault-backup-${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Library exported successfully');
  };

  // Import file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.library_items || !Array.isArray(parsed.library_items)) {
          alert('Invalid WatchVault backup file: missing library_items list.');
          return;
        }
        setImportFile(parsed);
        setImportPreviewCount(parsed.library_items.length);
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Perform atomic import
  const handleConfirmImport = async () => {
    if (!importFile || !importFile.library_items) return;

    try {
      const now = new Date().toISOString();
      for (const item of importFile.library_items) {
        const validated: LibraryItem = {
          ...item,
          updated_at: now,
          is_deleted: false,
        };
        await db.library_items.put(validated);
      }

      if (Array.isArray(importFile.episode_progress)) {
        for (const ep of importFile.episode_progress) {
          await db.episode_progress.put({ ...(ep as Record<string, unknown>), updated_at: now } as unknown as import('@/lib/types').EpisodeProgress);
        }
      }

      setImportFile(null);
      setImportPreviewCount(null);
      showToast(`Imported ${importFile.library_items.length} titles into library`);
    } catch (err: unknown) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Clear entire library (as tombstones, so the deletion also syncs to your other devices)
  const handleConfirmDeleteLibrary = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    const now = new Date().toISOString();
    await db.transaction('rw', db.library_items, db.episode_progress, async () => {
      await db.library_items.toCollection().modify({ is_deleted: true, deleted_at: now, updated_at: now });
      await db.episode_progress.toCollection().modify({ is_watched: false, watched_at: undefined, updated_at: now });
    });
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    showToast('Personal library cleared');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <SlidersHorizontal className="w-7 h-7 text-red-500" />
          <span>Settings & Synchronization</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage two-device synchronization, offline storage, metadata API, and backups.
        </p>
      </div>

      {/* Android Native PWA / WebAPK Install Banner */}
      <InstallBanner />

      {/* SECTION 1: Device Information */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Laptop className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">Device Information</h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
            {deviceId || 'Loading...'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Friendly Device Name
            </label>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={editingDeviceName}
                onChange={(e) => setEditingDeviceName(e.target.value)}
                placeholder="e.g. Living Room PC, Android Pixel"
                className="flex-1 bg-[#181a24] text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleSaveDeviceName}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Helps distinguish changes between your desktop and mobile phone.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Synchronization & Connectivity */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Cross-Device Synchronization</h2>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <WifiOff className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>
        </div>

        <CloudAccountCard />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Sync Status</span>
            <span className="text-base font-bold text-white capitalize">{syncState.replace('_', ' ')}</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Waiting to Upload</span>
            <span className="text-base font-bold text-white font-mono">{pendingCount} changes</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Last Synced</span>
            <span className="text-xs font-mono text-slate-300">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never synced'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-400 max-w-md">
            Changes made offline are saved locally first, then synchronized automatically when reconnected.
          </p>
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing || syncState === 'signed_out'}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
            {syncFeedback}
          </div>
        )}
      </div>

      {/* SECTION 3: Discovery & Content Preferences */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Discovery & Content Preferences</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Smartly shapes and rearranges movies, series, and curated feeds on your Discover home page.
              </p>
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>

        {/* 1. Primary Media Focus */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200 block">
            Primary Media Focus
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'balanced', label: 'Balanced Mix', desc: 'Equal priority for Movies and TV Series', icon: Compass },
              { id: 'movies', label: 'Movies First', desc: 'Prioritizes films, box office & cinema trends', icon: Film },
              { id: 'tv', label: 'TV Series First', desc: 'Prioritizes shows, seasons & episode trackers', icon: Tv },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = preferences.mediaFocus === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, mediaFocus: opt.id as MediaFocus })}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                    isSelected
                      ? 'bg-red-600/15 border-red-500/60 text-white shadow-md'
                      : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <Icon className={cn('w-4 h-4', isSelected ? 'text-red-500' : 'text-slate-400')} />
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-snug">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Favorite Genres */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200">
              Favorite Genres
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              {preferences.favoriteGenres.length} selected (generates dedicated tailored rows)
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {POPULAR_GENRES.map((genre) => {
              const isSelected = preferences.favoriteGenres.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => {
                    const exists = preferences.favoriteGenres.includes(genre.id);
                    const next = exists
                      ? preferences.favoriteGenres.filter((id) => id !== genre.id)
                      : [...preferences.favoriteGenres, genre.id];
                    setPreferences({ ...preferences, favoriteGenres: next });
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40'
                      : 'bg-[#181a24] border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                  )}
                >
                  <span>{genre.name}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Content Quality Filter & Release Window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 block">
              Quality & Rating Filter
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Popular' },
                { id: 'high_acclaim', label: '★ 7.5+ Acclaimed' },
                { id: 'hidden_gems', label: 'Hidden Gems' },
              ].map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, qualityFilter: q.id as QualityFilter })}
                  className={cn(
                    'p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer',
                    preferences.qualityFilter === q.id
                      ? 'bg-red-600/15 border-red-500/60 text-white'
                      : 'bg-[#181a24] border-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 block">
              Release Era Focus
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'any', label: 'Any Era' },
                { id: 'recent', label: 'Modern (2020+)' },
                { id: 'classics', label: 'Classics' },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, releaseWindow: w.id as ReleaseWindow })}
                  className={cn(
                    'p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer',
                    preferences.releaseWindow === w.id
                      ? 'bg-red-600/15 border-red-500/60 text-white'
                      : 'bg-[#181a24] border-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Metadata Provider Configuration (TMDB) */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <Key className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">TMDB Metadata Integration</h2>
        </div>

        <div className="space-y-3 max-w-lg">
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Custom TMDB API Key (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Leave blank to use default system key"
              className="flex-1 bg-[#181a24] text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-red-500 font-mono"
            />
            <button
              onClick={handleSaveCustomKey}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Update Key
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            A built-in key is active. You can supply your own free key from themoviedb.org to ensure unlimited API quota.
          </p>
        </div>
      </div>

      {/* SECTION 4: Storage & Caching */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <HardDrive className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Local Storage & Cache</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">IndexedDB Usage</span>
            <span className="text-base font-bold text-white font-mono">
              {storageEstimate ? storageEstimate.usage : 'Estimating...'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Personal Titles</span>
            <span className="text-base font-bold text-white font-mono">{libraryItems.length} records</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Discovery Cache</span>
            <span className="text-base font-bold text-white font-mono">{discoveryCacheCount} cached items</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Clearing discovery cache only deletes temporary browse data. Your personal library is never affected.
          </p>
          <button
            onClick={handleClearCache}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            Clear Discovery Cache
          </button>
        </div>
      </div>

      {/* SECTION 5: Letterboxd & IMDb CSV Importer */}
      <CsvImporter
        onImportComplete={(count) => {
          showToast(`Imported ${count} titles into your library`);
        }}
      />

      {/* SECTION 6: Backup & Restore */}
      <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <Database className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Backup & Restore</h2>
        </div>

        <p className="text-xs text-slate-400">
          Export your complete library as structured JSON or restore an existing backup on any device.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          {/* Export */}
          <button
            onClick={handleExportLibrary}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Library (JSON)</span>
          </button>

          {/* Import */}
          <label className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* Import confirmation preview */}
        {importPreviewCount !== null && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-300 font-semibold">
                Backup Ready: Contains {importPreviewCount} titles
              </span>
              <button
                onClick={() => setImportPreviewCount(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-300">
              This will merge these titles into your local IndexedDB archive without deleting existing data.
            </p>
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Confirm Import & Merge
            </button>
          </div>
        )}
      </div>

      {/* SECTION 6: Danger Zone */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-rose-500/20">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <h2 className="text-base font-bold text-rose-400">Danger Zone</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white">Reset Personal Library</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanently clears all movies, TV series, ratings, and notes stored in local IndexedDB.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Clear Library
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#141622] border border-rose-500/30 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Are you absolutely sure?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This action cannot be undone. All {libraryItems.length} titles in your personal WatchVault archive will be permanently wiped from this device.
            </p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#1c1f2e] text-white text-xs px-3 py-2 rounded-xl border border-white/10 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteLibrary}
                disabled={deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Wipe Entire Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
