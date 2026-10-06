import React from 'react';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Authentic MARVEL Logo
 * Signature red rectangle with white condensed uppercase MARVEL typography
 */
export function MarvelLogo({ className, size = 'md' }: LogoProps) {
  const heightClasses = {
    sm: 'h-4 w-auto',
    md: 'h-6 w-auto',
    lg: 'h-10 sm:h-12 w-auto',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center bg-[#ED1D24] text-white font-black tracking-tighter px-1.5 py-0.5 rounded shadow-sm select-none shrink-0 font-sans',
        size === 'sm' && 'text-[10px] leading-none px-1 py-0.5 h-4.5',
        size === 'md' && 'text-xs leading-none px-2 py-1 h-6',
        size === 'lg' && 'text-2xl sm:text-3xl leading-none px-4 py-2 rounded-lg shadow-lg shadow-red-900/40',
        className
      )}
      style={{ letterSpacing: '-0.06em' }}
    >
      MARVEL
    </div>
  );
}

/**
 * Authentic DC Logo
 * Signature blue circular emblem with white DC typography
 */
export function DCLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-4.5 h-4.5 text-[9px]',
    md: 'w-6 h-6 text-[11px]',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-2xl font-black shadow-lg shadow-blue-900/40',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-[#0078F0] text-white font-extrabold select-none shrink-0 border border-white/20',
        sizeClasses[size],
        className
      )}
    >
      <span className="tracking-tighter pl-px">DC</span>
    </div>
  );
}

/**
 * Authentic X-MEN Mutant Crest Logo
 * Circular emblem with bold mutant 'X' in gold and dark ring
 */
export function XMenLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-4.5 h-4.5',
    md: 'w-6 h-6',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-300 p-0.5 shadow-md shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <div className="w-full h-full rounded-full bg-[#0d101d] flex items-center justify-center border border-yellow-400/40">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-[68%] h-[68%] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]"
        >
          <path d="M4 4 L9 12 L4 20 L7.5 20 L12 13.5 L16.5 20 L20 20 L15 12 L20 4 L16.5 4 L12 10.5 L7.5 4 Z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Authentic Star Wars Logo
 */
export function StarWarsLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-auto text-[8px]',
    md: 'h-5 w-auto text-[10px]',
    lg: 'h-10 w-auto text-lg',
  };

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center font-black uppercase text-[#FFE81F] leading-none select-none shrink-0 drop-shadow-[0_0_6px_rgba(255,232,31,0.4)]',
        sizeClasses[size],
        className
      )}
      style={{ letterSpacing: '0.12em' }}
    >
      <span className="border-b border-[#FFE81F]/60 pb-[1px] w-full text-center">STAR</span>
      <span className="pt-[1px] w-full text-center">WARS</span>
    </div>
  );
}

/**
 * Authentic Pixar Logo
 */
export function PixarLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1 py-0.5',
    md: 'text-xs px-1.5 py-0.5',
    lg: 'text-2xl px-3 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-bold tracking-widest text-slate-100 bg-white/10 border border-white/20 rounded select-none shrink-0',
        sizeClasses[size],
        className
      )}
    >
      PIXAR
    </div>
  );
}

/**
 * Authentic Studio Ghibli Logo
 */
export function StudioGhibliLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xl px-4 py-2 rounded-xl',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-wider text-teal-200 bg-teal-950/80 border border-teal-500/40 rounded select-none shrink-0',
        sizeClasses[size],
        className
      )}
    >
      GHIBLI
    </div>
  );
}

/**
 * Authentic A24 Logo
 */
export function A24Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-2xl px-4 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-black tracking-tight text-white bg-black/80 border border-white/30 rounded select-none shrink-0 font-mono',
        sizeClasses[size],
        className
      )}
    >
      A24
    </div>
  );
}

/**
 * Authentic Disney Logo
 */
export function DisneyLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1 py-0.5',
    md: 'text-xs px-1.5 py-0.5',
    lg: 'text-2xl px-4 py-2',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-serif font-black tracking-tight text-blue-200 bg-blue-950/70 border border-blue-500/30 rounded select-none shrink-0 italic',
        sizeClasses[size],
        className
      )}
    >
      Disney
    </div>
  );
}

/**
 * Authentic DreamWorks Logo
 */
export function DreamWorksLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xl px-3.5 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-bold tracking-wider text-sky-200 bg-sky-950/80 border border-sky-400/40 rounded select-none shrink-0 font-serif',
        sizeClasses[size],
        className
      )}
    >
      DREAMWORKS
    </div>
  );
}

/**
 * Authentic Anime Universe Logo
 */
export function AnimeLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xl px-3.5 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-black tracking-wider text-pink-300 bg-gradient-to-r from-pink-950/90 via-purple-950/90 to-indigo-950/90 border border-pink-500/40 rounded select-none shrink-0 font-sans',
        sizeClasses[size],
        className
      )}
    >
      ANIME アニメ
    </div>
  );
}

/**
 * Authentic Warner Bros. Logo
 */
export function WarnerBrosLogo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-4.5 h-4.5 text-[9px]',
    md: 'w-6 h-6 text-[11px]',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-2xl font-black shadow-lg shadow-blue-900/40',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-[#0047BA] text-white font-extrabold select-none shrink-0 border border-white/20',
        sizeClasses[size],
        className
      )}
    >
      <span className="tracking-tighter">WB</span>
    </div>
  );
}
