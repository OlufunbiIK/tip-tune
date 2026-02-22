import React from 'react';
import { Play, Coins } from 'lucide-react';
import { Track } from '../../types';

interface TrackGridProps {
    tracks: Track[];
    loading: boolean;
    sortBy: 'popularity' | 'recency';
    onSortChange: (sort: 'popularity' | 'recency') => void;
    title?: string;
}

const formatNumber = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

const GridSkeleton: React.FC = () => (
    <div className="animate-pulse" data-testid="grid-skeleton">
        <div className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
);

const TrackGridCard: React.FC<{ track: Track }> = ({ track }) => (
    <div className="group cursor-pointer" data-testid="track-grid-card">
        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
            <img
                src={track.coverArt}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-primary-blue flex items-center justify-center shadow-lg transition-transform duration-300 scale-90 group-hover:scale-100">
                        <Play size={18} fill="white" className="text-white ml-0.5" />
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-gold text-xs font-semibold">
                        <Coins size={12} />
                        {formatNumber(track.tips)}
                    </div>
                </div>
            </div>

            {/* Genre badge */}
            {track.genre && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium">
                    {track.genre}
                </div>
            )}
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-primary-blue transition-colors">
            {track.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {track.artist?.artistName}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
                <Play size={10} /> {formatNumber(track.plays)}
            </span>
            <span className="flex items-center gap-1 text-gold">
                <Coins size={10} /> {formatNumber(track.tips)} XLM
            </span>
        </div>
    </div>
);

const TrackGrid: React.FC<TrackGridProps> = ({
    tracks,
    loading,
    sortBy,
    onSortChange,
    title = 'Tracks',
}) => {
    return (
        <section data-testid="track-grid">
            {/* Header with sort */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    <label htmlFor="sort-select" className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                        Sort by:
                    </label>
                    <select
                        id="sort-select"
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as 'popularity' | 'recency')}
                        className="text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        data-testid="sort-select"
                    >
                        <option value="popularity">Most Popular</option>
                        <option value="recency">Most Recent</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {loading
                    ? Array.from({ length: 8 }).map((_, i) => <GridSkeleton key={i} />)
                    : tracks.map((track) => (
                        <TrackGridCard key={track.id} track={track} />
                    ))}
            </div>

            {!loading && tracks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-lg">No tracks found</p>
                    <p className="text-sm mt-1">Try selecting a different genre</p>
                </div>
            )}
        </section>
    );
};

export default TrackGrid;
