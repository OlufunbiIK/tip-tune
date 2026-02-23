import { SkipBack, SkipForward, Coins } from "lucide-react";
import TrackInfo from "./TrackInfo";
import ProgressBar from "./ProgressBar";
import PlayButton from "./PlayButton";
import VolumeControl from "./VolumeControl";
import useAudio from "@/hooks/useAudio";
import { Track } from "@/types";

interface MusicPlayerProps {
  tracks: Track[];
  currentTrackIndex?: number;
  onTrackChange?: (index: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const MusicPlayer = ({
  currentTrackIndex = 0,
  onTrackChange,
  onPlayStateChange,
}: MusicPlayerProps) => {
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    currentTrack,
    volume,
    isMuted,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    audioRef,
  } = useAudio({
    tracks,
    initialTrackIndex: currentTrackIndex,
    onTrackChange,
    onPlayStateChange,
  });

  if (!currentTrack) {
    return (
      <div className="bg-[#152840] rounded-2xl p-4 text-white flex items-center justify-center min-h-[200px] opacity-60">
        <p>No tracks available</p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 w-full border-white/10 bg-navy shadow p-4 sm:p-6">
        <audio ref={audioRef} preload="metadata" />
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[2.5fr_1fr] sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-10">
            <div className="hidden sm:block">
              {currentTrack.artist && (
                <TrackInfo
                  title={currentTrack.title}
                  artist={currentTrack.artist}
                  albumArt={currentTrack.coverArt}
                />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-center mb-2">
              

                <div className="flex items-center gap-4 sm:gap-6">
                  <button
                    className="text-white hover:scale-110 transition-transform"
                    onClick={previous}
                  >
                    <SkipBack
                      size={24}
                      className="sm:w-8 sm:h-8"
                      fill="currentColor"
                    />
                  </button>

                  <PlayButton
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    onPlayPause={togglePlayPause}
                  />

                  <button
                    className="text-white hover:scale-110 transition-transform"
                    onClick={next}
                  >
                    <SkipForward
                      size={24}
                      className="sm:w-8 sm:h-8"
                      fill="currentColor"
                    />
                  </button>
                </div>

              </div>

              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:flex-col sm:justify-start gap-3 sm:gap-4 pt-3">
            <button className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(255,209,102,0.2)] bg-gold text-navy whitespace-nowrap">
              <Coins size={14} className="sm:w-4 sm:h-4" />
              TIP ARTIST
            </button>

            <div className="flex-shrink-0">
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MusicPlayer;

export const tracks: Track[] = [
  {
    id: "1",
    title: "Sunset Dreams",
    artist: {
      id: "0",
      artistName: "Luna Waves",
    },
    tips: 79,
    plays: 56,
    coverArt: "https://picsum.photos/400/400?random=1",
    filename: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 360,
  },
  {
    id: "2",
    title: "Ocean Waves",
    artist: {
      id: "1",
      artistName: "Aqua Beats",
    },
    tips: 79,
    plays: 56,
    coverArt: "https://picsum.photos/400/400?random=2",
    filename: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 420,
  },
  {
    id: "3",
    title: "Mountain Echo",
    artist: {
      id: "2",
      artistName: "Echo Valley",
    },
    plays: 56,
    coverArt: "https://picsum.photos/400/400?random=3",
    filename: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 300,
    tips: 79,
  },
  {
    id: "4",
    title: "City Lights",
    artist: {
      id: "3",
      artistName: "Urban Symphony",
    },
    coverArt: "https://picsum.photos/400/400?random=3",
    plays: 56,
    tips: 79,
    filename: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 390,
  },
  {
    id: "5",
    title: "Forest Whispers",
    artist: {
      id: "4",
      artistName: "Nature Collective",
    },
    tips: 79,
    plays: 56,
    coverArt: "https://picsum.photos/400/400?random=5",
    filename: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: 450,
  },
];
