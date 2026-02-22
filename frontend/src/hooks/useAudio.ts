import { Track } from '@/types';
import { useState, useRef, useEffect, useCallback } from 'react';

// export interface Track {
//   id: string;
//   title: string;
//   artist: string;
//   albumArt?: string;
//   audioUrl: string;
//   duration?: number;
// }

interface UseAudioOptions {
  tracks: Track[];
  initialTrackIndex?: number;
  onTrackChange?: (index: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

interface UseAudioReturn {
  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  currentTrackIndex: number;
  currentTrack: Track | null;
  
  // Volume state
  volume: number;
  isMuted: boolean;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  
  // Volume controls
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Audio element ref (for advanced usage)
  audioRef: React.RefObject<HTMLAudioElement>;
}

export const useAudio = ({
  tracks,
  initialTrackIndex = 0,
  onTrackChange,
  onPlayStateChange,
}: UseAudioOptions): UseAudioReturn => {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialTrackIndex);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousVolumeRef = useRef(1);

  // Current track
  const currentTrack = tracks[currentTrackIndex] || null;

  // Load track when index changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const wasPlaying = isPlaying;
      if (!audioRef.current || !currentTrack.filename) return
      audioRef.current.src = currentTrack.filename;
      audioRef.current.load();
      setCurrentTime(0);
      setIsLoading(true);
      setIsPlaying(false);

      // Auto-play if was playing before
      if (wasPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrackIndex, currentTrack]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      // Auto-advance to next track
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex(currentTrackIndex + 1);
        onTrackChange?.(currentTrackIndex + 1);
      } else {
        // Loop back to first track
        setCurrentTrackIndex(0);
        onTrackChange?.(0);
      }
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      console.error('Audio error:', e);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrackIndex, tracks.length, onTrackChange, onPlayStateChange]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Play
  const play = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying]);

  // Pause
  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Next track
  const next = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
    onTrackChange?.(nextIndex);
  }, [currentTrackIndex, tracks.length, onTrackChange]);

  // Previous track
  const previous = useCallback(() => {
    // If more than 3 seconds played, restart current track
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }

    const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    onTrackChange?.(prevIndex);
  }, [currentTrackIndex, currentTime, tracks.length, onTrackChange]);

  // Seek to position
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (!isMuted) {
      previousVolumeRef.current = clampedVolume;
    }
    if (clampedVolume > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolumeState(previousVolumeRef.current);
    } else {
      previousVolumeRef.current = volume;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  return {
    // State
    isPlaying,
    isLoading,
    currentTime,
    duration,
    currentTrackIndex,
    currentTrack,
    volume,
    isMuted,
    
    // Controls
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    
    // Ref
    audioRef: audioRef as React.RefObject<HTMLAudioElement>,
  };
};

export default useAudio;
