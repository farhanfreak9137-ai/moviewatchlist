import { getCachedMetadata, setCachedMetadata } from '../db';
import { tmdbService } from './tmdb';
import { MediaType } from '../types';
import { useState, useEffect } from 'react';

export type FinancialVerdict = 'blockbuster' | 'hit' | 'average' | 'flop' | 'unknown';

export interface FinancialPerformance {
  budget: number; // in USD (0 if unrecorded)
  revenue: number; // in USD (0 if unrecorded)
  profit: number; // revenue - budget
  roiMultiplier: number; // revenue / budget
  roiPercentage: number; // ((revenue - budget) / budget) * 100
  verdict: FinancialVerdict;
  verdictLabel: string; // e.g. "Mega Blockbuster", "Box Office Hit", "Flop"
  verdictColor: 'emerald' | 'amber' | 'yellow' | 'rose' | 'slate';
  formattedRevenue: string; // e.g. "$2.93B", "$311M"
  formattedFullRevenue: string; // e.g. "$2,925,499,985"
  formattedBudget: string; // e.g. "$356M"
  formattedFullBudget: string; // e.g. "$356,000,000"
  formattedProfit: string; // e.g. "+$2.57B" or "-$82M"
  formattedMultiplier: string; // e.g. "8.2x"
  hasBoxOfficeData: boolean;
  estimatedCrores?: string; // For Bangladeshi Taka context (approx ~৳2,500 Cr)
  tvMetrics?: {
    status?: string;
    seasonsCount?: number;
    episodesCount?: number;
    voteAverage?: number;
    voteCount?: number;
    verdict: FinancialVerdict;
    verdictLabel: string;
  };
}

