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

export function StarRating({ value, onChange, max = 10, readOnly = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Stars row */}
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = displayValue >= starNumber;

          return (
            <button
              key={starNumber}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(starNumber === value ? 0 : starNumber)}
              onMouseEnter={() => !readOnly && setHoverValue(starNumber)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              className={cn(
                'p-0.5 rounded transition-transform',
                !readOnly && 'hover:scale-125 cursor-pointer',
                readOnly && 'cursor-default'
              )}
              title={`${starNumber} of ${max}`}
            >
              <Star
                className={cn(
                  'w-5 h-5 transition-colors',
                  isFilled
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                    : 'text-slate-600 hover:text-amber-400/50'
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Numeric score display & Clear button */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-xs font-mono font-bold px-2 py-0.5 rounded-md border',
            value > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-white/5 text-slate-500 border-white/10'
          )}
        >
          {value > 0 ? `${value} / ${max}` : 'Unrated'}
        </span>

        {!readOnly && value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors text-xs"
            title="Clear rating"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
