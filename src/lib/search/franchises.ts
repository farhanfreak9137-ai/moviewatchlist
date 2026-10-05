import { normalizeSearchString, damerauLevenshteinDistance } from './fuzzy';

export interface FranchiseDefinition {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  companyIds?: number[];
  keywordIds?: number[];
  queryKeywords?: string[];
  filterItems?: (item: any) => boolean;
  bannerGradient: string;
  badgeBorder: string;
  badgeText: string;
  iconType: 'marvel' | 'dc' | 'xmen' | 'starwars' | 'pixar' | 'ghibli' | 'a24' | 'disney' | 'generic';
}

export const FRANCHISES: FranchiseDefinition[] = [
  {
    id: 'marvel',
    name: 'Marvel Cinematic Universe & Marvel Studios',
    aliases: [
      'marvel',
      'mcu',
      'marvel studios',
      'marvel entertainment',
      'marvel studious',
      'marvel cinematic universe',
      'marvel universe',
      'marvel comics',
      'marvel movies',
      'marvel series',
      'marvel shows',
      'marvel films',
    ],
    description:
      'All blockbuster movies, Disney+ series, and superhero spectacles unified from Marvel Studios, Marvel Entertainment, and the MCU.',
    companyIds: [420, 7505, 19551, 13252, 11210],
    keywordIds: [180547, 9715],
    queryKeywords: ['marvel', 'mcu'],
    bannerGradient: 'from-red-950/80 via-red-900/30 to-transparent',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-400',
    iconType: 'marvel',
  },
  {
    id: 'xmen',
    name: 'X-Men Mutant Saga',
    aliases: [
      'x-men',
      'x men',
      'xmen',
      'x-man',
      'x man',
      'mutants',
      'mutant saga',
      'x-men movies',
      'x men movies',
      'x-men universe',
      'x men universe',
      'x-men saga',
    ],
    description:
      'The legendary mutant universe — from the original trilogy to First Class, Days of Future Past, Logan, Deadpool & Wolverine, and X-Men 97.',
    companyIds: [],
    keywordIds: [2095, 155477],
    queryKeywords: ['x-men', 'wolverine', 'deadpool', 'the new mutants', 'dark phoenix', 'logan'],
    filterItems: (item: any) => {
      const title = (item.title || item.name || '').toLowerCase();
      const overview = (item.overview || '').toLowerCase();
      return (
        title.includes('x-men') ||
        title.includes('x men') ||
        title.includes('wolverine') ||
        title.includes('deadpool') ||
        title.includes('mutant') ||
        title === 'logan' ||
        title.includes('dark phoenix') ||
        (title.includes('logan') && overview.includes('wolverine')) ||
        overview.includes('mutant') ||
        overview.includes('x-men')
      );
    },
    bannerGradient: 'from-amber-950/80 via-yellow-900/30 to-transparent',
    badgeBorder: 'border-yellow-500/50',
    badgeText: 'text-yellow-400',
    iconType: 'xmen',
  },
  {
    id: 'bollywood',
    name: 'Bollywood & Hindi Cinema',
    aliases: ['bollywood', 'hindi', 'hindi movies', 'hindi series', 'hindi shows', 'indian cinema', 'tollywood'],
    description: 'The vibrant, emotional, and record-shattering world of Bollywood cinema and Indian streaming series.',
    companyIds: [],
    queryKeywords: ['dangal', 'jawan', 'pathaan', '3 idiots', 'sholay', 'sacred games', 'mirzapur'],
    bannerGradient: 'from-amber-950/80 via-orange-900/30 to-transparent',
    badgeBorder: 'border-orange-500/40',
    badgeText: 'text-orange-400',
    iconType: 'generic',
  },
  {
    id: 'dc',
    name: 'DC Universe & DC Studios',
    aliases: ['dc', 'dcu', 'dceu', 'dc extended universe', 'dc comics', 'dc studios', 'dc films'],
    description: 'The cinematic universe of DC Comics, featuring Batman, Superman, Wonder Woman, and the Justice League.',
    companyIds: [9993, 128064, 429],
    keywordIds: [849, 9715],
    queryKeywords: ['dc', 'dceu', 'batman', 'superman'],
    bannerGradient: 'from-blue-950/80 via-indigo-900/30 to-transparent',
    badgeBorder: 'border-blue-500/40',
    badgeText: 'text-blue-400',
    iconType: 'dc',
  },
  {
    id: 'starwars',
    name: 'Star Wars Saga & Lucasfilm',
    aliases: ['star wars', 'starwars', 'lucasfilm', 'star wars saga', 'star wars universe', 'star wars movies'],
    description: 'A galaxy far, far away — episodic sagas, spin-off films, and live-action series by Lucasfilm.',
    companyIds: [1],
    keywordIds: [161176],
    queryKeywords: ['star wars'],
    bannerGradient: 'from-amber-950/80 via-amber-900/30 to-transparent',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-400',
    iconType: 'starwars',
  },
  {
    id: 'pixar',
    name: 'Pixar Animation Studios',
    aliases: ['pixar', 'pixar animation'],
    description: 'Heartwarming, innovative computer-animated cinematic masterpieces from Pixar.',
    companyIds: [3],
    queryKeywords: ['pixar'],
    bannerGradient: 'from-sky-950/80 via-cyan-900/30 to-transparent',
    badgeBorder: 'border-cyan-500/40',
    badgeText: 'text-cyan-400',
    iconType: 'pixar',
  },
  {
    id: 'ghibli',
    name: 'Studio Ghibli',
    aliases: ['ghibli', 'studio ghibli', 'hayao miyazaki', 'miyazaki'],
    description: 'Iconic hand-drawn, magical anime films created by Hayao Miyazaki and Studio Ghibli.',
    companyIds: [10342],
    queryKeywords: ['ghibli', 'miyazaki'],
    bannerGradient: 'from-emerald-950/80 via-teal-900/30 to-transparent',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
    iconType: 'ghibli',
  },
  {
    id: 'a24',
    name: 'A24 Films',
    aliases: ['a24', 'a24 films'],
    description: 'Acclaimed independent cinema, genre-defying visions, and modern cult classics from A24.',
    companyIds: [41077],
    queryKeywords: ['a24'],
    bannerGradient: 'from-stone-900/80 via-neutral-900/40 to-transparent',
    badgeBorder: 'border-white/30',
    badgeText: 'text-slate-200',
    iconType: 'a24',
  },
  {
    id: 'disney',
    name: 'Walt Disney Pictures',
    aliases: ['disney', 'walt disney'],
    description: 'Classic Disney animation, fairy tales, live-action adventures, and musical spectacles.',
    companyIds: [2],
    queryKeywords: ['disney'],
    bannerGradient: 'from-purple-950/80 via-blue-900/30 to-transparent',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-300',
    iconType: 'disney',
  },
];

