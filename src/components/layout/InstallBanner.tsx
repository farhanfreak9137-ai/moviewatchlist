'use client';

import React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Smartphone, Download, Check } from 'lucide-react';

export function InstallBanner() {
  const { isInstallable, isInstalled, triggerInstall } = usePWAInstall();

  if (isInstalled) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <span className="font-bold text-white block">Installed as Android App</span>
            <span className="text-slate-400 text-[11px]">Running in standalone fullscreen mode</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isInstallable) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#151724] to-[#0f111a] border border-red-500/30 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-sm">Install WatchVault App</span>
            <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-mono font-bold uppercase">
              Android
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            Install to your Samsung Galaxy S21+ app drawer with offline access and fullscreen mode.
          </p>
        </div>
      </div>

      <button
        onClick={triggerInstall}
        className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-900/30 whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    </div>
  );
}
