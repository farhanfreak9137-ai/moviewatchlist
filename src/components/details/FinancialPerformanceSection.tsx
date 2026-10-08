'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Sparkles,
  AlertTriangle,
  Tv,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  calculateMovieFinancials,
  calculateTvPerformance,
  FinancialPerformance,
  formatCurrencyFull,
} from '@/lib/metadata/financials';
import { MediaType } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface FinancialPerformanceSectionProps {
  mediaType: MediaType;
  title: string;
  budget?: number;
  revenue?: number;
  voteAverage?: number;
  voteCount?: number;
  status?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  className?: string;
}

export function FinancialPerformanceSection({
  mediaType,
  title,
  budget = 0,
  revenue = 0,
  voteAverage = 0,
  voteCount = 0,
  status,
  numberOfSeasons,
  numberOfEpisodes,
  className,
}: FinancialPerformanceSectionProps) {
  const isMovie = mediaType === 'movie';

  const financials: FinancialPerformance = isMovie
    ? calculateMovieFinancials(budget, revenue, voteAverage, voteCount)
    : calculateTvPerformance(voteAverage, voteCount, status, numberOfSeasons, numberOfEpisodes);

  const {
    verdict,
    verdictLabel,
    formattedRevenue,
    formattedBudget,
    formattedProfit,
    formattedMultiplier,
    roiPercentage,
    hasBoxOfficeData,
    estimatedCrores,
  } = financials;

  const isFlop = verdict === 'flop';
  const isBlockbuster = verdict === 'blockbuster';
  const isHit = verdict === 'hit';

  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-3xl border transition-all duration-300 mb-8',
        isBlockbuster
          ? 'bg-gradient-to-br from-amber-950/30 via-[#10121a] to-[#0f111a] border-amber-500/30 shadow-lg shadow-amber-950/20'
          : isHit
          ? 'bg-gradient-to-br from-emerald-950/30 via-[#10121a] to-[#0f111a] border-emerald-500/30 shadow-lg shadow-emerald-950/20'
          : isFlop
          ? 'bg-gradient-to-br from-rose-950/30 via-[#10121a] to-[#0f111a] border-rose-500/30 shadow-lg shadow-rose-950/20'
          : 'bg-[#11131c] border-white/10',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-2 rounded-xl border',
              isBlockbuster
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : isHit
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isFlop
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-white/5 border-white/10 text-slate-300'
            )}
          >
            {isMovie ? <DollarSign className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{isMovie ? 'Box Office & Commercial Success' : 'Show Performance & Success'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isMovie
                ? 'Worldwide theatrical gross, production budget, net profit & box office verdict'
                : 'Streaming engagement, audience acclaim & television success verdict'}
            </p>
          </div>
        </div>

        {/* Prominent Verdict Pill */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs tracking-wider uppercase backdrop-blur-md shadow-md',
            isBlockbuster
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-amber-900/30'
              : isHit
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-900/30'
              : isFlop
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-rose-900/30'
              : 'bg-slate-800/80 border-white/10 text-slate-300'
          )}
        >
          {isBlockbuster ? (
            <Sparkles className="w-4 h-4 text-amber-400" />
          ) : isHit ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : isFlop ? (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          )}
          <span>{verdictLabel}</span>
        </div>
      </div>

      {/* Financial Metrics 4-Card Grid */}
      {isMovie ? (
        hasBoxOfficeData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {/* 1. Actual Amount Earned (Revenue) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Actual Earned (Gross)
              </span>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formattedRevenue}
                </span>
                {estimatedCrores && (
                  <span className="text-[11px] block font-mono text-amber-400 font-semibold mt-0.5">
                    {estimatedCrores}
                  </span>
                )}
                <span className="text-[10px] block font-mono text-slate-400 mt-1 truncate" title={formatCurrencyFull(revenue)}>
                  {formatCurrencyFull(revenue)}
                </span>
              </div>
            </div>

            {/* 2. Production Budget */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Production Budget
              </span>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-200 tracking-tight">
                  {budget > 0 ? formattedBudget : 'Unreported'}
                </span>
                <span className="text-[10px] block font-mono text-slate-400 mt-1">
                  {budget > 0 ? formatCurrencyFull(budget) : 'Estimated indie / regional'}
                </span>
              </div>
            </div>

            {/* 3. Net Profit / Margin */}
            <div
              className={cn(
                'p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between',
                financials.profit >= 0
                  ? 'bg-emerald-950/20 border-emerald-500/20'
                  : 'bg-rose-950/20 border-rose-500/20'
              )}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Net Box Office Margin
              </span>
              <div className="mt-1">
                <span
                  className={cn(
                    'text-xl sm:text-2xl font-black tracking-tight',
                    financials.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {budget > 0 ? formattedProfit : formattedRevenue}
                </span>
                <span className="text-[10px] block font-mono text-slate-400 mt-1">
                  {budget > 0
                    ? financials.profit >= 0
                      ? 'Gross theatrical surplus'
                      : 'Theatrical shortfall'
                    : 'Theatrical gross proceeds'}
                </span>
              </div>
            </div>

            {/* 4. Success Rate / ROI Multiplier */}
            <div
              className={cn(
                'p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between',
                isBlockbuster
                  ? 'bg-amber-950/20 border-amber-500/20'
                  : isHit
                  ? 'bg-emerald-950/20 border-emerald-500/20'
                  : isFlop
                  ? 'bg-rose-950/20 border-rose-500/20'
                  : 'bg-black/40 border-white/5'
              )}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Success Multiplier
              </span>
              <div className="mt-1">
                <span
                  className={cn(
                    'text-xl sm:text-2xl font-black tracking-tight',
                    isBlockbuster
                      ? 'text-amber-400'
                      : isHit
                      ? 'text-emerald-400'
                      : isFlop
                      ? 'text-rose-400'
                      : 'text-white'
                  )}
                >
                  {budget > 0 ? formattedMultiplier : `${voteAverage.toFixed(1)}★ Acclaim`}
                </span>
                <span className="text-[10px] block font-mono text-slate-400 mt-1">
                  {budget > 0
                    ? `${roiPercentage >= 0 ? '+' : ''}${roiPercentage.toFixed(0)}% ROI (2.5x Breakeven)`
                    : 'Audience approval rating'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 mb-5 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Exact theatrical receipts unrecorded by distributor. Rated <strong>{voteAverage.toFixed(1)}/10</strong> with {voteCount.toLocaleString()} verified audience votes.
              </span>
            </div>
            <span className="font-mono text-white px-2.5 py-1 rounded-md bg-white/5">
              {verdictLabel}
            </span>
          </div>
        )
      ) : (
        /* TV Series Metrics */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Global Acclaim
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              {voteAverage.toFixed(1)} / 10
            </span>
            <span className="text-[10px] block font-mono text-slate-400 mt-1">
              Audience consensus score
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Engagement Volume
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {voteCount.toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-slate-400 mt-1">
              Global audience ratings
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Series Longevity
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-200 tracking-tight">
              {numberOfSeasons ? `${numberOfSeasons} Seasons` : 'Mini-Series'}
            </span>
            <span className="text-[10px] block font-mono text-slate-400 mt-1">
              {numberOfEpisodes ? `${numberOfEpisodes} total episodes` : 'Broadcast seasons'}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Broadcast Status
            </span>
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight capitalize">
              {status || 'Streaming'}
            </span>
            <span className="text-[10px] block font-mono text-slate-400 mt-1">
              {status?.toLowerCase() === 'ended' ? 'Completed run' : 'Active / In production'}
            </span>
          </div>
        </div>
      )}

      {/* Explanatory Verdict Summary */}
      <div
        className={cn(
          'p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3',
          isBlockbuster
            ? 'bg-amber-950/20 border-amber-500/20 text-amber-200/90'
            : isHit
            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200/90'
            : isFlop
            ? 'bg-rose-950/20 border-rose-500/20 text-rose-200/90'
            : 'bg-black/30 border-white/5 text-slate-300'
        )}
      >
        {isFlop ? (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-bold text-white block mb-0.5">
            {isMovie
              ? isBlockbuster
                ? `Historic Box Office Triumph: ${formattedRevenue}`
                : isHit
                ? `Commercial Success: ${formattedRevenue} Earned`
                : isFlop
                ? `Commercial Disappointment: ${formattedRevenue} Earned`
                : `Box Office Summary: ${formattedRevenue}`
              : `${title}: ${verdictLabel}`}
          </span>
          <span>
            {isMovie ? (
              budget > 0 ? (
                isBlockbuster ? (
                  `Sensational theatrical run! Grossed ${formattedRevenue} against a ${formattedBudget} budget (${formattedMultiplier} return), delivering over ${formattedProfit} in surplus.`
                ) : isHit ? (
                  `Strong commercial performance! Recovered its ${formattedBudget} budget and generated a solid ${formattedMultiplier} multiplier to secure healthy theatrical profitability.`
                ) : isFlop ? (
                  `Underperformed at the box office. Earned ${formattedRevenue} against a ${formattedBudget} production cost (${formattedMultiplier} return), failing to reach the standard 2.5x theatrical breakeven mark.`
                ) : (
                  `Balanced theatrical run with ${formattedRevenue} in ticket sales against a ${formattedBudget} budget.`
                )
              ) : hasBoxOfficeData ? (
                `Recorded a substantial worldwide gross of ${formattedRevenue} across domestic and international markets.`
              ) : (
                `Audience reception holds strong at ${voteAverage.toFixed(1)}/10 across ${voteCount.toLocaleString()} votes.`
              )
            ) : isFlop ? (
              `This series underperformed with low viewership engagement or an early network cancellation.`
            ) : isBlockbuster ? (
              `A global streaming phenomenon with high engagement and top-tier audience reception across multiple seasons.`
            ) : (
              `Popular and well-received series with steady streaming retention and positive audience consensus.`
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
