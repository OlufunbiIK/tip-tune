import React, { forwardRef } from 'react';
import ShareCard, { ShareCardProps } from './ShareCard';
import type { TipHistoryItem } from '../../types';

export interface ShareCardPreviewProps {
  tip: TipHistoryItem;
  variant: 'sent' | 'received';
  theme?: 'dark' | 'light';
  customMessage?: string;
}

const ShareCardPreview = forwardRef<HTMLDivElement, ShareCardPreviewProps>(
  ({ tip, variant, theme = 'dark', customMessage }, ref) => {
    const displayName =
      variant === 'sent' ? tip.artistName ?? 'Artist' : tip.tipperName;

    const shareCardProps: ShareCardProps = {
      artistName: displayName,
      trackTitle: tip.trackTitle,
      tipAmount: tip.amount,
      assetCode: tip.assetCode ?? 'XLM',
      usdAmount: tip.usdAmount,
      message: customMessage && customMessage.trim().length > 0 ? customMessage : tip.message,
      tipperName: variant === 'received' ? tip.tipperName : 'You',
      tipDate: tip.timestamp,
      theme,
    };

    return (
      <div ref={ref} className="flex items-center justify-center">
        <ShareCard {...shareCardProps} />
      </div>
    );
  }
);

ShareCardPreview.displayName = 'ShareCardPreview';

export default ShareCardPreview;