export interface GenreDefinition {
  id: string;
  name: string;
  aliases: string[];
  movieGenreId: number;
  tvGenreId: number;
  description: string;
  bannerGradient: string;
  badgeBorder: string;
  badgeText: string;
}

export const GENRE_MAP: GenreDefinition[] = [
  {
    id: 'action',
    name: 'Action',
    aliases: ['action', 'action movies', 'action series'],
    movieGenreId: 28,
    tvGenreId: 10759,
    description: 'High-speed chases, heart-pounding stunts, explosions, and intense combat.',
    bannerGradient: 'from-red-950/80 via-orange-950/30 to-transparent',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-400',
  },
  {
    id: 'adventure',
    name: 'Adventure',
    aliases: ['adventure', 'expeditions', 'journey'],
    movieGenreId: 12,
    tvGenreId: 10759,
    description: 'Treasure hunts, wilderness survival, epic odysseys, and uncharted lands.',
    bannerGradient: 'from-amber-950/80 via-yellow-950/30 to-transparent',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-400',
  },
  {
    id: 'animation',
    name: 'Animation & Anime',
    aliases: ['animation', 'animated', 'anime', 'cartoon', 'cartoons'],
    movieGenreId: 16,
    tvGenreId: 16,
    description: 'Animated features, Japanese anime, 3D CGI masterpieces, and stop-motion wonders.',
    bannerGradient: 'from-pink-950/80 via-rose-950/30 to-transparent',
    badgeBorder: 'border-pink-500/40',
    badgeText: 'text-pink-400',
  },
  {
    id: 'comedy',
    name: 'Comedy',
    aliases: ['comedy', 'comedies', 'funny', 'humor', 'sitcom'],
    movieGenreId: 35,
    tvGenreId: 35,
    description: 'Hilarious sitcoms, witty satires, slapstick antics, and feel-good laughs.',
    bannerGradient: 'from-yellow-950/80 via-amber-950/30 to-transparent',
    badgeBorder: 'border-yellow-500/40',
    badgeText: 'text-yellow-400',
  },
  {
    id: 'crime',
    name: 'Crime',
    aliases: ['crime', 'mob', 'gangster', 'mafia', 'heist'],
    movieGenreId: 80,
    tvGenreId: 80,
    description: 'Underworld crime sagas, detective investigations, daring heists, and corrupt syndicates.',
    bannerGradient: 'from-stone-950/80 via-zinc-950/40 to-transparent',
    badgeBorder: 'border-stone-400/40',
    badgeText: 'text-stone-300',
  },
  {
    id: 'documentary',
    name: 'Documentary',
    aliases: ['documentary', 'documentaries', 'docuseries', 'docu'],
    movieGenreId: 99,
    tvGenreId: 99,
    description: 'Real-world exposés, nature epics, historical deep-dives, and true events.',
    bannerGradient: 'from-teal-950/80 via-cyan-950/30 to-transparent',
    badgeBorder: 'border-teal-500/40',
    badgeText: 'text-teal-400',
  },
  {
    id: 'drama',
    name: 'Drama',
    aliases: ['drama', 'dramatic'],
    movieGenreId: 18,
    tvGenreId: 18,
    description: 'Deep emotional journeys, character studies, intense conflict, and real human connection.',
    bannerGradient: 'from-violet-950/80 via-purple-950/30 to-transparent',
    badgeBorder: 'border-violet-500/40',
    badgeText: 'text-violet-400',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    aliases: ['fantasy', 'magic', 'mythological', 'myth'],
    movieGenreId: 14,
    tvGenreId: 10765,
    description: 'Mythical realms, wizards, dragons, ancient magic, and supernatural forces.',
    bannerGradient: 'from-indigo-950/80 via-purple-950/30 to-transparent',
    badgeBorder: 'border-indigo-500/40',
    badgeText: 'text-indigo-400',
  },
  {
    id: 'horror',
    name: 'Horror',
    aliases: ['horror', 'scary', 'spooky', 'slasher', 'supernatural horror'],
    movieGenreId: 27,
    tvGenreId: 9648,
    description: 'Chilling psychological terror, haunted entities, gruesome monsters, and dark nightmares.',
    bannerGradient: 'from-red-950/90 via-black to-transparent',
    badgeBorder: 'border-red-600/50',
    badgeText: 'text-red-500',
  },
  {
    id: 'mystery',
    name: 'Mystery',
    aliases: ['mystery', 'whodunit', 'detective', 'puzzle'],
    movieGenreId: 9648,
    tvGenreId: 9648,
    description: 'Intricate whodunits, cryptic secrets, puzzles, and unexpected plot twists.',
    bannerGradient: 'from-slate-950/80 via-indigo-950/30 to-transparent',
    badgeBorder: 'border-slate-400/40',
    badgeText: 'text-slate-300',
  },
  {
    id: 'romance',
    name: 'Romance',
    aliases: ['romance', 'romantic', 'love', 'rom-com', 'romcom'],
    movieGenreId: 10749,
    tvGenreId: 10749,
    description: 'Tender love stories, passionate connections, heartbreak, and romantic comedies.',
    bannerGradient: 'from-rose-950/80 via-pink-950/30 to-transparent',
    badgeBorder: 'border-rose-400/40',
    badgeText: 'text-rose-300',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi & Science Fiction',
    aliases: ['sci-fi', 'scifi', 'sci fi', 'science fiction', 'space', 'cyberpunk', 'futuristic'],
    movieGenreId: 878,
    tvGenreId: 10765,
    description: 'Interstellar voyages, artificial intelligence, dystopian futures, and quantum time travel.',
    bannerGradient: 'from-cyan-950/80 via-blue-950/30 to-transparent',
    badgeBorder: 'border-cyan-400/40',
    badgeText: 'text-cyan-300',
  },
  {
    id: 'thriller',
    name: 'Thriller',
    aliases: ['thriller', 'suspense', 'psychological thriller'],
    movieGenreId: 53,
    tvGenreId: 9648,
    description: 'Relentless tension, high stakes, psychological games, and nail-biting suspense.',
    bannerGradient: 'from-orange-950/80 via-red-950/30 to-transparent',
    badgeBorder: 'border-orange-500/40',
    badgeText: 'text-orange-400',
  },
  {
    id: 'western',
    name: 'Western',
    aliases: ['western', 'cowboy', 'gunslinger'],
    movieGenreId: 37,
    tvGenreId: 37,
    description: 'Outlaws, gunslingers, desolate frontier towns, and rugged desert standoffs.',
    bannerGradient: 'from-amber-950/90 via-stone-900/40 to-transparent',
    badgeBorder: 'border-amber-600/40',
    badgeText: 'text-amber-500',
  },
];

