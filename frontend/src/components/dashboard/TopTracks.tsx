
import React from 'react';
import { Track } from '../../types';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { formatCurrency, formatNumber } from '../../utils/formatter';

interface TopTracksProps {
  tracks: Track[];
  isLoading: boolean;
}

const TrackItem: React.FC<{ track: Track }> = ({ track }) => (
  <li className="flex items-center space-x-4 py-3">
    <img src={track.coverArt} alt={track.title} className="w-12 h-12 rounded-lg object-cover" />
    <div className="flex-1">
      <p className="font-semibold text-gray-800">{track.title}</p>
      <p className="text-sm text-gray-500 font-mono">{formatNumber(track.plays)} plays</p>
    </div>
    <div className="text-right">
        <p className="font-bold text-primary-blue font-mono">{formatCurrency(track.tips)}</p>
    </div>
  </li>
);

const LoadingTrackItem: React.FC = () => (
    <li className="flex items-center space-x-4 py-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-1" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16" />
    </li>
)


const TopTracks: React.FC<TopTracksProps> = ({ tracks, isLoading }) => {
  return (
    <Card className="h-full">
      <h2 className="text-xl font-bold mb-4">Top Tracks by Tips</h2>
      <ul className="divide-y divide-gray-200">
        {isLoading ? (
            Array.from({length: 4}).map((_, index) => <LoadingTrackItem key={index}/>)
        ) : (
            tracks.map(track => <TrackItem key={track.id} track={track} />)
        )}
      </ul>
    </Card>
  );
};

export default TopTracks;
