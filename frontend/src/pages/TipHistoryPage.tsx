import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TipCard, TipFilters, TipStats } from '../components/tip-history';
import type { TipFiltersState } from '../components/tip-history';
import { defaultTipFilters } from '../components/tip-history';
import { TipHistoryItem } from '../types';
import { exportTipHistoryToCSV } from '../utils/formatter';
import { tipService } from '../services';
import { useWallet } from '../hooks/useWallet';

const PAGE_SIZE = 10;

/** Build mock tip history when API is not used (no userId/artistId or API error) */
function useMockTipHistory(): {
  sent: TipHistoryItem[];
  received: TipHistoryItem[];
} {
  return useMemo(() => {
    const now = Date.now();
    const sent: TipHistoryItem[] = Array.from({ length: 18 }, (_, i) => ({
      id: `sent-${i}`,
      tipperName: 'You',
      tipperAvatar: 'https://i.pravatar.cc/150?u=me',
      amount: Number((Math.random() * 40 + 5).toFixed(2)),
      message: i % 2 === 0 ? 'Great track!' : '',
      timestamp: new Date(now - i * 3600000 * 12).toISOString(),
      trackId: `track-${i % 4}`,
      artistName: [`Artist A`, `Artist B`, `Artist C`][i % 3],
      trackTitle: [`Neon Dreams`, `City Lights`, `Sunset Groove`, `Midnight Drive`][i % 4],
      assetCode: i % 3 === 0 ? 'USDC' : 'XLM',
      usdAmount: Number((Math.random() * 30 + 5).toFixed(2)),
      stellarTxHash: `mock-hash-sent-${i}`,
    }));
    const received: TipHistoryItem[] = Array.from({ length: 22 }, (_, i) => ({
      id: `recv-${i}`,
      tipperName: `Fan #${1000 + i}`,
      tipperAvatar: `https://i.pravatar.cc/150?u=fan${i}`,
      amount: Number((Math.random() * 50 + 2).toFixed(2)),
      message: ['Love it!', '🔥', 'Keep going!'][i % 3],
      timestamp: new Date(now - i * 3600000 * 8).toISOString(),
      trackId: `track-${i % 4}`,
      trackTitle: [`Neon Dreams`, `City Lights`, `Sunset Groove`, `Midnight Drive`][i % 4],
      assetCode: i % 4 === 0 ? 'USDC' : 'XLM',
      usdAmount: Number((Math.random() * 40 + 2).toFixed(2)),
      stellarTxHash: `mock-hash-recv-${i}`,
    }));
    return { sent, received };
  }, []);
}

