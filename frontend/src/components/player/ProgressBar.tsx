import { useCallback, useRef, KeyboardEvent } from "react";
import { formatTimeForScreenReader } from "@/utils/accessibility";

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

const ProgressBar = ({ currentTime, duration, onSeek }: ProgressBarProps) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;

      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;

      onSeek(newTime);
    },
    [duration, onSeek]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = 5;
      const largeStep = 30;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          onSeek(Math.min(currentTime + step, duration));
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSeek(Math.max(currentTime - step, 0));
          break;
        case "PageUp":
          e.preventDefault();
          onSeek(Math.min(currentTime + largeStep, duration));
          break;
        case "PageDown":
          e.preventDefault();
          onSeek(Math.max(currentTime - largeStep, 0));
          break;
        case "Home":
          e.preventDefault();
          onSeek(0);
          break;
        case "End":
          e.preventDefault();
          onSeek(duration);
          break;
        default:
          break;
      }
    },
    [currentTime, duration, onSeek]
  );

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="text-sm text-[#9BF0E1] min-w-[40px] text-center tabular-nums"
        aria-label={`Current time ${formatTimeForScreenReader(currentTime)}`}
      >
        {formatTime(currentTime)}
      </span>

      <div
        ref={progressBarRef}
        className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        onClick={handleProgressClick}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTimeForScreenReader(currentTime)} of ${formatTimeForScreenReader(duration)}`}
        tabIndex={0}
        data-testid="progress-bar"
      >
        <div
          className="h-full bg-gradient-to-r from-[#4DA3FF] to-[#6EDCFF] rounded-full relative transition-[width] duration-100 linear"
          style={{ width: `${progressPercentage}%` }}
        >
          <div
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-300"
            aria-hidden="true"
          />
        </div>
      </div>

      <span
        className="text-sm text-[#9BF0E1] min-w-[40px] text-center tabular-nums"
        aria-label={`Total duration ${formatTimeForScreenReader(duration)}`}
      >
        {formatTime(duration)}
      </span>
    </div>
  );
};

export default ProgressBar;
