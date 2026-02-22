import React from "react";
import { History, X } from "lucide-react";
import type { SearchHistoryItem } from "@/types/search.types";

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (query: string) => void;
  onClear: () => void;
  className?: string;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onClear,
  className = "",
}) => {
  if (history.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-deep-slate ${className}`}
      data-testid="search-history"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <History className="h-4 w-4" />
          Recent searches
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
          aria-label="Clear search history"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {history.map((item) => (
          <li key={`${item.query}-${item.timestamp}`}>
            <button
              type="button"
              onClick={() => onSelect(item.query)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-deep-slate hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {item.query}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchHistory;
