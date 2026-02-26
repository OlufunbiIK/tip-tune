import React from 'react';
import { Flame } from 'lucide-react';

type StreakBadgeProps = {
  streakDays: number;
  className?: string;
};

const StreakBadge: React.FC<StreakBadgeProps> = ({ streakDays, className = '' }) => (
  <div
    className={`inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300 ${className}`}
    data-testid="streak-badge"
  >
    <Flame className="h-3.5 w-3.5" />
    {streakDays > 0 ? `${streakDays}-Day Streak` : 'No Active Streak'}
  </div>
);

export default StreakBadge;
