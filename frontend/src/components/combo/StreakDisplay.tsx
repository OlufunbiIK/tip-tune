import React from 'react';
import { CalendarDays, Trophy } from 'lucide-react';

type StreakDisplayProps = {
  currentDays: number;
  longestDays: number;
  lastTipDate: string | null;
  className?: string;
};

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentDays,
  longestDays,
  lastTipDate,
  className = '',
}) => (
  <div
    className={`rounded-xl border border-app bg-surface p-4 ${className}`}
    data-testid="streak-display"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-app">Tip Streak</span>
      </div>
      <span className="text-xs text-muted">
        {lastTipDate ? `Last: ${lastTipDate}` : 'No tips yet'}
      </span>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-surface-muted p-2">
        <p className="text-[11px] uppercase tracking-wider text-muted">Current</p>
        <p className="text-xl font-bold text-app">{currentDays}d</p>
      </div>
      <div className="rounded-lg bg-surface-muted p-2">
        <p className="text-[11px] uppercase tracking-wider text-muted">Best</p>
        <p className="inline-flex items-center gap-1 text-xl font-bold text-app">
          <Trophy className="h-4 w-4 text-amber-400" />
          {longestDays}d
        </p>
      </div>
    </div>
  </div>
);

export default StreakDisplay;
