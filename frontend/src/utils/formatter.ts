
import { Tip, TipHistoryItem } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
};

export const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(dateObj);
}

export const exportTipsToCSV = (tips: Tip[]) => {
  const headers = ['ID', 'Tipper', 'Amount (USD)', 'Message', 'Timestamp'];
  const rows = tips.map(tip => [
    tip.id,
    tip.tipperName,
    tip.amount,
    `"${(tip.message || '').replace(/"/g, '""')}"`,
    tip.timestamp,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "tips_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** Export tip history with optional columns (track, asset, USD, Stellar tx) */
export const exportTipHistoryToCSV = (tips: TipHistoryItem[]) => {
  const headers = [
    'ID',
    'Tipper',
    'Artist',
    'Amount',
    'Asset',
    'Amount (USD)',
    'Track',
    'Message',
    'Timestamp',
    'Stellar Tx',
  ];
  const rows = tips.map((tip) => [
    tip.id,
    tip.tipperName,
    tip.artistName ?? '',
    tip.amount,
    tip.assetCode ?? 'XLM',
    tip.usdAmount ?? tip.amount,
    tip.trackTitle ?? '',
    `"${(tip.message || '').replace(/"/g, '""')}"`,
    tip.timestamp,
    tip.stellarTxHash ?? '',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'tip_history.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
