import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface LowBalanceWarningProps {
  balanceXlm: number;
  threshold?: number;
}

const LowBalanceWarning: React.FC<LowBalanceWarningProps> = ({
  balanceXlm,
  threshold = 5,
}) => {
  if (!Number.isFinite(balanceXlm) || balanceXlm >= threshold) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-400/40 px-3 py-1">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
      <span className="text-[11px] font-medium text-amber-100">
        Low balance · Add more XLM
      </span>
    </div>
  );
};

export default LowBalanceWarning;

