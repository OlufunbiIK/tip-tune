import { Pause, Play } from "lucide-react";
import { forwardRef } from "react";

interface PlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
}

const PlayButton = forwardRef<HTMLButtonElement, PlayButtonProps>(
  ({ isPlaying, isLoading, onPlayPause }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onPlayPause}
        disabled={isLoading}
        aria-label={isPlaying ? "Pause" : "Play"}
        aria-pressed={isPlaying}
        aria-busy={isLoading}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        style={{
          background: `linear-gradient(135deg, #4DA3FF, #6EDCFF)`,
        }}
      >
        <span className="sr-only">
          {isLoading ? "Loading" : isPlaying ? "Pause" : "Play"}
        </span>
        {isPlaying ? (
          <Pause size={32} color="white" fill="white" aria-hidden="true" />
        ) : (
          <Play size={32} className="ml-1" color="white" fill="white" aria-hidden="true" />
        )}
      </button>
    );
  }
);

PlayButton.displayName = "PlayButton";

export default PlayButton;
