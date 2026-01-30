import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useRef} from "react";

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
    [onVolumeChange],
  );

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto min-w-[120px]">
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        data-testid="mute-button"
        type="button"
      >
        {isMuted || volume === 0 ? (
          <VolumeX size={16} className="text-white/40 flex-shrink-0" />
        ) : (
          <Volume2 size={16} className="text-white/40 flex-shrink-0" />
        )}
      </button>

  

       <div
        ref={volumeBarRef}
        className="flex-1 max-w-[120px] h-1 bg-white/10 rounded-full cursor-pointer relative group overflow-visible"
        onClick={handleVolumeClick}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        data-testid="volume-bar"
      >
        <div
          className="h-full bg-[#4DA3FF] rounded-full relative transition-[width] duration-100 linear"
          style={{ width: `${volume * 100}%` }}
        >
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"></div>
        </div>
      </div>
    </div>
  );
};

export default VolumeControl;
