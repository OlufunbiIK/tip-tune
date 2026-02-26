import React from 'react';
import { useSearch } from '../hooks/useSearch';
import SearchBar from '../components/search/SearchBar';
import SearchFilters from '../components/search/SearchFilters';
import SearchHistory from '../components/search/SearchHistory';
import SearchResults from '../components/search/SearchResults';

export const SearchPage: React.FC = () => {
  const {
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
    commitQuery,
    history,
    trending,
    clearHistory,
  } = useSearch();

  // Run search when filters change (if query exists)
  React.useEffect(() => {
    if (query.trim()) {
      runSearch(1, query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchSubmit = () => {
    if (query.trim()) {
      runSearch(1, query);
    }
  };

  const handleHistorySelect = (q: string) => {
    commitQuery(q);
    // Trigger search immediately after selecting history/trending
    setTimeout(() => runSearch(1, q), 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 space-y-6">
        <h1 className="text-3xl font-bold text-deep-slate dark:text-white">Search</h1>
        
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          onSelectSuggestion={(item) => {
            // When suggestion selected, update query and run search
            commitQuery(item.title);
            setTimeout(() => runSearch(1, item.title), 0);
          }}
          onVoiceResult={(text) => {
            commitQuery(text);
            setTimeout(() => runSearch(1, text), 0);
          }}
          onSubmit={handleSearchSubmit}
        />

        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={results?.tracks?.total || results?.artists?.total ? (results?.tracks?.total || 0) + (results?.artists?.total || 0) : undefined}
        />

        {!results && !searchLoading && (
          <div className="grid gap-6 md:grid-cols-2">
            <SearchHistory
              history={history}
              onSelect={handleHistorySelect}
              onClear={clearHistory}
            />
            
            {trending.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-deep-slate">
                <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trending searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trending.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleHistorySelect(t)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-deep-slate hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <SearchResults
        results={results}
        query={query}
        searchLoading={searchLoading}
        searchError={searchError}
      />
    </div>
  );
};

export default SearchPage;
