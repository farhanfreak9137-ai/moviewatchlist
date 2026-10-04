import React from 'react';
import { WatchStatus } from '@/lib/types';
import { getStatusBadgeStyle, getStatusLabel } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface StatusBadgeProps {
  status: WatchStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const style = getStatusBadgeStyle(status);
  const label = getStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border uppercase tracking-wider',
        style.bg,
        style.text,
        style.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
      <span>{label}</span>
    </span>
  );
}
