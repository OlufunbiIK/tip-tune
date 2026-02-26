import React, { useEffect, useRef, useState } from 'react';
import { Track } from '@/types';

interface ArtistTrackListProps {
  tracks: Track[];
}

const ArtistTrackList: React.FC<ArtistTrackListProps> = ({ tracks }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleTrackPlayback = async (track: Track) => {
    if (!audioRef.current || !track.filename) return;

    if (activeTrackId === track.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (activeTrackId !== track.id) {
      audioRef.current.src = track.filename;
      setActiveTrackId(track.id);
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const formatTips = (tips: number) => `${tips.toLocaleString()} XLM`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tracks</h2>
        <p className="text-sm text-gray-600">{tracks.length} total</p>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          setActiveTrackId(null);
        }}
      />

      <div className="space-y-3">
        {tracks.map((track, index) => {
          const active = activeTrackId === track.id && isPlaying;
          return (
            <article
              key={track.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
            >
              <button
                onClick={() => toggleTrackPlayback(track)}
                disabled={!track.filename}
                className="h-10 w-10 rounded-full bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                aria-label={`${active ? 'Pause' : 'Play'} ${track.title}`}
              >
                {active ? 'II' : '>'}
              </button>
              <img
                src={track.coverArt}
                alt={`${track.title} cover`}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {index + 1}. {track.title}
                </p>
                <p className="text-xs text-gray-600">
                  {track.plays.toLocaleString()} plays . {formatTips(track.tips)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ArtistTrackList;
