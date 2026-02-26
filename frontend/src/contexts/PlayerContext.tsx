import { createContext, useContext, type ReactNode } from 'react';
import useAudio from '@/hooks/useAudio';
import type { Track } from '@/types';

interface PlayerContextValue extends ReturnType<typeof useAudio> {
  tracks: Track[];
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({
  tracks,
  initialTrackIndex = 0,
  onTrackChange,
  onPlayStateChange,
  children,
}: {
  tracks: Track[];
  initialTrackIndex?: number;
  onTrackChange?: (index: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  children: ReactNode;
}) {
  const audio = useAudio({
    tracks,
    initialTrackIndex,
    onTrackChange,
    onPlayStateChange,
  });
  const value: PlayerContextValue = { ...audio, tracks };
  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

/** Use when provider may be absent (e.g. AmbientMode used without provider). */

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function usePlayerOptional(): PlayerContextValue | null {
  return useContext(PlayerContext);
}
