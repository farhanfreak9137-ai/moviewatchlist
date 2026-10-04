'use client';

import React, { useState } from 'react';
import { LibraryItem, WatchStatus, MediaType } from '@/lib/types';
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

  const statuses: Array<{ value: WatchStatus; label: string; icon: any; color: string }> = [
    { value: 'watching', label: 'Watching', icon: PlayCircle, color: 'hover:border-sky-500 hover:text-sky-400' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'hover:border-emerald-500 hover:text-emerald-400' },
    { value: 'planned', label: 'Plan to Watch', icon: Clock, color: 'hover:border-indigo-500 hover:text-indigo-400' },
    { value: 'dropped', label: 'Dropped', icon: XCircle, color: 'hover:border-zinc-500 hover:text-zinc-400' },
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
    <div className="mt-10 rounded-2xl bg-gradient-to-b from-[#131520] to-[#0c0d14] border-2 border-red-500/20 p-6 sm:p-8 shadow-2xl relative">
      {/* Header with Visual Distinction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
              My Watch <span className="text-xs normal-case text-slate-400 font-mono tracking-normal ml-2">Personal Archive</span>
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
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
              item.is_favorite
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-md shadow-rose-950/40'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            )}
          >
            <Heart className={cn('w-4 h-4', item.is_favorite && 'fill-rose-500 text-rose-500')} />
            <span>{item.is_favorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            type="button"
            onClick={handleRewatchIncrement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Increment rewatch count"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rewatched ({item.rewatch_count || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Status, Rating, Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {/* Watch Status Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Watch Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((s) => {
              const Icon = s.icon;
              const isSelected = item.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusChange(s.value)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer',
                    isSelected
                      ? 'bg-white/10 border-red-500 text-white shadow-md'
                      : 'bg-white/[0.03] border-white/5 text-slate-400',
                    s.color
                  )}
                >
                  <Icon className={cn('w-4 h-4', isSelected && 'text-red-500')} />
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
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Personal Notes & Review</span>
          </label>
          {isSavingNotes && (
            <span className="text-[11px] text-slate-400 animate-pulse font-mono">Saving...</span>
          )}
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Write your private thoughts, memorable scenes, reflections, or who you watched it with..."
          className="w-full bg-[#12141e] border border-white/10 hover:border-white/20 focus:border-red-500 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
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
