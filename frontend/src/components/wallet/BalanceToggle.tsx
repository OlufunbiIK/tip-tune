import React from 'react';

export type BalanceMode = 'XLM' | 'USD';

export interface BalanceToggleProps {
  mode: BalanceMode;
  onChange: (mode: BalanceMode) => void;
}

const BalanceToggle: React.FC<BalanceToggleProps> = ({ mode, onChange }) => {
  return (
    <div
      className="inline-flex items-center rounded-full bg-slate-800/80 p-0.5"
      role="tablist"
      aria-label="Balance display mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'XLM'}
        onClick={() => onChange('XLM')}
        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${
          mode === 'XLM'
            ? 'bg-slate-950 text-white shadow'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        XLM
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'USD'}
        onClick={() => onChange('USD')}
        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${
          mode === 'USD'
            ? 'bg-slate-950 text-white shadow'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        USD
      </button>
    </div>
  );
};

export default BalanceToggle;

