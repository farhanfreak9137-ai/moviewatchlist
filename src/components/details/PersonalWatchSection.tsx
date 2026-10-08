'use client';

import React, { useState } from 'react';
import { LibraryItem, WatchStatus } from '@/lib/types';
import { StarRating } from './StarRating';
import {
  BookmarkCheck,
  Heart,
  Calendar,
  RotateCcw,
  Trash2,
  CheckCircle2,
  PlayCircle,
  Clock,
  XCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PersonalWatchSectionProps {
  item: LibraryItem;
  onUpdate: (updates: Partial<LibraryItem>) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function PersonalWatchSection({ item, onUpdate, onRemove }: PersonalWatchSectionProps) {
  const [notes, setNotes] = useState(item.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const statuses: Array<{
    value: WatchStatus;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    selectedClass: string;
    color: string;
  }> = [
    { value: 'watching', label: 'Watching', icon: PlayCircle, selectedClass: 'bg-sky-500/15 border-sky-500 text-sky-300 shadow-[0_0_16px_rgba(14,165,233,0.35)]', color: 'hover:border-sky-500/60 hover:text-sky-300' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, selectedClass: 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]', color: 'hover:border-emerald-500/60 hover:text-emerald-300' },
    { value: 'planned', label: 'Plan to Watch', icon: Clock, selectedClass: 'bg-red-500/15 border-red-500 text-red-300 shadow-[0_0_16px_rgba(239,68,68,0.35)]', color: 'hover:border-red-500/60 hover:text-red-300' },
    { value: 'dropped', label: 'Dropped', icon: XCircle, selectedClass: 'bg-zinc-500/15 border-zinc-400 text-zinc-300 shadow-[0_0_14px_rgba(161,161,170,0.25)]', color: 'hover:border-zinc-500/60 hover:text-zinc-300' },
  ];

  const handleStatusChange = async (newStatus: WatchStatus) => {
    const updates: Partial<LibraryItem> = { status: newStatus };
    const today = new Date().toISOString().substring(0, 10);
    if (newStatus === 'watching' && !item.start_date) {
      updates.start_date = today;
    } else if (newStatus === 'completed' && !item.finish_date) {
      updates.finish_date = today;
    }
    await onUpdate(updates);
  };

  const handleNotesBlur = async () => {
    if (notes !== (item.notes || '')) {
      setIsSavingNotes(true);
      await onUpdate({ notes });
      setIsSavingNotes(false);
    }
  };

  const handleRewatchIncrement = async () => {
    await onUpdate({ rewatch_count: (item.rewatch_count || 0) + 1 });
  };

  return (
    <div className="mt-10 rounded-3xl bg-gradient-to-b from-[#141724] via-[#10121a] to-[#0a0b10] border border-red-500/30 p-6 sm:p-8 shadow-[0_0_60px_-15px_rgba(229,9,20,0.25)] relative overflow-hidden">
      {/* Top ambient OLED red spill */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Visual Distinction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 shadow-[0_0_14px_rgba(239,68,68,0.3)]">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
              My Watch <span className="text-xs normal-case text-slate-400 font-mono tracking-normal ml-2">Personal Vault Entry</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Stored locally on your device with offline availability.
          </p>
        </div>

        {/* Favorite & Rewatch toggles */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onUpdate({ is_favorite: !item.is_favorite })}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer tap-bounce',
              item.is_favorite
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.35)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            )}
          >
            <Heart className={cn('w-4 h-4 transition-transform duration-200', item.is_favorite && 'fill-rose-500 text-rose-500 scale-110')} />
            <span>{item.is_favorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            type="button"
            onClick={handleRewatchIncrement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all cursor-pointer tap-bounce"
            title="Increment rewatch count"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rewatched ({item.rewatch_count || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Status, Rating, Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 relative z-10">
        {/* Watch Status Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Watch Status
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {statuses.map((s) => {
              const Icon = s.icon;
              const isSelected = item.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusChange(s.value)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer tap-bounce',
                    isSelected
                      ? s.selectedClass
                      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06]',
                    s.color
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0 transition-transform', isSelected && 'scale-110')} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Personal Star Rating */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Personal Rating
          </label>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-center">
            <StarRating
              value={item.rating || 0}
              onChange={(rating) => onUpdate({ rating })}
            />
            <p className="text-[11px] text-slate-400 mt-2">
              Your personal score is stored locally and syncs to your second device.
            </p>
          </div>
        </div>

        {/* TV Series Specific Progress Counters */}
        {item.media_type === 'tv' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Series Progress
            </label>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Current Season</span>
                <input
                  type="number"
                  min="1"
                  max={item.number_of_seasons || 99}
                  value={item.current_season || 1}
                  onChange={(e) => onUpdate({ current_season: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#181a24] text-white font-mono text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Current Episode</span>
                <input
                  type="number"
                  min="0"
                  max={item.number_of_episodes || 999}
                  value={item.current_episode || 0}
                  onChange={(e) => onUpdate({ current_episode: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#181a24] text-white font-mono text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Watch Dates */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Watch Dates
          </label>
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                Started
              </span>
              <input
                type="date"
                value={item.start_date || ''}
                onChange={(e) => onUpdate({ start_date: e.target.value || undefined })}
                className="w-full bg-[#181a24] text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                Finished
              </span>
              <input
                type="date"
                value={item.finish_date || ''}
                onChange={(e) => onUpdate({ finish_date: e.target.value || undefined })}
                className="w-full bg-[#181a24] text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Notes Textarea */}
      <div className="space-y-2 mb-6 relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Personal Notes & Private Review</span>
          </label>
          <div className="flex items-center gap-2">
            {isSavingNotes ? (
              <span className="text-[10px] text-sky-400 animate-pulse font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Saving...
              </span>
            ) : notes.length > 0 ? (
              <span className="text-[10px] text-slate-500 font-mono">
                {notes.length} chars
              </span>
            ) : null}
          </div>
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Write your private impressions, unforgettable moments, favorite quotes, or thoughts..."
          className="w-full bg-[#0e1017]/90 border border-white/10 hover:border-white/20 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
        />
      </div>

      {/* Footer with Metadata & Destructive Remove Button */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
        <div className="space-y-0.5">
          <p>Added: <span className="text-slate-300 font-mono">{new Date(item.created_at).toLocaleDateString()}</span></p>
          <p>Last modified: <span className="text-slate-300 font-mono">{new Date(item.updated_at).toLocaleString()}</span></p>
        </div>

        <div>
          {showRemoveConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-rose-400 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Remove from library?
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors cursor-pointer"
              >
                Yes, Remove
              </button>
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-500/30 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from Library</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
