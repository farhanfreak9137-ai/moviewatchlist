'use client';

import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StarRatingProps {
  value: number; // 0 to 10
  onChange: (rating: number) => void;
  max?: number;
  readOnly?: boolean;
}

const RATING_TIERS: Record<number, { label: string; color: string }> = {
  10: { label: 'Masterpiece', color: 'text-amber-300 border-amber-400/40 bg-amber-400/15' },
  9: { label: 'Magnificent', color: 'text-amber-300 border-amber-400/30 bg-amber-400/10' },
  8: { label: 'Great', color: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10' },
  7: { label: 'Good', color: 'text-sky-300 border-sky-400/30 bg-sky-400/10' },
  6: { label: 'Decent', color: 'text-blue-300 border-blue-400/30 bg-blue-400/10' },
  5: { label: 'Average', color: 'text-slate-300 border-slate-500/30 bg-slate-500/10' },
  4: { label: 'Weak', color: 'text-orange-300 border-orange-500/30 bg-orange-500/10' },
  3: { label: 'Poor', color: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
  2: { label: 'Awful', color: 'text-rose-400 border-rose-600/30 bg-rose-600/10' },
  1: { label: 'Disaster', color: 'text-red-400 border-red-700/30 bg-red-700/10' },
};

export function StarRating({ value, onChange, max = 10, readOnly = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const currentTier = displayValue > 0 ? RATING_TIERS[displayValue] : null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Stars row + score chip */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stars container */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 shadow-inner">
          {Array.from({ length: max }, (_, index) => {
            const starNumber = index + 1;
            const isFilled = displayValue >= starNumber;
            const isHovered = hoverValue === starNumber;
            const isTopTier = starNumber >= 9 && isFilled;

            return (
              <button
                key={starNumber}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(starNumber === value ? 0 : starNumber)}
                onMouseEnter={() => !readOnly && setHoverValue(starNumber)}
                onMouseLeave={() => !readOnly && setHoverValue(null)}
                className={cn(
                  'p-1 rounded-lg transition-all duration-150 relative group',
                  !readOnly && 'hover:scale-125 cursor-pointer active:scale-95',
                  readOnly && 'cursor-default'
                )}
                title={`${starNumber} of ${max}${RATING_TIERS[starNumber] ? ` • ${RATING_TIERS[starNumber].label}` : ''}`}
                aria-label={`Rate ${starNumber} out of ${max}`}
              >
                <Star
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isFilled
                      ? isTopTier
                        ? 'text-amber-300 fill-amber-300 golden-halo-intense scale-105'
                        : 'text-amber-400 fill-amber-400 golden-halo'
                      : 'text-slate-600 group-hover:text-amber-400/60'
                  )}
                />
                {isHovered && !readOnly && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] font-mono font-bold text-amber-300 shadow-xl pointer-events-none z-30">
                    {starNumber}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Numeric score display & Clear button */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all shadow-sm',
              displayValue > 0
                ? displayValue >= 9
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-white/5 text-slate-500 border-white/10'
            )}
          >
            <span>{displayValue > 0 ? `${displayValue} / ${max}` : 'Unrated'}</span>
          </div>

          {!readOnly && value > 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs cursor-pointer"
              title="Clear rating"
              aria-label="Clear rating"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Tier Micro-Label with soft animation */}
      {currentTier && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <span
            className={cn(
              'px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border uppercase font-mono shadow-sm',
              currentTier.color
            )}
          >
            {currentTier.label}
          </span>
          <span className="text-[11px] text-slate-400">
            {displayValue >= 9
              ? '★ High tier recommendation in your vault'
              : displayValue >= 7
              ? 'Solid positive watch'
              : 'Logged to library history'}
          </span>
        </div>
      )}
    </div>
  );
}