const ALLOWED_STUDIO_MODIFIERS = new Set([
  'studio',
  'studios',
  'entertainment',
  'universe',
  'saga',
  'pictures',
  'animation',
  'films',
  'movies',
  'series',
  'shows',
  'cinema',
  'comics',
]);

const ALLOWED_GENRE_MODIFIERS = new Set([
  'movies',
  'series',
  'shows',
  'films',
  'genre',
  'catalog',
]);

/**
 * Checks whether a user query matches a known franchise or studio.
 * Specific show or movie searches (e.g. "avengers endgame", "iron man", "star wars the last jedi",
 * "batman begins", "x-men first class") will return null so that the search engine
 * targets the specific title instead of hijacking into the entire studio library.
 */
export function matchFranchise(rawQuery: string): FranchiseDefinition | null {
  const q = normalizeSearchString(rawQuery);
  if (!q) return null;

  for (const franchise of FRANCHISES) {
    for (const alias of franchise.aliases) {
      const normAlias = normalizeSearchString(alias);

      // 1. Exact match with studio alias
      if (normAlias === q) return franchise;

      // 2. Minor typo tolerance (dist <= 1 for studio terms of length >= 4)
      if (q.length >= 4 && normAlias.length >= 4) {
        const dist = damerauLevenshteinDistance(q, normAlias);
        if (dist <= 1) return franchise;
      }

      // 3. Query starts with studio name followed ONLY by recognized generic studio modifiers
      // e.g. "marvel studios", "pixar animation", "dc films"
      // BUT NOT specific titles like "marvel avengers", "x-men first class", "star wars andor"
      if (q.startsWith(normAlias + ' ')) {
        const remainder = q.slice(normAlias.length).trim().split(/\s+/);
        if (remainder.length > 0 && remainder.every((word) => ALLOWED_STUDIO_MODIFIERS.has(word))) {
          return franchise;
        }
      }
    }
  }
  return null;
}

/**
 * Checks whether a user query matches a known genre.
 */
export function matchGenre(rawQuery: string): GenreDefinition | null {
  const q = normalizeSearchString(rawQuery);
  if (!q) return null;

  for (const genre of GENRE_MAP) {
    for (const alias of genre.aliases) {
      const normAlias = normalizeSearchString(alias);
      if (normAlias === q) return genre;

      if (q.length >= 5 && normAlias.length >= 5) {
        const dist = damerauLevenshteinDistance(q, normAlias);
        if (dist <= 1) return genre;
      }

      if (q.startsWith(normAlias + ' ')) {
        const remainder = q.slice(normAlias.length).trim().split(/\s+/);
        if (remainder.length > 0 && remainder.every((word) => ALLOWED_GENRE_MODIFIERS.has(word))) {
          return genre;
        }
      }
    }
  }
  return null;
}

