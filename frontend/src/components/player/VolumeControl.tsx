import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useRef, KeyboardEvent } from "react";

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

const VolumeControl = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) => {
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!volumeBarRef.current) return;

      const rect = volumeBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newVolume = Math.max(0, Math.min(1, clickX / rect.width));

      onVolumeChange(newVolume);
    },
    [onVolumeChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = 0.1;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          onVolumeChange(Math.min(volume + step, 1));
          break;
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          onVolumeChange(Math.max(volume - step, 0));
          break;
        case "Home":
          e.preventDefault();
          onVolumeChange(0);
          break;
        case "End":
          e.preventDefault();
          onVolumeChange(1);
          break;
        default:
          break;
      }
    },
    [volume, onVolumeChange]
  );

  const volumePercentage = Math.round(volume * 100);

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto min-w-[120px]">
      <button
        onClick={onToggleMute}
        aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
        aria-pressed={isMuted}
        data-testid="mute-button"
        type="button"
        className="p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
      >
        <span className="sr-only">
          {isMuted || volume === 0 ? "Unmute" : "Mute"}
        </span>
        {isMuted || volume === 0 ? (
          <VolumeX
            size={16}
            className="text-white/40 flex-shrink-0"
            aria-hidden="true"
          />
        ) : (
          <Volume2
            size={16}
            className="text-white/40 flex-shrink-0"
            aria-hidden="true"
          />
        )}
      </button>

      <div
        ref={volumeBarRef}
        className="flex-1 max-w-[120px] h-1 bg-white/10 rounded-full cursor-pointer relative group overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        onClick={handleVolumeClick}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volumePercentage}
        aria-valuetext={`${volumePercentage}% volume`}
        tabIndex={0}
        data-testid="volume-bar"
      >
        <div
          className="h-full bg-[#4DA3FF] rounded-full relative transition-[width] duration-100 linear"
          style={{ width: `${volumePercentage}%` }}
        >
          <div
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-300"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default VolumeControl;
