import React, { useId } from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

/**
 * WatchVault brand mark: a bookmark ("saved to your watchlist") with a play
 * button cut out of it, on a crimson → amber gradient squircle.
 * Kept in sync with public/icon.svg (used for PWA + Android launcher icons).
 */
export function AppLogo({ size = 40, className }: AppLogoProps) {
  const uid = useId().replace(/:/g, '');
  const bg = `wv-bg-${uid}`;
  const shine = `wv-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="WatchVault logo"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2d55" />
          <stop offset="0.55" stopColor="#e5133a" />
          <stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${bg})`} />
      <rect width="64" height="32" rx="16" fill={`url(#${shine})`} />
      <path
        d="M21 13h22a4 4 0 0 1 4 4v35l-15-9.5L17 52V17a4 4 0 0 1 4-4z"
        fill="#ffffff"
      />
      <path d="M28.5 21.5v13l10.5-6.5z" fill={`url(#${bg})`} strokeLinejoin="round" />
    </svg>
  );
}
