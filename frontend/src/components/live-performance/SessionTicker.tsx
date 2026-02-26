import React from 'react';

interface SessionTickerProps {
  totalXlm: number;
  tipCount: number;
  isSessionActive: boolean;
  privacyMode: boolean;
}

const SessionTicker: React.FC<SessionTickerProps> = ({
  totalXlm,
  tipCount,
  isSessionActive,
  privacyMode,
}) => {
  return (
    <div className="rounded-2xl border border-blue-primary/40 bg-navy/80 px-5 py-4 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-ice-blue">Session total</p>
        <span
          className={`h-2 w-2 rounded-full ${isSessionActive ? 'bg-mint animate-pulse' : 'bg-slate-500'}`}
          aria-label={isSessionActive ? 'Session active' : 'Session paused'}
        />
      </div>
      <p className="mt-2 text-3xl font-extrabold text-white">
        {privacyMode ? '••••' : `${totalXlm.toFixed(2)} XLM`}
      </p>
      <p className="mt-1 text-sm text-slate-300">{tipCount} tips this session</p>
    </div>
  );
};

export default SessionTicker;
