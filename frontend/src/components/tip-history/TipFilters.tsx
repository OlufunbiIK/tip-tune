import React from 'react';
import { Search, Calendar } from 'lucide-react';

export type SortOption = 'newest' | 'oldest' | 'highest_amount';

export interface TipFiltersState {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  searchQuery: string;
  assetType: 'all' | 'XLM' | 'USDC';
  sort: SortOption;
}

export const defaultTipFilters: TipFiltersState = {
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  searchQuery: '',
  assetType: 'all',
  sort: 'newest',
};

interface TipFiltersProps {
  filters: TipFiltersState;
  onFiltersChange: (f: TipFiltersState) => void;
  resultCount?: number;
}

const TipFilters: React.FC<TipFiltersProps> = ({
  filters,
  onFiltersChange,
  resultCount,
}) => {
  const update = (partial: Partial<TipFiltersState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="space-y-4" data-testid="tip-filters">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search artist or user..."
          value={filters.searchQuery}
          onChange={(e) => update({ searchQuery: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          aria-label="Search artist or user"
        />
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          aria-label="Date from"
        />
        <span className="text-gray-400">–</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          aria-label="Date to"
        />
      </div>

      {/* Amount range */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-600 whitespace-nowrap">Amount:</label>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Min"
          value={filters.amountMin}
          onChange={(e) => update({ amountMin: e.target.value })}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          aria-label="Minimum amount"
        />
        <span className="text-gray-400">–</span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Max"
          value={filters.amountMax}
          onChange={(e) => update({ amountMax: e.target.value })}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          aria-label="Maximum amount"
        />
      </div>

      {/* Asset type & Sort */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Asset:</label>
          <select
            value={filters.assetType}
            onChange={(e) => update({ assetType: e.target.value as TipFiltersState['assetType'] })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
            aria-label="Asset type"
          >
            <option value="all">All</option>
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort:</label>
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as SortOption })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
            aria-label="Sort by"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest_amount">Highest amount</option>
          </select>
        </div>
        {resultCount != null && (
          <p className="text-sm text-gray-500 ml-auto">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default TipFilters;
