export type MediaType = 'movie' | 'tv';

export type WatchStatus = 'planned' | 'watching' | 'completed' | 'dropped';

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string | null;
}

export interface SeasonInfo {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string | null;
  poster_path?: string | null;
  overview?: string;
}

export interface EpisodeInfo {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
  air_date?: string | null;
  still_path?: string | null;
  runtime?: number | null;
  vote_average?: number;
}

export interface LibraryItem {
  id: string; // Unique personal library ID, e.g. "item_uuid"
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  original_title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string; // YYYY-MM-DD
  release_year?: number;
  genres: string[];
  overview?: string;
  runtime?: number; // minutes for movie
  number_of_seasons?: number; // for tv
  number_of_episodes?: number; // for tv
  seasons?: SeasonInfo[];
  director?: string;
  creator?: string;
  cast: CastMember[];
  
  // Personal watch information
  status: WatchStatus;
  rating: number; // 0 (unrated) or 1-10
  is_favorite: boolean;
  notes?: string;
  start_date?: string; // YYYY-MM-DD
  finish_date?: string; // YYYY-MM-DD
  current_season?: number;
  current_episode?: number;
  rewatch_count: number;

  // Sync & persistence metadata
  created_at: string; // ISO
  updated_at: string; // ISO
  is_deleted: boolean; // Soft delete for synchronization
  deleted_at?: string; // ISO
  sync_version: number;
  device_id: string;
}

export interface EpisodeProgress {
  id: string; // `${library_item_id}_s${season}_e${episode}`
  library_item_id: string;
  tmdb_id: number;
  season_number: number;
  episode_number: number;
  is_watched: boolean;
  watched_at?: string;
  rating?: number;
  notes?: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  entity_type: 'library_item' | 'episode_progress' | 'settings';
  entity_id: string;
  action: 'upsert' | 'delete';
  payload: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error_message?: string;
  retry_count: number;
}

export interface CachedMetadata {
  key: string;
  data: any;
  cached_at: number;
  expires_at: number;
}

export interface AppSetting {
  key: string;
  value: any;
}

export interface ConflictHistory {
  id: string;
  record_id: string;
  timestamp: string;
  local_data: any;
  remote_data: any;
  resolved_data: any;
  description: string;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'pending' | 'error' | 'signed_out';

export type MediaFocus = 'balanced' | 'movies' | 'tv';
export type QualityFilter = 'all' | 'high_acclaim' | 'hidden_gems';
export type ReleaseWindow = 'any' | 'recent' | 'classics';

export interface ContentPreferences {
  mediaFocus: MediaFocus;
  favoriteGenres: number[]; // Genre IDs
  qualityFilter: QualityFilter;
  releaseWindow: ReleaseWindow;
}
