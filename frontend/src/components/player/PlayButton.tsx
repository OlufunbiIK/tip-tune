import { Pause, Play } from "lucide-react";

interface PlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  //   onPrevious: () => void;
  //   onNext: () => void;
}

const PlayButton = ({ isPlaying, isLoading, onPlayPause }: PlayButtonProps) => {
  return (
    <button
      onClick={onPlayPause}
      disabled={isLoading}
      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all "
      style={{
        background: `linear-gradient(135deg, #4DA3FF, #6EDCFF)`,
      }}
    >
      {isPlaying ? (
        <Pause size={32} color="white" fill="white" />
      ) : (
        <Play size={32} className="ml-1" color="white" fill="white" />
      )}
    </button>
  );
};

export default PlayButton;
