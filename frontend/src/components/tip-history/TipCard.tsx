import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Receipt, Gift } from 'lucide-react';
import type { TipHistoryItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatter';
import GiftTag from '../tip/GiftTag';

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

interface TipCardProps {
  tip: TipHistoryItem;
  /** 'sent' | 'received' – determines which party to emphasize (artist vs tipper) */
  variant: 'sent' | 'received';
  /** When tip.gift is present, this context hint adjusts the GiftTag label */
  giftVariant?: 'given' | 'received' | 'artist';
  onShare?: (tip: TipHistoryItem, variant: 'sent' | 'received') => void;
}

const TipCard: React.FC<TipCardProps> = ({ tip, variant, giftVariant, onShare }) => {
  const displayName = variant === 'sent' ? tip.artistName ?? 'Artist' : tip.tipperName;
  const avatarUrl = variant === 'received' ? tip.tipperAvatar : undefined;
  const amountXlm = tip.assetCode ? `${Number(tip.amount).toFixed(2)} ${tip.assetCode}` : formatCurrency(tip.amount);
  const usdDisplay = tip.usdAmount != null ? formatCurrency(tip.usdAmount) : null;
  const stellarUrl = tip.stellarTxHash ? `${STELLAR_EXPLORER_BASE}/${tip.stellarTxHash}` : null;

  return (
    <article
      className={`bg-white rounded-xl shadow-md border overflow-hidden hover:shadow-lg transition-shadow ${
        tip.gift ? 'border-purple-200 dark:border-purple-800/50' : 'border-gray-100'
      }`}
      data-testid="tip-card"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Artist/User info */}
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-blue to-secondary-indigo flex items-center justify-center flex-shrink-0 text-white font-display font-semibold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-semibold text-gray-900 truncate">
                {displayName}
              </p>
              {tip.trackTitle && (
                <p className="text-sm text-gray-500 truncate" title={tip.trackTitle}>
                  {tip.trackTitle}
                </p>
              )}
              {!tip.trackTitle && tip.trackId && (
                <p className="text-sm text-gray-500">Track</p>
              )}
            </div>
          </div>

          {/* Amount and date */}
          <div className="flex flex-col sm:items-end gap-1 sm:ml-auto">
            <p className="font-mono font-bold text-gray-900">
              {amountXlm}
            </p>
            {usdDisplay != null && (
              <p className="text-sm text-gray-500">{usdDisplay}</p>
            )}
            <p className="text-sm text-gray-500" title={tip.timestamp}>
              {formatDate(tip.timestamp)}
            </p>
          </div>
        </div>

        {/* Gift tag — shown when this tip was sent as a gift */}
        {tip.gift && (
          <div className="mt-3">
            <GiftTag gift={tip.gift} variant={giftVariant ?? (variant === 'sent' ? 'given' : 'received')} />
          </div>
        )}

        {tip.message && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{tip.message}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {stellarUrl && (
            <a
              href={stellarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-blue hover:text-secondary-indigo"
              data-testid="stellar-tx-link"
            >
              View on Stellar Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <Link
            to={`/tips/${tip.id}/receipt`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-blue hover:text-secondary-indigo"
            data-testid="view-receipt-link"
          >
            View Receipt
            <Receipt className="h-4 w-4" />
          </Link>

          {/* Gift receipt link */}
          {tip.gift && (
            <Link
              to={`/gifts/${tip.gift.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-500 hover:text-purple-700"
              data-testid="view-gift-receipt-link"
            >
              <Gift className="h-4 w-4" />
              View Gift Receipt
            </Link>
          )}

          {onShare && (
            <button
              type="button"
              onClick={() => onShare(tip, variant)}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-blue"
              data-testid="tip-share-button"
            >
              Share card
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default TipCard;
