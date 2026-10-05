'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSync } from '@/hooks/useSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { RefreshCw, WifiOff, CheckCircle2, AlertCircle, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function SyncBadge() {
  const { syncState, pendingCount, lastSyncedAt, deviceName, userEmail, triggerSync } = useSync();
  const isOnline = useNetworkStatus();
  const router = useRouter();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const isSignedOut = syncState === 'signed_out';

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSignedOut) {
      router.push('/settings');
      return;
    }
    if (!isOnline || isManualSyncing) return;
    setIsManualSyncing(true);
    await triggerSync();
    setIsManualSyncing(false);
  };

  const getStatusDisplay = () => {
    if (isSignedOut) {
      return {
        label: 'Sign in',
        sublabel: 'Sign in under Settings to sync your phone and PC',
        color: 'text-slate-300 bg-white/5 border-white/15',
        dot: 'bg-slate-400',
        icon: CloudOff,
      };
    }
    if (!isOnline || syncState === 'offline') {
      return {
        label: 'Offline',
        sublabel: 'Local storage active',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        dot: 'bg-amber-400',
        icon: WifiOff,
      };
    }
    if (syncState === 'syncing' || isManualSyncing) {
      return {
        label: 'Syncing',
        sublabel: 'Updating devices...',
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        dot: 'bg-sky-400 animate-pulse',
        icon: RefreshCw,
        spin: true,
      };
    }
    if (pendingCount > 0) {
      return {
        label: `${pendingCount} waiting`,
        sublabel: 'Pending cloud sync',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        dot: 'bg-amber-400 animate-pulse',
        icon: RefreshCw,
      };
    }
    if (syncState === 'error') {
      return {
        label: 'Sync paused',
        sublabel: 'Changes safe on device',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        dot: 'bg-rose-400',
        icon: AlertCircle,
      };
    }
    return {
      label: 'Synced',
      sublabel: 'All devices up to date',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      dot: 'bg-emerald-400',
      icon: CheckCircle2,
    };
  };

  const status = getStatusDisplay();
  const Icon = status.icon;

  return (
    <div className="relative inline-block">
      <button
        onClick={handleManualSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer hover:opacity-90',
          status.color
        )}
        title={isSignedOut ? 'Sign in to sync' : 'Click to sync now'}
      >
        <span className={cn('w-2 h-2 rounded-full', status.dot)} />
        <span className="hidden sm:inline font-mono tracking-tight">{status.label}</span>
        <Icon className={cn('w-3.5 h-3.5', status.spin && 'animate-spin')} />
      </button>

      {/* Popover Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#131620] border border-white/10 rounded-xl shadow-2xl z-50 text-xs text-slate-300">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', status.dot)} />
              Sync Status
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="space-y-1.5 mb-2.5">
            <p className="text-slate-300">{status.sublabel}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Device:</span>
              <span className="font-medium text-slate-200 truncate max-w-[130px]">{deviceName}</span>
            </div>
            {userEmail && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Account:</span>
                <span className="font-medium text-slate-200 truncate max-w-[150px]">{userEmail}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Last Synced:</span>
              <span className="text-slate-200 font-mono">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Not yet'}
              </span>
            </div>
          </div>
          {(isOnline || isSignedOut) && (
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-center font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={cn('w-3 h-3', isManualSyncing && 'animate-spin')} />
              {isSignedOut ? 'Go to sign in' : isManualSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
