import React from 'react';
import { CastMember } from '@/lib/types';
import { getImageUrl } from '@/lib/metadata/tmdb';
import { User } from 'lucide-react';

interface CastCarouselProps {
  cast: CastMember[];
}

export function CastCarousel({ cast }: CastCarouselProps) {
  if (!cast || cast.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-white mb-4 tracking-tight">Top Cast</h3>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x scroll-smooth">
        {cast.map((person) => {
          const profileUrl = getImageUrl(person.profile_path, 'w185');
          return (
            <div
              key={person.id}
              className="w-24 sm:w-28 shrink-0 snap-start flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#181a26] border border-white/10 mb-2 shadow-lg">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt={person.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-200 line-clamp-1 w-full">
                {person.name}
              </p>
              <p className="text-[11px] text-slate-400 line-clamp-1 w-full mt-0.5">
                {person.character}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
