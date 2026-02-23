import type { Artist, Track } from './index';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchResult {
  artists?: PaginatedResult<Artist>;
  tracks?: PaginatedResult<Track>;
}

export interface SearchSuggestionItem {
  type: 'artist' | 'track';
  id: string;
  title: string;
  subtitle?: string;
}

export interface SearchSuggestionsResponse {
  artists: SearchSuggestionItem[];
  tracks: SearchSuggestionItem[];
}

export type SearchContentType = 'all' | 'artist' | 'track';

export type SearchSortOption =
  | 'relevance'
  | 'recent'
  | 'popular'
  | 'alphabetical'
  | 'popular_tips'
  | 'popular_plays';

export interface SearchFiltersState {
  contentType: SearchContentType;
  genre: string;
  releaseDateFrom: string;
  releaseDateTo: string;
  sort: SearchSortOption;
}

export const DEFAULT_SEARCH_FILTERS: SearchFiltersState = {
  contentType: 'all',
  genre: '',
  releaseDateFrom: '',
  releaseDateTo: '',
  sort: 'relevance',
};

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  count?: number;
}

export const SEARCH_HISTORY_KEY = 'tiptune_search_history';
export const SEARCH_HISTORY_MAX = 20;
