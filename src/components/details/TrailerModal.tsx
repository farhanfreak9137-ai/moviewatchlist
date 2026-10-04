'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';

interface TrailerModalProps {
  videoKey: string | null;
  title: string;
  onClose: () => void;
}

export function TrailerModal({ videoKey, title, onClose }: TrailerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!videoKey || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-white/15 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Top bar with title and close */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#11131c] border-b border-white/10 text-white">
          <div className="flex items-center gap-2 truncate pr-4">
            <Play className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
            <span className="text-xs sm:text-sm font-bold truncate">{title} — Official Trailer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close trailer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 16:9 responsive YouTube Embed */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
            title={`${title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
