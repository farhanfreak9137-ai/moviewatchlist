'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Film,
  Award,
  Hourglass,
} from 'lucide-react';
import { getReleaseEraInfo } from '@/lib/utils/releaseEra';
import { cn } from '@/lib/utils/cn';

interface ReleaseDateBadgeProps {
  releaseDate?: string | null;
  status?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showFullDate?: boolean;
  className?: string;
}

export function ReleaseDateBadge({
  releaseDate,
  status,
  size = 'md',
  showFullDate = true,
  className,
}: ReleaseDateBadgeProps) {
  const info = getReleaseEraInfo(releaseDate, status);

  if (!releaseDate && !info.isUpcoming) {
    return null;
  }

  const dateText = showFullDate ? info.fullFormattedDate : info.formattedDate;

  // 1. UPCOMING: Explicit text saying "Upcoming" with futuristic clock & countdown
  if (info.isUpcoming) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border font-mono transition-all duration-300',
          'bg-gradient-to-r from-violet-950/80 via-[#19112d] to-fuchsia-950/60 border-violet-500/40 text-violet-200 shadow-[0_0_16px_-2px_rgba(168,85,247,0.35)]',
          size === 'sm' && 'px-2 py-0.5 text-[10px]',
          size === 'md' && 'px-2.5 py-1 text-xs',
          size === 'lg' && 'px-3.5 py-1.5 text-sm',
          className
        )}
        title={`Upcoming Title • Expected: ${info.fullFormattedDate}`}
      >
        <Clock className={cn('text-violet-400 shrink-0 animate-pulse', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5')} />
        <span className="font-extrabold uppercase tracking-wider text-violet-300">
          Upcoming
        </span>
        {info.formattedDate && info.formattedDate !== 'TBA' && (
          <>
            <span className="text-violet-500/60">•</span>
            <span className="text-violet-200 font-medium">{dateText}</span>
          </>
        )}
        {info.relativeLabel && (
          <span className="ml-0.5 px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[9px] font-semibold tracking-tight border border-violet-400/30">
            {info.relativeLabel}
          </span>
        )}
      </div>
    );
  }

  // 2. NEW (Fresh Premiere): Indicated NOT by text, but by radiant emerald radar pulse & holographic sparkles
  if (info.isNew) {
    return (
      <div
        className={cn(
          'relative group inline-flex items-center gap-1.5 rounded-lg border font-mono transition-all duration-300 overflow-hidden',
          'bg-gradient-to-r from-emerald-950/70 via-[#0a1e16] to-teal-950/50 border-emerald-500/45 text-emerald-100 shadow-[0_0_18px_-2px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/20',
          size === 'sm' && 'px-2 py-0.5 text-[10px]',
          size === 'md' && 'px-2.5 py-1 text-xs',
          size === 'lg' && 'px-3.5 py-1.5 text-sm',
          className
        )}
        title={`Fresh Premiere: ${info.fullFormattedDate} (${info.relativeLabel})`}
      >
        {/* Pulsing Quantum Live Radar Beacon */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </span>

        {/* Date Display */}
        <Calendar className={cn('text-emerald-400 shrink-0', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5')} />
        <span className="font-semibold text-emerald-200">{dateText}</span>

        {/* Shimmering Star Sparkle Micro-Animation */}
        <Sparkles
          className={cn(
            'text-emerald-300 animate-pulse shrink-0 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]',
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
          )}
        />

        {/* Ambient bottom holographic highlight line */}
        <span className="absolute bottom-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      </div>
    );
  }

  // 3. CLASSIC / OLD: Indicated NOT by text, but by vintage 35mm film reel ticket-stub, sepia-gold patina & golden laurel
  if (info.isClassic) {
    return (
      <div
        className={cn(
          'relative group inline-flex items-center gap-1.5 rounded-lg border font-serif transition-all duration-300',
          'bg-gradient-to-r from-amber-950/80 via-[#221808] to-yellow-950/60 border-amber-500/50 text-amber-100 shadow-[0_0_18px_-2px_rgba(245,158,11,0.25)]',
          'border-l-2 border-r-2 border-dashed border-amber-400/60',
          size === 'sm' && 'px-2 py-0.5 text-[10px]',
          size === 'md' && 'px-2.5 py-1 text-xs',
          size === 'lg' && 'px-3.5 py-1.5 text-sm',
          className
        )}
        title={`Cinema Classic: ${info.fullFormattedDate} (${info.yearsAgo} years since premiere)`}
      >
        {/* Retro 35mm Cinema Reel Icon */}
        <Film
          className={cn(
            'text-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]',
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
          )}
        />

        {/* Date Display */}
        <span className="font-medium tracking-wide text-amber-200 font-mono">{dateText}</span>

        {/* Golden Archival Laurel / Heritage Seal */}
        <Award
          className={cn(
            'text-amber-300 shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]',
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
          )}
        />
      </div>
    );
  }

  // 4. MODERN (Mid-Era): Clean contemporary slate-blue calendar styling
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 font-mono transition-colors hover:border-white/20',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3.5 py-1.5 text-sm',
        className
      )}
      title={`Release Date: ${info.fullFormattedDate}`}
    >
      <Calendar className={cn('text-sky-400 shrink-0', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5')} />
      <span className="font-medium">{dateText}</span>
    </div>
  );
}
