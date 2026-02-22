import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  leaderboardService,
  LeaderboardType,
  Timeframe,
  LeaderboardEntry,
  LeaderboardResponse,
} from '../services/leaderboardService';
import { LeaderboardTable } from '../components/LeaderboardTable';

type LeaderboardCategory = 'artists' | 'tippers' | 'tracks';

const LEADERBOARD_TYPES: Record<LeaderboardCategory, LeaderboardType[]> = {
  artists: [
    LeaderboardType.ARTIST_MOST_TIPPED,
    LeaderboardType.ARTIST_MOST_PLAYED,
    LeaderboardType.ARTIST_FASTEST_GROWING,
  ],
  tippers: [
    LeaderboardType.TIPPER_MOST_GENEROUS,
    LeaderboardType.TIPPER_MOST_ACTIVE,
    LeaderboardType.TIPPER_BIGGEST_SINGLE,
  ],
  tracks: [
    LeaderboardType.TRACK_TRENDING,
    LeaderboardType.TRACK_MOST_TIPPED,
    LeaderboardType.TRACK_MOST_PLAYED,
  ],
};

const LEADERBOARD_LABELS: Record<LeaderboardType, string> = {
  [LeaderboardType.ARTIST_MOST_TIPPED]: 'Most Tipped Artists',
  [LeaderboardType.ARTIST_MOST_PLAYED]: 'Most Played Artists',
  [LeaderboardType.ARTIST_FASTEST_GROWING]: 'Fastest Growing Artists',
  [LeaderboardType.ARTIST_BY_GENRE]: 'Artists by Genre',
  [LeaderboardType.TIPPER_MOST_GENEROUS]: 'Most Generous Tippers',
  [LeaderboardType.TIPPER_MOST_ACTIVE]: 'Most Active Tippers',
  [LeaderboardType.TIPPER_BIGGEST_SINGLE]: 'Biggest Single Tips',
  [LeaderboardType.TRACK_TRENDING]: 'Trending Tracks',
  [LeaderboardType.TRACK_MOST_TIPPED]: 'Most Tipped Tracks',
  [LeaderboardType.TRACK_MOST_PLAYED]: 'Most Played Tracks',
};

const SCORE_LABELS: Record<LeaderboardType, string> = {
  [LeaderboardType.ARTIST_MOST_TIPPED]: 'Total Tips (XLM)',
  [LeaderboardType.ARTIST_MOST_PLAYED]: 'Total Plays',
  [LeaderboardType.ARTIST_FASTEST_GROWING]: 'Growth Score',
  [LeaderboardType.ARTIST_BY_GENRE]: 'Total Tips (XLM)',
  [LeaderboardType.TIPPER_MOST_GENEROUS]: 'Total Tipped (XLM)',
  [LeaderboardType.TIPPER_MOST_ACTIVE]: 'Number of Tips',
  [LeaderboardType.TIPPER_BIGGEST_SINGLE]: 'Biggest Tip (XLM)',
  [LeaderboardType.TRACK_TRENDING]: 'Trending Score',
  [LeaderboardType.TRACK_MOST_TIPPED]: 'Total Tips (XLM)',
  [LeaderboardType.TRACK_MOST_PLAYED]: 'Total Plays',
};

export const LeaderboardsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<LeaderboardCategory>(
    (searchParams.get('category') as LeaderboardCategory) || 'artists',
  );
  const [type, setType] = useState<LeaderboardType>(
    (searchParams.get('type') as LeaderboardType) || LeaderboardType.ARTIST_MOST_TIPPED,
  );
  const [timeframe, setTimeframe] = useState<Timeframe>(
    (searchParams.get('timeframe') as Timeframe) || Timeframe.ALL_TIME,
  );
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await leaderboardService.getLeaderboard(type, {
          timeframe,
          limit: 50,
        });
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, timeframe]);

  useEffect(() => {
    // Update URL params when filters change
    setSearchParams({
      category,
      type,
      timeframe,
    });
  }, [category, type, timeframe, setSearchParams]);

  const handleCategoryChange = (newCategory: LeaderboardCategory) => {
    setCategory(newCategory);
    setType(LEADERBOARD_TYPES[newCategory][0]);
  };

  const handleEntryClick = (entry: LeaderboardEntry) => {
    // Navigate to artist/track/tipper profile
    console.log('Navigate to:', entry.id);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `TipTune Leaderboard: ${LEADERBOARD_LABELS[type]}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Share
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-1 mb-6 border-b border-gray-200">
            {(['artists', 'tippers', 'tracks'] as LeaderboardCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  category === cat
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leaderboard Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaderboardType)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {LEADERBOARD_TYPES[category].map((t) => (
                <option key={t} value={t}>
                  {LEADERBOARD_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <div className="flex space-x-4">
              {Object.values(Timeframe).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeframe === tf
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tf === Timeframe.ALL_TIME
                    ? 'All Time'
                    : tf === Timeframe.MONTHLY
                    ? 'Monthly'
                    : 'Weekly'}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Content */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-500">Loading leaderboard...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {data && !loading && (
            <div>
              <div className="mb-4 text-sm text-gray-500">
                Last updated: {new Date(data.updatedAt).toLocaleString()}
              </div>
              <LeaderboardTable
                entries={data.entries}
                scoreLabel={SCORE_LABELS[type]}
                showRankChange={true}
                onEntryClick={handleEntryClick}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
