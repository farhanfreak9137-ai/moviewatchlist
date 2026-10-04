import React from 'react';
import Link from 'next/link';
import { Film, PlayCircle, CheckCircle, Heart, Search, PlusCircle, Compass } from 'lucide-react';

interface EmptyStateProps {
  type: 'library' | 'watching' | 'completed' | 'planned' | 'dropped' | 'favorites' | 'search' | 'stats';
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
}

export function EmptyState({ type, title, description, actionText, actionHref }: EmptyStateProps) {
  const configs = {
    library: {
      icon: Film,
      title: title || 'Your library is empty',
      description: description || 'Discover movies and TV series worth watching and add them to your private archive.',
      actionText: actionText || 'Explore Discovery',
      actionHref: actionHref || '/',
    },
    watching: {
      icon: PlayCircle,
      title: title || 'No titles in progress',
      description: description || 'When you start watching a movie or TV series, mark it as "Watching" to track your progress here.',
      actionText: actionText || 'Browse Library',
      actionHref: actionHref || '/library',
    },
    completed: {
      icon: CheckCircle,
      title: title || 'You haven\'t completed anything yet',
      description: description || 'Finished watching a movie or series? Mark it as "Completed" and assign your personal rating.',
      actionText: actionText || 'Find Something to Watch',
      actionHref: actionHref || '/',
    },
    planned: {
      icon: PlusCircle,
      title: title || 'Your plan-to-watch queue is clear',
      description: description || 'Add upcoming releases or recommendations to your planned queue so you never forget.',
      actionText: actionText || 'Explore Trending Titles',
      actionHref: actionHref || '/',
    },
    dropped: {
      icon: Film,
      title: title || 'No dropped titles',
      description: description || 'Titles you decide not to continue will appear here if marked as dropped.',
      actionText: actionText || 'View Full Library',
      actionHref: actionHref || '/library',
    },
    favorites: {
      icon: Heart,
      title: title || 'No favorites yet',
      description: description || 'Tap the heart icon on any movie or series in your library to highlight your all-time favorites.',
      actionText: actionText || 'Go to My Library',
      actionHref: actionHref || '/library',
    },
    search: {
      icon: Search,
      title: title || 'No results found',
      description: description || 'Try checking for spelling or searching for another movie, TV series, or keyword.',
      actionText: actionText || 'Back to Home',
      actionHref: actionHref || '/',
    },
    stats: {
      icon: Film,
      title: title || 'No statistics recorded yet',
      description: description || 'Your watch statistics and analytics will automatically generate as you add titles, set ratings, and track viewing progress.',
      actionText: actionText || 'Discover Titles',
      actionHref: actionHref || '/',
    },
  };

  const current = configs[type] || configs.library;
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#12141f] border border-white/10 flex items-center justify-center text-slate-400 mb-5 shadow-inner">
        <Icon className="w-8 h-8 stroke-1 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{current.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">
        {current.description}
      </p>
      {current.actionHref && (
        <Link
          href={current.actionHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs tracking-wide transition-all shadow-lg shadow-red-900/30 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{current.actionText}</span>
        </Link>
      )}
    </div>
  );
}
