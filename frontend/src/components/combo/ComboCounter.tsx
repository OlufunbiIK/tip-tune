import React from 'react';
import { Flame } from 'lucide-react';
import { useReducedMotion } from '@/utils/animationUtils';

type ComboCounterProps = {
  comboCount: number;
  multiplier: number;
  isActive: boolean;
  className?: string;
};

const ComboCounter: React.FC<ComboCounterProps> = ({
  comboCount,
  multiplier,
  isActive,
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  if (!isActive) return null;

  return (
    <div
      className={`rounded-xl border border-orange-300/60 bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-red-500/15 p-3 ${
        reducedMotion ? '' : 'animate-slide-bounce'
      } ${className}`}
      data-testid="combo-counter"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">
            Tip Combo
          </p>
          <p className="text-2xl font-black text-app">
            x{multiplier}
            <span className="ml-2 text-sm font-medium text-muted">
              {comboCount} quick tips
            </span>
          </p>
        </div>
        {multiplier >= 5 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-300">
            <Flame className="h-4 w-4" />
            On Fire
          </span>
        )}
      </div>
    </div>
  );
};

export default ComboCounter;
