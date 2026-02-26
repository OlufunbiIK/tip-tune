import React from 'react';

interface HypeMeterProps {
  value: number;
}

const HypeMeter: React.FC<HypeMeterProps> = ({ value }) => {
  const safeValue = Math.max(0, Math.min(100, value));
  const toneClass =
    safeValue >= 80
      ? 'from-gold via-amber-400 to-rose-400'
      : safeValue >= 50
      ? 'from-mint via-ice-blue to-blue-primary'
      : 'from-blue-primary via-sky-500 to-cyan-400';

  return (
    <div className="rounded-2xl border border-blue-primary/40 bg-navy/80 p-4 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-ice-blue">Crowd hype</p>
        <p className="text-sm font-semibold text-white">{safeValue.toFixed(0)}%</p>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-900/80">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${toneClass}`}
          style={{ width: `${safeValue}%` }}
          role="meter"
          aria-label="Crowd hype meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeValue}
        />
      </div>
    </div>
  );
};

export default HypeMeter;
