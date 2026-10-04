'use client';

import React, { useState, useEffect } from 'react';
import { useSync } from '@/hooks/useSync';
import { useLibrary } from '@/hooks/useLibrary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { db, clearDiscoveryCache } from '@/lib/db';
import { LibraryItem } from '@/lib/types';
import {
  SlidersHorizontal,
  RefreshCw,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Key,
  Laptop,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function SettingsPage() {
  const { syncState, pendingCount, lastSyncedAt, deviceId, deviceName, triggerSync } = useSync();
  const { libraryItems } = useLibrary();
  const isOnline = useNetworkStatus();

  // Local state
  const [editingDeviceName, setEditingDeviceName] = useState(deviceName);
  const [customKey, setCustomKey] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<{ usage: string; quota: string } | null>(null);
  const [discoveryCacheCount, setDiscoveryCacheCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Danger zone modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Import preview
  const [importFile, setImportFile] = useState<any | null>(null);
  const [importPreviewCount, setImportPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    setEditingDeviceName(deviceName);
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
      if (customKeySetting?.value) {
        setCustomKey(customKeySetting.value);
      }
    }
    loadStats();
  }, [libraryItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
    const allItems = await db.library_items.where('is_deleted').equals(0).toArray();
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
      } catch (err) {
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
          await db.episode_progress.put(ep);
        }
      }

      setImportFile(null);
      setImportPreviewCount(null);
      showToast(`Imported ${importFile.library_items.length} titles into library`);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  // Clear entire library
  const handleConfirmDeleteLibrary = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    await db.library_items.clear();
    await db.episode_progress.clear();
    await db.sync_queue.clear();
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Sync Status</span>
            <span className="text-base font-bold text-white capitalize">{syncState}</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Pending Outbox</span>
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
            disabled={!isOnline || isSyncing}
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

      {/* SECTION 3: Metadata Provider Configuration (TMDB) */}
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

      {/* SECTION 5: Backup & Restore */}
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