// Format numbers into compact dollar strings ($2.93B, $311M, $45.2M, $850K)
export function formatCurrencyCompact(amount: number): string {
  if (!amount || amount === 0) return '$0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  let formatted = '';

  if (abs >= 1_000_000_000) {
    formatted = `$${(abs / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`;
  } else if (abs >= 1_000_000) {
    formatted = `$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  } else if (abs >= 1_000) {
    formatted = `$${(abs / 1_000).toFixed(0)}K`;
  } else {
    formatted = `$${abs.toLocaleString()}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function formatCurrencyFull(amount: number): string {
  if (!amount || amount === 0) return '$0';
  const prefix = amount < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(amount).toLocaleString('en-US')}`;
}

// Convert USD to estimated Bangladeshi Taka Crores (1 USD ~ 122 BDT, 1 Crore = 10M BDT)
export function getEstimatedBdtCrores(usdAmount: number): string | undefined {
  if (!usdAmount || usdAmount <= 0) return undefined;
  // 1 USD ~ 122 BDT (Bangladeshi Taka). 1 Crore = 10,000,000 BDT.
  const crores = (usdAmount * 122) / 10_000_000;
  if (crores >= 100) {
    return `~৳${Math.round(crores).toLocaleString('en-US')} Cr`;
  } else if (crores >= 1) {
    return `~৳${crores.toFixed(1)} Cr`;
  } else if (crores >= 0.01) {
    const lakh = (usdAmount * 122) / 100_000;
    return `~৳${lakh.toFixed(1)} Lakh`;
  }
  return undefined;
}

// Backward-compatible alias
export const getEstimatedInrCrores = getEstimatedBdtCrores;

export function calculateMovieFinancials(
  budget: number = 0,
  revenue: number = 0,
  voteAverage: number = 0,
  voteCount: number = 0
): FinancialPerformance {
  const hasBoxOffice = revenue > 0;
  const profit = revenue - budget;
  const roiMultiplier = budget > 0 ? revenue / budget : 0;
  const roiPercentage = budget > 0 ? ((revenue - budget) / budget) * 100 : 0;

  let verdict: FinancialVerdict = 'unknown';
  let verdictLabel = 'Not Reported';
  let verdictColor: 'emerald' | 'amber' | 'yellow' | 'rose' | 'slate' = 'slate';

  if (hasBoxOffice) {
    if (budget > 0) {
      // Standard Film Industry Theatrical 2.0x-2.5x Breakeven Rule
      if (roiMultiplier >= 3.0 || revenue >= 1_000_000_000) {
        verdict = 'blockbuster';
        verdictLabel = revenue >= 1_000_000_000 ? 'All-Time Blockbuster' : 'Mega Blockbuster';
        verdictColor = 'amber';
      } else if (roiMultiplier >= 2.0 || (profit > 0 && roiMultiplier >= 1.7)) {
        verdict = 'hit';
        verdictLabel = roiMultiplier >= 2.5 ? 'Super Hit' : 'Box Office Hit';
        verdictColor = 'emerald';
      } else if (roiMultiplier >= 1.25) {
        verdict = 'average';
        verdictLabel = 'Breakeven / Average';
        verdictColor = 'yellow';
      } else {
        verdict = 'flop';
        verdictLabel = 'Box Office Flop';
        verdictColor = 'rose';
      }
    } else {
      // Budget unrecorded in TMDB, but gross revenue is recorded
      if (revenue >= 500_000_000) {
        verdict = 'blockbuster';
        verdictLabel = 'Global Blockbuster';
        verdictColor = 'amber';
      } else if (revenue >= 50_000_000) {
        verdict = 'hit';
        verdictLabel = 'Commercial Hit';
        verdictColor = 'emerald';
      } else if (revenue >= 10_000_000) {
        verdict = 'average';
        verdictLabel = 'Moderate Earner';
        verdictColor = 'yellow';
      } else {
        verdict = 'flop';
        verdictLabel = 'Low Box Office';
        verdictColor = 'rose';
      }
    }
  } else {
    // Neither budget nor revenue is recorded
    if (voteCount >= 100) {
      if (voteAverage >= 7.8) {
        verdict = 'hit';
        verdictLabel = 'Acclaimed Hit';
        verdictColor = 'emerald';
      } else if (voteAverage >= 6.0) {
        verdict = 'average';
        verdictLabel = 'Audience Approved';
        verdictColor = 'slate';
      } else if (voteAverage > 0 && voteAverage < 5.0) {
        verdict = 'flop';
        verdictLabel = 'Critical Flop';
        verdictColor = 'rose';
      }
    }
  }

  return {
    budget,
    revenue,
    profit,
    roiMultiplier,
    roiPercentage,
    verdict,
    verdictLabel,
    verdictColor,
    formattedRevenue: formatCurrencyCompact(revenue),
    formattedFullRevenue: formatCurrencyFull(revenue),
    formattedBudget: formatCurrencyCompact(budget),
    formattedFullBudget: formatCurrencyFull(budget),
    formattedProfit: (profit >= 0 ? '+' : '') + formatCurrencyCompact(profit),
    formattedMultiplier: roiMultiplier > 0 ? `${roiMultiplier.toFixed(1)}x` : 'N/A',
    hasBoxOfficeData: hasBoxOffice,
    estimatedCrores: getEstimatedInrCrores(revenue),
  };
}

export function calculateTvPerformance(
  voteAverage: number = 0,
  voteCount: number = 0,
  status?: string,
  seasonsCount?: number,
  episodesCount?: number
): FinancialPerformance {
  let verdict: FinancialVerdict = 'unknown';
  let verdictLabel = 'Streaming Series';
  let verdictColor: 'emerald' | 'amber' | 'yellow' | 'rose' | 'slate' = 'slate';

  const isCanceled = status?.toLowerCase() === 'canceled';

  if (isCanceled || (voteAverage > 0 && voteAverage < 5.2 && voteCount >= 100)) {
    verdict = 'flop';
    verdictLabel = isCanceled ? 'Canceled / Flop' : 'Flop Series';
    verdictColor = 'rose';
  } else if (voteAverage >= 8.2 && (voteCount >= 200 || (seasonsCount && seasonsCount >= 4))) {
    verdict = 'blockbuster';
    verdictLabel = 'Mega Hit Series';
    verdictColor = 'amber';
  } else if (voteAverage >= 7.2 || (seasonsCount && seasonsCount >= 2)) {
    verdict = 'hit';
    verdictLabel = 'Hit Series';
    verdictColor = 'emerald';
  } else if (voteAverage >= 6.0) {
    verdict = 'average';
    verdictLabel = 'Popular Show';
    verdictColor = 'yellow';
  } else {
    verdict = 'average';
    verdictLabel = 'Television Series';
    verdictColor = 'slate';
  }

  return {
    budget: 0,
    revenue: 0,
    profit: 0,
    roiMultiplier: 0,
    roiPercentage: 0,
    verdict,
    verdictLabel,
    verdictColor,
    formattedRevenue: voteAverage > 0 ? `${voteAverage.toFixed(1)}★` : 'N/A',
    formattedFullRevenue: voteCount > 0 ? `${voteCount.toLocaleString()} votes` : 'N/A',
    formattedBudget: 'N/A',
    formattedFullBudget: 'N/A',
    formattedProfit: voteCount > 0 ? `${voteCount.toLocaleString()} ratings` : 'N/A',
    formattedMultiplier: seasonsCount ? `${seasonsCount} Seasons` : 'N/A',
    hasBoxOfficeData: false,
    tvMetrics: {
      status,
      seasonsCount,
      episodesCount,
      voteAverage,
      voteCount,
      verdict,
      verdictLabel,
    },
  };
}

// In-memory memory cache
const memoryCache = new Map<string, FinancialPerformance>();

// Concurrency-limited request queue to avoid TMDB flooding
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private concurrency = 6;

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private process() {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;
      this.activeCount++;
      task().finally(() => {
        this.activeCount--;
        this.process();
      });
    }
  }
}

const queue = new RequestQueue();

export async function fetchFinancialPerformance(
  id: number,
  mediaType: MediaType,
  voteAverage: number = 0,
  voteCount: number = 0
): Promise<FinancialPerformance> {
  const cacheKey = `fin_${mediaType}_${id}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check Dexie cache
  const cached = await getCachedMetadata<FinancialPerformance>(cacheKey);
  if (cached) {
    memoryCache.set(cacheKey, cached);
    return cached;
  }

  if (mediaType === 'tv') {
    // For TV, compute instantly from ratings/engagement, or fetch TV details
    const performance = calculateTvPerformance(voteAverage, voteCount);
    memoryCache.set(cacheKey, performance);
    setCachedMetadata(cacheKey, performance, 604800);
    return performance;
  }

  // For movie, fetch details to get budget and revenue
  try {
    const details = await queue.add(() => tmdbService.getMovieDetails(id));
    const performance = calculateMovieFinancials(
      details.budget || 0,
      details.revenue || 0,
      details.vote_average || voteAverage,
      details.vote_count || voteCount
    );

    memoryCache.set(cacheKey, performance);
    setCachedMetadata(cacheKey, performance, 604800);
    return performance;
  } catch {
    const fallback = calculateMovieFinancials(0, 0, voteAverage, voteCount);
    memoryCache.set(cacheKey, fallback);
    return fallback;
  }
}

// React hook for UI components (MediaCard, title page, etc.)
export function useFinancials(
  id: number,
  mediaType: MediaType,
  voteAverage: number = 0,
  voteCount: number = 0
): { financial: FinancialPerformance | null; loading: boolean } {
  const cacheKey = `fin_${mediaType}_${id}`;
  const [data, setData] = useState<FinancialPerformance | null>(() => memoryCache.get(cacheKey) || null);
  const [loading, setLoading] = useState<boolean>(() => !memoryCache.has(cacheKey));

  useEffect(() => {
    let isMounted = true;
    if (memoryCache.has(cacheKey)) return;

    fetchFinancialPerformance(id, mediaType, voteAverage, voteCount).then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id, mediaType, voteAverage, voteCount, cacheKey]);

  const currentFinancial = memoryCache.get(cacheKey) || data;
  return { financial: currentFinancial, loading: !currentFinancial && loading };
}
