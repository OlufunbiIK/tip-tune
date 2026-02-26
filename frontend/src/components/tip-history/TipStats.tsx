import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/formatter';

interface TipStatsProps {
  totalSent: number;
  totalReceived: number;
  /** Use USD when available from tips; otherwise amounts may be in XLM */
  isUsd?: boolean;
  isLoading?: boolean;
}

const TipStats: React.FC<TipStatsProps> = ({
  totalSent,
  totalReceived,
  isUsd = true,
  isLoading = false,
}) => {
  const format = (n: number) =>
    isUsd ? formatCurrency(n) : `${n.toFixed(2)} XLM`;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="tip-stats">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="tip-stats">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-blue to-secondary-indigo flex items-center justify-center flex-shrink-0">
          <ArrowUpRight className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-display font-medium text-gray-500">Total Sent</p>
          <p className="text-xl font-mono font-bold text-gray-900">{format(totalSent)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent-gold to-amber-500 flex items-center justify-center flex-shrink-0">
          <ArrowDownLeft className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-display font-medium text-gray-500">Total Received</p>
          <p className="text-xl font-mono font-bold text-gray-900">{format(totalReceived)}</p>
        </div>
      </div>
    </div>
  );
};

export default TipStats;
