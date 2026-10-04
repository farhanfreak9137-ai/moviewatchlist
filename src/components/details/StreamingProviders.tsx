'use client';

import React from 'react';
import { getImageUrl } from '@/lib/metadata/tmdb';
import { Tv, ExternalLink } from 'lucide-react';

interface StreamingProvidersProps {
  providersData?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        rent?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        buy?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
      }
    >;
  };
}

export function StreamingProviders({ providersData }: StreamingProvidersProps) {
  if (!providersData?.results) return null;

  const results = providersData.results;

  // Detect country preference from user locale or fallback to US, GB, or first country with data
  const userCountry =
    typeof navigator !== 'undefined' && navigator.language
      ? navigator.language.split('-')[1]?.toUpperCase()
      : 'US';

  const countryData =
    results[userCountry] ||
    results['US'] ||
    results['GB'] ||
    Object.values(results).find((c) => (c.flatrate && c.flatrate.length > 0) || (c.rent && c.rent.length > 0));

  if (!countryData) return null;

  const streamList = countryData.flatrate || [];
  const rentBuyList = (countryData.rent || countryData.buy || []).slice(0, 4);

  if (streamList.length === 0 && rentBuyList.length === 0) return null;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#11131c] border border-white/5 space-y-2.5 mb-6">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Tv className="w-3.5 h-3.5 text-sky-400" />
          <span>Where to Watch:</span>
        </span>
        {countryData.link && (
          <a
            href={countryData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 font-mono transition-colors"
          >
            <span>Via JustWatch</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {streamList.length > 0 ? (
          streamList.map((p) => (
            <div
              key={p.provider_id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#181a24] border border-white/10 shadow-sm"
              title={`Stream on ${p.provider_name}`}
            >
              {p.logo_path && (
                <img
                  src={getImageUrl(p.logo_path, 'w185') || ''}
                  alt={p.provider_name}
                  className="w-5 h-5 rounded-md object-cover"
                />
              )}
              <span className="text-xs font-medium text-slate-200">{p.provider_name}</span>
            </div>
          ))
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-500">Available to rent/buy:</span>
            {rentBuyList.map((p) => (
              <div
                key={p.provider_id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#181a24] border border-white/5 text-xs text-slate-300"
              >
                {p.logo_path && (
                  <img
                    src={getImageUrl(p.logo_path, 'w185') || ''}
                    alt={p.provider_name}
                    className="w-4 h-4 rounded object-cover"
                  />
                )}
                <span className="text-[11px]">{p.provider_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
