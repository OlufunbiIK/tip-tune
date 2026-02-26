import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Music,
  User,
  DollarSign,
  Coins,
  MessageSquare,
} from 'lucide-react';
import type { TipReceipt, TipReceiptStatus } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatter';
import { formatStellarAmount, truncateAddress } from '../../utils/stellar';

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  TipReceiptStatus,
  { label: string; className: string; dotColor: string }
> = {
  verified: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dotColor: 'bg-green-500',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
  reversed: {
    label: 'Reversed',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400',
    dotColor: 'bg-gray-500',
  },
};

export const StatusBadge: React.FC<{ status: TipReceiptStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
      data-testid="status-badge"
    >
      <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TransactionDetailsProps {
  receipt: TipReceipt;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ receipt }) => {
  const {
    amount,
    assetCode,
    fiatAmount,
    fiatCurrency,
    exchangeRate,
    message,
    senderAddress,
    receiverAddress,
    status,
    artist,
    track,
    type,
    createdAt,
    stellarTimestamp,
  } = receipt;

  const displayTimestamp = stellarTimestamp ?? createdAt;
  const usdValue =
    fiatAmount != null ? fiatAmount : exchangeRate != null ? amount * exchangeRate : null;

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      aria-labelledby="transaction-details-heading"
      data-testid="transaction-details"
    >
      <h2
        id="transaction-details-heading"
        className="mb-4 text-lg font-display font-semibold text-gray-900 dark:text-white"
      >
        Transaction Details
      </h2>

      {/* ---- Status + Amount hero ---- */}
      <div className="mb-5 flex flex-col items-center gap-3 rounded-xl bg-gray-50 p-5 dark:bg-gray-700/40">
        <StatusBadge status={status} />
        <p
          className="text-3xl font-bold text-gray-900 dark:text-white"
          data-testid="tip-amount"
        >
          {formatStellarAmount(amount)}{' '}
          <span className="text-lg font-medium text-primary-blue">{assetCode}</span>
        </p>
        {usdValue != null && (
          <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="tip-usd-value">
            ≈ {formatCurrency(usdValue)} {fiatCurrency ?? 'USD'}
          </p>
        )}
        {exchangeRate != null && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Rate: 1 {assetCode} = {formatCurrency(exchangeRate)}
          </p>
        )}
      </div>

      {/* ---- Detail rows ---- */}
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        {/* Type */}
        <DetailRow
          icon={<Coins className="h-4 w-4" />}
          label="Tip Type"
          value={type === 'track' ? 'Track Tip' : 'Artist Tip'}
        />

        {/* Asset */}
        <DetailRow
          icon={<DollarSign className="h-4 w-4" />}
          label="Asset"
          value={assetCode}
        />

        {/* Sender */}
        <DetailRow
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="From (Tipper)"
          value={truncateAddress(senderAddress, 6, 6)}
          title={senderAddress}
          mono
        />

        {/* Receiver */}
        <DetailRow
          icon={<ArrowDownLeft className="h-4 w-4" />}
          label="To (Artist)"
          value={
            artist?.artistName
              ? `${artist.artistName} (${truncateAddress(receiverAddress, 6, 6)})`
              : truncateAddress(receiverAddress, 6, 6)
          }
          title={receiverAddress}
        />

        {/* Artist profile summary */}
        {artist && (
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Artist"
            value={
              <div className="flex items-center gap-2">
                {artist.profileImage ? (
                  <img
                    src={artist.profileImage}
                    alt={artist.artistName}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-blue/20 text-xs font-semibold text-primary-blue">
                    {artist.artistName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{artist.artistName}</span>
                {artist.genre && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {artist.genre}
                  </span>
                )}
              </div>
            }
          />
        )}

        {/* Track */}
        {track && (
          <DetailRow
            icon={<Music className="h-4 w-4" />}
            label="Track"
            value={
              <div className="flex items-center gap-2">
                {track.coverArtUrl && (
                  <img
                    src={track.coverArtUrl}
                    alt={track.title}
                    className="h-6 w-6 rounded object-cover"
                  />
                )}
                <span>{track.title}</span>
              </div>
            }
          />
        )}

        {/* Message */}
        {message && (
          <DetailRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Message"
            value={<span className="italic text-gray-600 dark:text-gray-300">"{message}"</span>}
          />
        )}

        {/* Timestamp */}
        <DetailRow
          icon={null}
          label="Date & Time"
          value={formatDate(displayTimestamp)}
        />

        {/* Network fee note */}
        <DetailRow
          icon={null}
          label="Network Fee"
          value="0.00001 XLM (base fee)"
        />
      </dl>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  Internal: single detail row                                        */
/* ------------------------------------------------------------------ */

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  title?: string;
  mono?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, title, mono }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <dt className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      {icon}
      {label}
    </dt>
    <dd
      className={`text-right text-sm font-medium text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}
      title={title}
    >
      {value}
    </dd>
  </div>
);

export default TransactionDetails;
