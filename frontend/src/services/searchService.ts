import apiClient from '../utils/api';
import type {
  SearchResult,
  SearchSuggestionsResponse,
  SearchFiltersState,
  SearchContentType,
} from '../types/search.types';

const DEBOUNCE_MS = 300;

export const searchService = {
  search: async (
    query: string,
    filters: SearchFiltersState,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult> => {
    const params: Record<string, string | number> = {
      page,
      limit,
      sort: filters.sort,
    };
    if (query.trim()) params.q = query.trim();
    const type: SearchContentType = filters.contentType;
    if (type && type !== 'all') params.type = type;
    if (filters.genre.trim()) params.genre = filters.genre.trim();
    if (filters.releaseDateFrom) params.releaseDateFrom = filters.releaseDateFrom;
    if (filters.releaseDateTo) params.releaseDateTo = filters.releaseDateTo;

    const response = await apiClient.get<SearchResult>('/search', { params });
    return response.data;
  },

  getSuggestions: async (
    query: string,
    type?: 'artist' | 'track',
    limit: number = 10
  ): Promise<SearchSuggestionsResponse> => {
    const q = query.trim();
    if (!q) return { artists: [], tracks: [] };
    const params: Record<string, string | number> = { q, limit };
    if (type) params.type = type;
    const response = await apiClient.get<SearchSuggestionsResponse>(
      '/search/suggestions',
      { params }
    );
    return response.data;
  },
};

export { DEBOUNCE_MS };
