import React from 'react';
import { Flame } from 'lucide-react';
import { useReducedMotion } from '@/utils/animationUtils';

type OnFireAnimationProps = {
  active: boolean;
  className?: string;
};

const OnFireAnimation: React.FC<OnFireAnimationProps> = ({
  active,
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  if (!active) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-red-400/50 bg-gradient-to-r from-red-600/20 via-orange-500/20 to-amber-400/20 p-3 ${className}`}
      data-testid="on-fire-animation"
    >
      {!reducedMotion && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,146,60,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(239,68,68,0.25),transparent_40%)] animate-pulse-soft" />
      )}
      <div className="relative flex items-center gap-2 text-orange-100">
        <Flame className={`h-5 w-5 ${reducedMotion ? '' : 'animate-pulse'}`} />
        <div>
          <p className="text-sm font-bold">On Fire Bonus</p>
          <p className="text-xs text-orange-100/80">Combo streak has reached x5+</p>
        </div>
      </div>
    </div>
  );
};

export default OnFireAnimation;
