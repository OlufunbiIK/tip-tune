import { useState, useEffect, useCallback, useRef } from "react";
import { searchService, DEBOUNCE_MS } from "../services/searchService";
import type {
  SearchResult,
  SearchSuggestionsResponse,
  SearchFiltersState,
  SearchSuggestionItem,
} from "../types/search.types";
import {
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_MAX,
  DEFAULT_SEARCH_FILTERS,
  type SearchHistoryItem,
} from "../types/search.types";

function getHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items: SearchHistoryItem[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addToSearchHistory(query: string): void {
  const q = query.trim();
  if (!q) return;

  const history = getHistory();
  const existingIndex = history.findIndex(
    (item) => item.query.toLowerCase() === q.toLowerCase(),
  );

  let newItem: SearchHistoryItem;
  let newHistory = [...history];

  if (existingIndex >= 0) {
    const existing = history[existingIndex];
    newItem = {
      ...existing,
      timestamp: Date.now(),
      count: (existing.count || 1) + 1,
    };
    newHistory.splice(existingIndex, 1);
  } else {
    newItem = {
      query: q,
      timestamp: Date.now(),
      count: 1,
    };
  }

  newHistory.unshift(newItem);

  const trimmed = newHistory.slice(0, SEARCH_HISTORY_MAX);
  saveHistory(trimmed);
}

export function getSearchHistory(): SearchHistoryItem[] {
  return getHistory();
}

export function clearSearchHistory(): void {
  saveHistory([]);
}

export function getTrendingSearches(): string[] {
  const list = getHistory();
  return [...list]
    .sort((a, b) => {
      const countA = a.count || 1;
      const countB = b.count || 1;
      if (countA !== countB) return countB - countA;
      return b.timestamp - a.timestamp;
    })
    .slice(0, 8)
    .map((item) => item.query);
}

export interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  filters: SearchFiltersState;
  setFilters: (
    f: SearchFiltersState | ((prev: SearchFiltersState) => SearchFiltersState),
  ) => void;
  results: SearchResult | null;
  suggestions: SearchSuggestionItem[];
  suggestionsLoading: boolean;
  searchLoading: boolean;
  searchError: Error | null;
  runSearch: (page?: number, queryOverride?: string) => Promise<void>;
  runSuggestions: () => void;
  commitQuery: (q: string) => void;
  history: SearchHistoryItem[];
  trending: string[];
  clearHistory: () => void;
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFiltersState>(
    DEFAULT_SEARCH_FILTERS,
  );
  const [results, setResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>(getHistory);
  const [trending, setTrending] = useState<string[]>(getTrendingSearches);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestQuery = useRef("");
  const lastSearchQuery = useRef("");

  const runSuggestions = useCallback(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    if (q === lastSuggestQuery.current) return;
    lastSuggestQuery.current = q;
    setSuggestionsLoading(true);
    const typeFilter =
      filters.contentType === "all" ? undefined : filters.contentType;
    searchService
      .getSuggestions(q, typeFilter, 10)
      .then((res: SearchSuggestionsResponse) => {
        const combined: SearchSuggestionItem[] = [
          ...res.artists.map((a) => ({ ...a, type: "artist" as const })),
          ...res.tracks.map((t) => ({ ...t, type: "track" as const })),
        ];
        setSuggestions(combined.slice(0, 10));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [query, filters.contentType]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSuggestions, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runSuggestions]);

  const runSearch = useCallback(
    async (page: number = 1, queryOverride?: string) => {
      const q = (queryOverride ?? query).trim();
      lastSearchQuery.current = q;
      setSearchError(null);
      setSearchLoading(true);
      try {
        const data = await searchService.search(q, filters, page, 20);
        setResults(data);
        if (q) {
          addToSearchHistory(q);
          setHistory(getHistory());
          setTrending(getTrendingSearches());
        }
      } catch (err) {
        setSearchError(err instanceof Error ? err : new Error("Search failed"));
        setResults(null);
      } finally {
        setSearchLoading(false);
      }
    },
    [query, filters],
  );

  const commitQuery = useCallback((q: string) => {
    setQuery(q);
    lastSearchQuery.current = q;
    lastSuggestQuery.current = "";
    setSuggestions([]);
  }, []);

  const clearHistoryCallback = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
    setTrending(getTrendingSearches());
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    suggestions,
    suggestionsLoading,
    searchLoading,
    searchError,
    runSearch,
    runSuggestions,
    commitQuery,
    history,
    trending,
    clearHistory: clearHistoryCallback,
  };
}
