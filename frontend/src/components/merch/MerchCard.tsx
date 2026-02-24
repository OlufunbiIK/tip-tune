import React, { useMemo } from 'react';
import { MerchItem } from '../../types/merch';

export interface MerchCardProps {
  item: MerchItem;
  artistSlug?: string; // for UTM tracking
  onTipInstead?: (item: MerchItem) => void;
  onSaveToggle?: (id: string) => void;
  isSaved?: boolean;
}

function addUtm(url: string, params: Record<string, string>) {
  try {
    const u = new URL(url);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  } catch {
    // fallback concat
    const q = new URLSearchParams(params).toString();
    return url.includes('?') ? `${url}&${q}` : `${url}?${q}`;
  }
}

export const MerchCard: React.FC<MerchCardProps> = ({ item, artistSlug, onTipInstead, onSaveToggle, isSaved }) => {
  const purchaseUrl = useMemo(() => addUtm(item.externalUrl, {
    utm_source: 'tip-tune',
    utm_medium: 'artist_merch',
    utm_campaign: artistSlug || item.artistId,
  }), [item.externalUrl, artistSlug, item.artistId]);

  const badge = item.status === 'soldout' ? 'Sold Out' : item.status === 'limited' ? 'Limited' : null;

  return (
    <div className="group relative w-64 shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-square w-full overflow-hidden">
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        {badge && (
          <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-semibold ${badge === 'Sold Out' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>
            {badge}
          </span>
        )}
        <button
          type="button"
          aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={() => onSaveToggle && onSaveToggle(item.id)}
          className={`absolute right-2 top-2 rounded-full bg-white/80 p-2 text-sm shadow backdrop-blur transition hover:bg-white dark:bg-zinc-800/70 ${isSaved ? 'text-pink-600' : 'text-zinc-700 dark:text-zinc-200'}`}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100" title={item.name}>{item.name}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.price}</p>
          </div>
          <button
            type="button"
            aria-label="Share merch"
            onClick={() => {
              const shareData = { title: item.name, text: `${item.name} — ${item.price}`, url: purchaseUrl };
              if (navigator.share) {
                navigator.share(shareData).catch(() => {
                  navigator.clipboard?.writeText(purchaseUrl);
                  alert('Link copied to clipboard');
                });
              } else {
                navigator.clipboard?.writeText(purchaseUrl);
                alert('Link copied to clipboard');
              }
            }}
            className="rounded-full p-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ↗
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={purchaseUrl}
            target="_blank" rel="noopener noreferrer"
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${item.status === 'soldout' ? 'pointer-events-none bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100'}`}
          >
            {item.status === 'soldout' ? 'Unavailable' : 'Buy'}
          </a>
          <button
            type="button"
            onClick={() => onTipInstead && onTipInstead(item)}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Tip instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default MerchCard;
