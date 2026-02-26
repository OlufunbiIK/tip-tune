/**
 * GiftTag — small label displayed on tip cards when a tip was sent as a gift.
 * Variants:
 *  • "given"    — shown to the payer (you gifted this)
 *  • "received" — shown to the credited friend (someone gifted you)
 *  • "artist"   — shown in the artist's feed ("Gift from @tipper")
 */

import React from 'react';
import { Gift } from 'lucide-react';
import type { GiftMeta } from '../../types';

export interface GiftTagProps {
  gift: GiftMeta;
  /** Which perspective to render the label from */
  variant?: 'given' | 'received' | 'artist';
  className?: string;
}

const GiftTag: React.FC<GiftTagProps> = ({ gift, variant = 'artist', className = '' }) => {
  const recipientName = gift.recipient?.displayName ?? `@${gift.recipient?.username}`;
  const giverName = !gift.isAnonymous
    ? gift.giver?.displayName ?? `@${gift.giver?.username}`
    : null;

  let label: string;
  switch (variant) {
    case 'given':
      label = `You gifted this to ${recipientName}`;
      break;
    case 'received':
      label = giverName ? `${giverName} sent this gift for you` : 'Someone gifted this to you';
      break;
    case 'artist':
    default:
      label = giverName
        ? `Gift — credited to ${recipientName} by ${giverName}`
        : `Gift — credited to ${recipientName}`;
      break;
  }

  return (
    <span
      data-testid="gift-tag"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold
        bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300
        border border-purple-200 dark:border-purple-700/50 select-none ${className}`}
      title={label}
    >
      <Gift className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[18ch]">{label}</span>
    </span>
  );
};

export default GiftTag;
