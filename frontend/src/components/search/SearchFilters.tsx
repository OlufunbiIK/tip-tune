import React from "react";
import { Filter } from "lucide-react";
import type {
  SearchFiltersState,
  SearchContentType,
  SearchSortOption,
} from "@/types/search.types";

const CONTENT_TYPES: { value: SearchContentType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "artist", label: "Artists" },
  { value: "track", label: "Tracks" },
];

const SORT_OPTIONS: { value: SearchSortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Popular" },
  { value: "alphabetical", label: "A–Z" },
  { value: "popular_tips", label: "Most tips" },
  { value: "popular_plays", label: "Most plays" },
];

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (
    f: SearchFiltersState | ((prev: SearchFiltersState) => SearchFiltersState),
  ) => void;
  resultCount?: number;
  className?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  resultCount,
  className = "",
}) => {
  const update = (partial: Partial<SearchFiltersState>) => {
    onFiltersChange((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div
      className={`space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-deep-slate ${className}`}
      data-testid="search-filters"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Filter className="h-4 w-4" />
        Filters
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Content type
          </label>
          <select
            value={filters.contentType}
            onChange={(e) =>
              update({ contentType: e.target.value as SearchContentType })
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Content type"
          >
            {CONTENT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Genre
          </label>
          <input
            type="text"
            value={filters.genre}
            onChange={(e) => update({ genre: e.target.value })}
            placeholder="e.g. Pop, Rock"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            aria-label="Genre filter"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            From date
          </label>
          <input
            type="date"
            value={filters.releaseDateFrom}
            onChange={(e) => update({ releaseDateFrom: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Release date from"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            To date
          </label>
          <input
            type="date"
            value={filters.releaseDateTo}
            onChange={(e) => update({ releaseDateTo: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Release date to"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Sort:
          </label>
          <select
            value={filters.sort}
            onChange={(e) =>
              update({ sort: e.target.value as SearchSortOption })
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {resultCount != null && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;
