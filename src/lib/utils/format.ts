import { WatchStatus } from '../types';

export function formatMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatYear(dateString?: string): string {
  if (!dateString) return '';
  return dateString.substring(0, 4);
}

export function getStatusLabel(status: WatchStatus): string {
  switch (status) {
    case 'watching':
      return 'Watching';
    case 'completed':
      return 'Completed';
    case 'planned':
      return 'Plan to Watch';
    case 'dropped':
      return 'Dropped';
    default:
      return status;
  }
}

export function getStatusBadgeStyle(status: WatchStatus): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'watching':
      return {
        bg: 'bg-sky-500/10',
        text: 'text-sky-400',
        border: 'border-sky-500/20',
        dot: 'bg-sky-400',
      };
    case 'completed':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
        dot: 'bg-emerald-400',
      };
    case 'planned':
      return {
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/20',
        dot: 'bg-indigo-400',
      };
    case 'dropped':
      return {
        bg: 'bg-zinc-500/10',
        text: 'text-zinc-400',
        border: 'border-zinc-500/20',
        dot: 'bg-zinc-400',
      };
  }
}
