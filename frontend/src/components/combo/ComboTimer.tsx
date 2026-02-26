import React from 'react';
import { useReducedMotion } from '@/utils/animationUtils';

type ComboTimerProps = {
  progress: number;
  isActive: boolean;
  remainingMs: number;
  className?: string;
};

const ComboTimer: React.FC<ComboTimerProps> = ({
  progress,
  isActive,
  remainingMs,
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  if (!isActive) return null;

  const safeProgress = Math.max(0, Math.min(1, progress));
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return (
    <div className={`space-y-1 ${className}`} data-testid="combo-timer">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
        <span>Combo Timer</span>
        <span>{remainingSeconds}s</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeProgress * 100)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
          style={{
            width: `${safeProgress * 100}%`,
            transition: reducedMotion ? 'none' : 'width 100ms linear',
          }}
        />
      </div>
    </div>
  );
};

export default ComboTimer;
