import React from 'react';
import { useMerch } from '../../hooks/useMerch';
import MerchCard from './MerchCard';
import { MerchItem } from '../../types/merch';

export interface MerchShowcaseProps {
  artistId: string;
  artistSlug?: string;
  onOpenTip?: (context?: { item?: MerchItem }) => void; // integration point to existing tip modal
  title?: string;
}

export const MerchShowcase: React.FC<MerchShowcaseProps> = ({ artistId, artistSlug, onOpenTip, title = 'Merch' }) => {
  const { items, toggleSave, isSaved } = useMerch(artistId);

  if (!items.length) return null;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      </div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Hide scrollbar in WebKit */}
        <style>{`.hide-scroll::-webkit-scrollbar{display:none}`}</style>
        {items.map((it) => (
          <MerchCard
            key={it.id}
            item={it}
            artistSlug={artistSlug}
            onTipInstead={(item) => onOpenTip?.({ item })}
            onSaveToggle={toggleSave}
            isSaved={isSaved(it.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default MerchShowcase;
