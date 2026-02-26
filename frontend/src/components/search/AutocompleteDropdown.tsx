import React, { useEffect, useRef } from "react";
import { User, Music } from "lucide-react";
import type { SearchSuggestionItem } from "@/types/search.types";

export function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent-gold/40 dark:bg-accent-gold/50 rounded px-0.5 font-medium">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

interface AutocompleteDropdownProps {
  suggestions: SearchSuggestionItem[];
  query: string;
  loading: boolean;
  onSelect: (item: SearchSuggestionItem) => void;
  onClose?: () => void;
  visible: boolean;
  className?: string;
}

const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  suggestions,
  query,
  loading,
  onSelect,
  onClose,
  visible,
  className = "",
}) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-deep-slate ${className}`}
      role="listbox"
      aria-label="Search suggestions"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-gray-500 dark:text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <span>Loading suggestions...</span>
        </div>
      ) : suggestions.length === 0 && query.trim().length >= 2 ? (
        <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
          No suggestions for &quot;{query}&quot;
        </div>
      ) : (
        <ul
          ref={listRef}
          className="py-2 overflow-y-auto max-h-[min(60vh,320px)]"
        >
          {suggestions.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex text-left w-full items-center gap-3 px-4 py-2.5 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-700/50 dark:focus:bg-gray-700/50 focus:outline-none"
                role="option"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  {item.type === "artist" ? (
                    <User className="text-gray-600 w-4 h-4 dark:text-gray-300" />
                  ) : (
                    <Music className="text-gray-600 w-4 h-4 dark:text-gray-300" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-deep-slate font-medium dark:text-white">
                    {highlightMatch(item.title, query)}
                  </div>
                  {item.subtitle && (
                    <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {highlightMatch(item.subtitle, query)}
                    </div>
                  )}
                </div>
                <span className="capitalize text-xs text-gray-400 dark:text-gray-500">
                  {item.type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteDropdown;
