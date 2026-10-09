export type ReleaseEra = 'upcoming' | 'new' | 'classic' | 'modern';

export interface ReleaseEraInfo {
  isUpcoming: boolean;
  isNew: boolean;
  isClassic: boolean;
  isModern: boolean;
  era: ReleaseEra;
  formattedDate: string; // e.g. "Oct 15, 1999" or "Dec 18, 2026"
  fullFormattedDate: string; // e.g. "October 15, 1999"
  year: string; // e.g. "1999"
  daysUntilRelease?: number; // e.g. 70
  yearsAgo?: number; // e.g. 27
  relativeLabel?: string; // e.g. "in 2 months", "27 years ago"
}

/**
 * Calculates the release era and formatted metadata for any movie or TV series.
 * - Upcoming: releaseDate in the future or explicit unreleased status.
 * - New: released within the last ~14 months (current or previous year).
 * - Classic: released 20+ years ago (e.g. vintage golden era / 90s / 80s).
 * - Modern: in-between.
 */
export function getReleaseEraInfo(
  releaseDate?: string | null,
  status?: string | null
): ReleaseEraInfo {
  const now = new Date();
  const currentYear = now.getFullYear();

  const isExplicitlyUnreleased =
    status === 'Post Production' ||
    status === 'In Production' ||
    status === 'Planned' ||
    status === 'Rumored';

  if (!releaseDate || releaseDate.trim() === '') {
    return {
      isUpcoming: isExplicitlyUnreleased,
      isNew: false,
      isClassic: false,
      isModern: !isExplicitlyUnreleased,
      era: isExplicitlyUnreleased ? 'upcoming' : 'modern',
      formattedDate: isExplicitlyUnreleased ? 'TBA' : '—',
      fullFormattedDate: isExplicitlyUnreleased ? 'To Be Announced' : '—',
      year: '',
    };
  }

  const cleanDate = releaseDate.trim();
  const isYearOnly = /^\d{4}$/.test(cleanDate);

  let dateObj: Date | null = null;
  let yearNum = 0;

  if (isYearOnly) {
    yearNum = parseInt(cleanDate, 10);
    // If year only, create a Date at the end of that year
    dateObj = new Date(yearNum, 11, 31, 23, 59, 59);
  } else {
    // Parse ISO date string (YYYY-MM-DD)
    dateObj = new Date(cleanDate);
    if (isNaN(dateObj.getTime())) {
      dateObj = null;
      const extractedYear = cleanDate.match(/\d{4}/);
      if (extractedYear) {
        yearNum = parseInt(extractedYear[0], 10);
      }
    } else {
      yearNum = dateObj.getFullYear();
    }
  }

  const yearStr = yearNum > 0 ? String(yearNum) : cleanDate.substring(0, 4);

  // Determine if Upcoming
  let isUpcoming = isExplicitlyUnreleased;
  let daysUntilRelease: number | undefined;

  if (dateObj) {
    const diffMs = dateObj.getTime() - now.getTime();
    if (diffMs > 0) {
      isUpcoming = true;
      daysUntilRelease = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
  } else if (yearNum > currentYear) {
    isUpcoming = true;
  }

  // Formatting strings
  let formattedDate = cleanDate;
  let fullFormattedDate = cleanDate;

  if (dateObj && !isYearOnly && !isNaN(dateObj.getTime())) {
    try {
      formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      fullFormattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      formattedDate = cleanDate;
      fullFormattedDate = cleanDate;
    }
  } else if (isYearOnly) {
    formattedDate = yearStr;
    fullFormattedDate = yearStr;
  }

  if (isUpcoming) {
    let relativeLabel = 'Coming Soon';
    if (daysUntilRelease !== undefined) {
      if (daysUntilRelease <= 1) {
        relativeLabel = 'Releasing Today / Tomorrow';
      } else if (daysUntilRelease < 30) {
        relativeLabel = `in ${daysUntilRelease} days`;
      } else if (daysUntilRelease < 365) {
        const months = Math.round(daysUntilRelease / 30);
        relativeLabel = `in ~${months} ${months === 1 ? 'month' : 'months'}`;
      } else {
        const years = Math.round(daysUntilRelease / 365);
        relativeLabel = `in ~${years} ${years === 1 ? 'year' : 'years'}`;
      }
    }

    return {
      isUpcoming: true,
      isNew: false,
      isClassic: false,
      isModern: false,
      era: 'upcoming',
      formattedDate,
      fullFormattedDate,
      year: yearStr,
      daysUntilRelease,
      relativeLabel,
    };
  }

  // Age calculations for released media
  const diffTimeMs = dateObj && !isNaN(dateObj.getTime()) ? now.getTime() - dateObj.getTime() : 0;
  const yearsAgo = diffTimeMs > 0 ? diffTimeMs / (1000 * 60 * 60 * 24 * 365.25) : Math.max(0, currentYear - yearNum);

  // New: within the last 1.2 years or released in current / previous calendar year
  const isNew = yearsAgo <= 1.2 || (yearNum >= currentYear - 1 && yearNum <= currentYear);

  // Classic: released 20 or more years ago (e.g. vintage cinema, 90s, 80s, golden age)
  const isClassic = !isNew && (yearsAgo >= 20 || yearNum <= currentYear - 20);

  // Modern: in-between (e.g. 2007-2024)
  const isModern = !isNew && !isClassic;

  const era: ReleaseEra = isNew ? 'new' : isClassic ? 'classic' : 'modern';

  const roundedYears = Math.round(yearsAgo);
  const relativeLabel =
    isNew
      ? 'Recent Premiere'
      : roundedYears > 0
      ? `${roundedYears} years ago`
      : 'Released this year';

  return {
    isUpcoming: false,
    isNew,
    isClassic,
    isModern,
    era,
    formattedDate,
    fullFormattedDate,
    year: yearStr,
    yearsAgo: roundedYears,
    relativeLabel,
  };
}
