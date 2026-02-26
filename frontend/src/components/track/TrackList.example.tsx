// Example usage of TrackDetailModal component

import React, { useState } from 'react';
import { TrackDetailModal } from '@/components/track';
import { Track } from '@/types';

interface TrackListProps {
  tracks: Track[];
}

const TrackList: React.FC<TrackListProps> = ({ tracks }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTrack(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-navy-800 rounded-xl p-4 hover:bg-navy-700 transition-colors cursor-pointer"
            onClick={() => handleTrackClick(track)}
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-3">
              {track.coverArt ? (
                <img
                  src={track.coverArt}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <div className="text-white/50">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            
            <h3 className="text-white font-semibold mb-1 truncate">{track.title}</h3>
            <p className="text-ice-blue text-sm mb-2">by {track.artist.artistName}</p>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>🎵 {track.plays} plays</span>
              <span>🪙 {track.tips} tips</span>
            </div>
          </div>
        ))}
      </div>

      <TrackDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        track={selectedTrack}
        tracks={tracks}
        onTrackChange={(trackId) => {
          const track = tracks.find(t => t.id === trackId);
          if (track) {
            setSelectedTrack(track);
          }
        }}
      />
    </div>
  );
};

export default TrackList;