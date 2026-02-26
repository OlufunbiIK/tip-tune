export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours
  TRACKS: 300,
  USERS: 600,
  SEARCH: 120,
  LEADERBOARD: 60,
  GENRES: 3600,
  PLAYLISTS: 300,
};

export const CACHE_KEYS = {
  TRACKS: 'tracks',
  TRACK: (id: string) => `track:${id}`,
  USER: (id: string) => `user:${id}`,
  SEARCH: (query: string) => `search:${query}`,
  LEADERBOARD: 'leaderboard',
  GENRES: 'genres',
  PLAYLIST: (id: string) => `playlist:${id}`,
  TRENDING: 'trending',
  FEATURED: 'featured',
};

export const MEMORY_CACHE_MAX_ITEMS = 1000;
export const CACHE_MANAGER = 'CACHE_MANAGER';
export const MEMORY_CACHE_MANAGER = 'MEMORY_CACHE_MANAGER';