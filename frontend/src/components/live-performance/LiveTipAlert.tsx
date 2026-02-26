import React from 'react';
import type { LiveTipEvent } from './types';

interface LiveTipAlertProps {
  tip: LiveTipEvent;
  privacyMode: boolean;
}

const LiveTipAlert: React.FC<LiveTipAlertProps> = ({ tip, privacyMode }) => {
  const tipperLabel = privacyMode ? 'Hidden supporter' : tip.tipperName;
  const amountLabel = privacyMode ? 'Hidden amount' : `${tip.amount.toFixed(2)} ${tip.asset}`;

  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-sm shadow-lg transition-all duration-300 animate-slide-bounce ${
        tip.isLargeTip
          ? 'border-gold bg-gold/20 shadow-gold/40'
          : 'border-blue-primary/40 bg-navy/80 shadow-blue-primary/20'
      }`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ice-blue uppercase tracking-wide">Incoming tip</p>
        {tip.isLargeTip && (
          <span className="rounded-full bg-gold/30 px-2 py-1 text-xs font-semibold text-gold">
            Big tip
          </span>
        )}
      </div>
      <p className="mt-2 text-lg font-bold text-white">{tipperLabel}</p>
      <p className="text-xl font-extrabold text-mint">{amountLabel}</p>
      <p className="mt-1 text-xs text-slate-300">
        {new Date(tip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

export default LiveTipAlert;
