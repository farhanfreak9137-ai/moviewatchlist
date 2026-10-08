import { db } from '../db';
import { ContentPreferences } from '../types';

export interface GenreOption {
  id: number;
  name: string;
  movieGenreId: number;
  tvGenreId: number;
  description: string;
}

export const POPULAR_GENRES: GenreOption[] = [
  { id: 878, name: 'Sci-Fi & Fantasy', movieGenreId: 878, tvGenreId: 10765, description: 'Futuristic, speculative & otherworldly' },
  { id: 80, name: 'Crime & Mystery', movieGenreId: 80, tvGenreId: 80, description: 'Detective, noir & underworld' },
  { id: 18, name: 'Drama', movieGenreId: 18, tvGenreId: 18, description: 'Character-driven emotional depth' },
  { id: 28, name: 'Action & Adventure', movieGenreId: 28, tvGenreId: 10759, description: 'High-octane thrill & quests' },
  { id: 53, name: 'Thriller', movieGenreId: 53, tvGenreId: 9648, description: 'Suspense, tension & mind games' },
  { id: 35, name: 'Comedy', movieGenreId: 35, tvGenreId: 35, description: 'Witty, satirical & lighthearted' },
  { id: 16, name: 'Animation', movieGenreId: 16, tvGenreId: 16, description: 'Animated storytelling & anime' },
  { id: 27, name: 'Horror', movieGenreId: 27, tvGenreId: 10765, description: 'Supernatural & psychological scares' },
  { id: 99, name: 'Documentary', movieGenreId: 99, tvGenreId: 99, description: 'Real-world investigative stories' },
];

export const DEFAULT_PREFERENCES: ContentPreferences = {
  mediaFocus: 'balanced',
  favoriteGenres: [878, 80, 18], // Default favorites: Sci-Fi, Crime, Drama
  qualityFilter: 'all',
  releaseWindow: 'any',
};

const SETTINGS_KEY = 'content_preferences';

export async function getContentPreferences(): Promise<ContentPreferences> {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const record = await db.app_settings.get(SETTINGS_KEY);
    if (!record || !record.value) {
      return DEFAULT_PREFERENCES;
    }
    return {
      ...DEFAULT_PREFERENCES,
      ...record.value,
    };
  } catch (error) {
    console.error('Failed to load content preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

export async function saveContentPreferences(preferences: ContentPreferences): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const now = new Date().toISOString();
    await db.app_settings.put({
      key: SETTINGS_KEY,
      value: preferences,
    });

    // Queue for cross-device sync
    const deviceIdSetting = await db.app_settings.get('device_id');
    const deviceId = deviceIdSetting?.value || 'unknown_device';

    await db.sync_queue.put({
      id: `sync_settings_${SETTINGS_KEY}_${Date.now()}`,
      entity_type: 'settings',
      entity_id: SETTINGS_KEY,
      action: 'upsert',
      payload: {
        key: SETTINGS_KEY,
        value: preferences,
        updated_at: now,
        device_id: deviceId,
      },
      timestamp: now,
      status: 'pending',
      retry_count: 0,
    });
  } catch (error) {
    console.error('Failed to save content preferences:', error);
    throw error;
  }
}