function applyFiltersAndSort(
  items: TipHistoryItem[],
  filters: TipFiltersState
): TipHistoryItem[] {
  let result = [...items];

  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : null;
  const amountMin = filters.amountMin ? Number(filters.amountMin) : null;
  const amountMax = filters.amountMax ? Number(filters.amountMax) : null;
  const q = filters.searchQuery.trim().toLowerCase();
  const asset = filters.assetType;

  result = result.filter((tip) => {
    const t = new Date(tip.timestamp).getTime();
    if (dateFrom != null && t < dateFrom) return false;
    if (dateTo != null && t > dateTo + 86400000) return false;
    if (amountMin != null && tip.amount < amountMin) return false;
    if (amountMax != null && tip.amount > amountMax) return false;
    if (asset !== 'all' && (tip.assetCode || 'XLM') !== asset) return false;
    if (q) {
      const match =
        tip.tipperName?.toLowerCase().includes(q) ||
        (tip as TipHistoryItem).artistName?.toLowerCase().includes(q) ||
        (tip as TipHistoryItem).trackTitle?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const sort = filters.sort;
  result.sort((a, b) => {
    if (sort === 'newest')
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (sort === 'oldest')
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return b.amount - a.amount; // highest_amount
  });

  return result;
}

export const TipHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'sent' | 'received' | null;
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>(
    tabFromUrl === 'sent' || tabFromUrl === 'received' ? tabFromUrl : 'sent'
  );
  const [filters, setFilters] = useState<TipFiltersState>(defaultTipFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sentApi, setSentApi] = useState<TipHistoryItem[]>([]);
  const [receivedApi, setReceivedApi] = useState<TipHistoryItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const { publicKey } = useWallet();
  const mock = useMockTipHistory();

  const userId = (import.meta.env.VITE_DEV_USER_ID as string) || null;
  const artistId = (import.meta.env.VITE_DEV_ARTIST_ID as string) || null;

  const fetchData = useCallback(async () => {
    if (!userId && !artistId) return;
    setLoading(true);
    setApiError(null);
    try {
      const [sentRes, recvRes] = await Promise.all([
        userId ? tipService.getUserHistory(userId, 1, 100) : { data: [], meta: { total: 0 } },
        artistId ? tipService.getArtistReceived(artistId, 1, 100) : { data: [], meta: { total: 0 } },
      ]);
      const mapToHistory = (d: any): TipHistoryItem => ({
        id: d.id,
        tipperName: d.tipperName ?? d.fromUser?.username ?? 'Unknown',
        tipperAvatar: d.tipperAvatar ?? '',
        amount: Number(d.amount),
        message: d.message ?? '',
        timestamp: d.createdAt ?? d.timestamp ?? new Date().toISOString(),
        trackId: d.trackId,
        trackTitle: d.track?.title,
        artistName: d.artist?.artistName,
        assetCode: d.assetCode ?? 'XLM',
        usdAmount: d.fiatAmount != null ? Number(d.fiatAmount) : undefined,
        stellarTxHash: d.stellarTxHash,
      });
      setSentApi((sentRes as any).data?.map(mapToHistory) ?? []);
      setReceivedApi((recvRes as any).data?.map(mapToHistory) ?? []);
    } catch (e: any) {
      setApiError(e?.message ?? 'Failed to load tip history');
    } finally {
      setLoading(false);
    }
  }, [userId, artistId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sentRaw = sentApi.length > 0 ? sentApi : mock.sent;
  const receivedRaw = receivedApi.length > 0 ? receivedApi : mock.received;

  const sentFiltered = useMemo(
    () => applyFiltersAndSort(sentRaw, filters),
    [sentRaw, filters]
  );
  const receivedFiltered = useMemo(
    () => applyFiltersAndSort(receivedRaw, filters),
    [receivedRaw, filters]
  );

  const currentList = activeTab === 'sent' ? sentFiltered : receivedFiltered;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return currentList.slice(start, start + PAGE_SIZE);
  }, [currentList, currentPage]);

  const totalSent = useMemo(
    () => sentFiltered.reduce((sum, t) => sum + (t.usdAmount ?? t.amount), 0),
    [sentFiltered]
  );
  const totalReceived = useMemo(
    () => receivedFiltered.reduce((sum, t) => sum + (t.usdAmount ?? t.amount), 0),
    [receivedFiltered]
  );

  const handleTabChange = (tab: 'sent' | 'received') => {
    setActiveTab(tab);
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const handleExport = () => {
    exportTipHistoryToCSV(currentList);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Tip History
        </h1>
        <p className="text-gray-600 mb-6">
          View and filter all tips you&apos;ve sent and received.
        </p>

        {apiError && (
          <div
            className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"
            role="alert"
          >
            {apiError} Showing sample data.
          </div>
        )}

        <TipStats
          totalSent={totalSent}
          totalReceived={totalReceived}
          isUsd={true}
          isLoading={loading}
        />

        <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
          {/* Tabs */}
          <div
            className="flex border-b border-gray-200 mb-6"
            role="tablist"
            aria-label="Tip history tabs"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'sent'}
              onClick={() => handleTabChange('sent')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'sent'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sent
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'received'}
              onClick={() => handleTabChange('received')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'received'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Received
            </button>
          </div>

          {/* Filters */}
          <TipFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={currentList.length}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleExport}
              disabled={currentList.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-blue rounded-lg hover:bg-secondary-indigo disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export to CSV
            </button>
          </div>

          {/* List */}
          <div className="mt-6 space-y-4" role="list">
            {loading && currentList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Loading tips...
              </div>
            ) : paginated.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                No tips match your filters.
              </p>
            ) : (
              paginated.map((tip) => (
                <TipCard key={tip.id} tip={tip} variant={activeTab} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-3"
              aria-label="Pagination"
            >
              <p className="text-sm text-gray-600">
                Page{' '}
                <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
                {' · '}
                <span className="font-medium">{currentList.length}</span> total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TipHistoryPage;
