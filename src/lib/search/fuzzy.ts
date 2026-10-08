/**
 * Fuzzy search & typo tolerance utilities for WatchVault.
 * Implements Damerau-Levenshtein distance, Jaro-Winkler-like similarity,
 * and intelligent candidate spell correction.
 */

// Normalize strings for resilient comparison (lowercase, strip extra punctuation & spacing)
export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')   // replace punctuation with space
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Calculates Damerau-Levenshtein distance between two strings,
 * which accounts for insertions, deletions, substitutions, and transpositions of adjacent characters.
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  const s = source.toLowerCase();
  const t = target.toLowerCase();
  const sLen = s.length;
  const tLen = t.length;

  if (sLen === 0) return tLen;
  if (tLen === 0) return sLen;

  // Matrix creation
  const d: number[][] = Array.from({ length: sLen + 1 }, () => new Array(tLen + 1).fill(0));

  for (let i = 0; i <= sLen; i++) d[i][0] = i;
  for (let j = 0; j <= tLen; j++) d[0][j] = j;

  for (let i = 1; i <= sLen; i++) {
    for (let j = 1; j <= tLen; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;

      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[sLen][tLen];
}

/**
 * Normalized similarity score between 0.0 (completely dissimilar) and 1.0 (exact match).
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeSearchString(a);
  const normB = normalizeSearchString(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  // If one contains the other as a substring or prefix, grant a high baseline score
  if (normA.startsWith(normB) || normB.startsWith(normA)) {
    return 0.92;
  }
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.85;
  }

  const maxLen = Math.max(normA.length, normB.length);
  const dist = damerauLevenshteinDistance(normA, normB);
  const editScore = Math.max(0, 1 - dist / maxLen);

  // Bonus for matching start letters
  let prefixBonus = 0;
  const minLen = Math.min(normA.length, normB.length, 3);
  for (let i = 0; i < minLen; i++) {
    if (normA[i] === normB[i]) prefixBonus += 0.03;
    else break;
  }

  return Math.min(1.0, editScore + prefixBonus);
}

export interface CorrectionCandidate {
  original: string;
  corrected: string;
  similarity: number;
  distance: number;
  category?: 'title' | 'franchise' | 'actor' | 'genre';
}

/**
 * Given a misspelled or partial word, finds the best matching candidate from a dictionary.
 */
export function findBestCorrection(
  query: string,
  dictionary: Array<{ text: string; category?: 'title' | 'franchise' | 'actor' | 'genre' } | string>,
  minSimilarity: number = 0.65
): CorrectionCandidate | null {
  const normQuery = normalizeSearchString(query);
  if (normQuery.length < 3) return null;

  let bestMatch: CorrectionCandidate | null = null;
  let highestScore = minSimilarity;

  for (const item of dictionary) {
    const text = typeof item === 'string' ? item : item.text;
    const category = typeof item === 'string' ? undefined : item.category;
    const normText = normalizeSearchString(text);

    // Exact match needs no correction
    if (normText === normQuery) {
      return null;
    }

    // Calculate edit distance
    const dist = damerauLevenshteinDistance(normQuery, normText);
    const similarity = stringSimilarity(normQuery, normText);

    // Allowed tolerance:
    // length <= 5: max 1 typo
    // length 6-9: max 2 typos
    // length >= 10: max 3 typos
    const maxAllowedDist = normQuery.length <= 5 ? 1 : normQuery.length <= 9 ? 2 : 3;

    if (dist <= maxAllowedDist && similarity > highestScore) {
      highestScore = similarity;
      bestMatch = {
        original: query,
        corrected: text,
        similarity,
        distance: dist,
        category,
      };
    }
  }

  return bestMatch;
}
