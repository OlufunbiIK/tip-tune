import React, { useRef, useState, useCallback, useEffect } from "react";
import { Search as SearchIcon } from "lucide-react";
import AutocompleteDropdown from "./AutocompleteDropdown";
import VoiceSearch from "./VoiceSearch";
import type { SearchSuggestionItem } from "@/types/search.types";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  suggestions: SearchSuggestionItem[];
  suggestionsLoading: boolean;
  onSelectSuggestion: (item: SearchSuggestionItem) => void;
  onVoiceResult: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  suggestions,
  suggestionsLoading,
  onSelectSuggestion,
  onVoiceResult,
  onSubmit,
  placeholder = "Search artists, tracks... (use AND, OR for advanced)",
  className = "",
  "data-testid": testId = "search-bar",
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (item: SearchSuggestionItem) => {
      onQueryChange(item.title);
      onSelectSuggestion(item);
      setShowDropdown(false);
      inputRef.current?.blur();
    },
    [onQueryChange, onSelectSuggestion],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setShowDropdown(false);
      onSubmit();
    },
    [onSubmit],
  );

  const handleFocus = useCallback(() => {
    if (query.trim().length >= 2 || suggestions.length > 0)
      setShowDropdown(true);
  }, [query, suggestions.length]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowDropdown(false), 150);
  }, []);

  useEffect(() => {
    if (voiceError) {
      const t = setTimeout(() => setVoiceError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [voiceError]);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-expanded={showDropdown}
              data-testid={testId}
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-deep-slate placeholder-gray-400 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 sm:py-2.5"
            />
            <AutocompleteDropdown
              suggestions={suggestions}
              query={query}
              loading={suggestionsLoading}
              onSelect={handleSelect}
              onClose={() => setShowDropdown(false)}
              visible={showDropdown}
            />
          </div>
          <VoiceSearch
            onResult={(text) => {
              setVoiceError(null);
              onQueryChange(text);
              onVoiceResult(text);
            }}
            onError={setVoiceError}
            className="flex-shrink-0"
          />
        </div>
      </form>
      {voiceError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {voiceError}
        </p>
      )}
    </div>
  );
};

export default SearchBar;
