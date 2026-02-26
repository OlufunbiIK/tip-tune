/**
 * GiftReceipt — full-page receipt for a gifted tip.
 * Route: /gifts/:giftId
 *
 * Shows:
 *  - Gift amount, asset, and credited user
 *  - Giver identity (hidden when anonymous)
 *  - Artist and track info
 *  - Shareable URL + copy button
 *  - Link back to Stellar Explorer
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Copy,
  Check,
  ExternalLink,
  Share2,
  EyeOff,
  Music,
  User,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import GiftTag from './GiftTag';
import type { GiftReceipt as GiftReceiptType } from '../../types';

/* ─── Mock fetcher (replace with real API call) ─────────────────────────── */

async function fetchGiftReceipt(giftId: string): Promise<GiftReceiptType> {
  await new Promise((r) => setTimeout(r, 900));

  // Return plausible mock data
  return {
    giftId,
    isRecipient: true,
    isGiver: false,
    gift: {
      id: giftId,
      recipient: { id: 'u2', username: 'music_lover', displayName: 'Music Lover', avatarUrl: 'https://i.pravatar.cc/80?u=music_lover' },
      giver: { id: 'u1', username: 'stellar_fan', displayName: 'Stellar Fan', avatarUrl: 'https://i.pravatar.cc/80?u=stellar_fan' },
      isAnonymous: false,
      giftNote: 'You always talk about this artist — enjoy the tip! 🎶',
      artistMessage: 'Amazing music, keep it up!',
      status: 'delivered',
      createdAt: new Date().toISOString(),
      shareUrl: window.location.href,
    },
    tip: {
      id: `tip-${giftId}`,
      tipperName: 'Music Lover',
      tipperAvatar: 'https://i.pravatar.cc/80?u=music_lover',
      amount: 25,
      message: 'Amazing music, keep it up!',
      timestamp: new Date().toISOString(),
      assetCode: 'XLM',
      usdAmount: 2.75,
      trackTitle: 'Neon Dreams',
      artistName: 'Aria Nova',
      stellarTxHash: 'mock-stellar-hash-' + giftId,
    },
  };
}

/* ─── Component ──────────────────────────────────────────────────────────── */

const GiftReceipt: React.FC = () => {
  const { giftId } = useParams<{ giftId: string }>();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState<GiftReceiptType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    if (!giftId) {
      setError('No gift ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchGiftReceipt(giftId)
      .then(setReceipt)
      .catch((err) => setError(err?.message ?? 'Failed to load gift receipt.'))
      .finally(() => setIsLoading(false));
  }, [giftId]);

  /* ── Copy link ── */
  const handleCopyLink = useCallback(async () => {
    const url = receipt?.gift.shareUrl ?? window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent */ }
  }, [receipt]);

  /* ── Native share ── */
  const handleShare = useCallback(async () => {
    const url = receipt?.gift.shareUrl ?? window.location.href;
    const shareData: ShareData = {
      title: 'TipTune Gift Receipt',
      text: receipt
        ? `${receipt.gift.giver?.displayName ?? 'Someone'} gifted ${receipt.tip.amount} ${receipt.tip.assetCode} to ${receipt.gift.recipient.displayName} on TipTune!`
        : 'Check out this TipTune gift!',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      }
    } catch { /* user cancelled */ }
  }, [receipt]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
        <p className="text-sm">Loading gift receipt…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !receipt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <AlertTriangle className="h-12 w-12 text-yellow-400" />
        <p className="text-lg font-semibold text-white">
          {error ?? 'Gift receipt not found'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const { gift, tip } = receipt;
  const giverName = !gift.isAnonymous
    ? gift.giver?.displayName ?? `@${gift.giver?.username}`
    : null;
  const recipientName = gift.recipient.displayName ?? `@${gift.recipient.username}`;
  const stellarUrl = tip.stellarTxHash
    ? `https://stellar.expert/explorer/testnet/tx/${tip.stellarTxHash}`
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6" data-testid="gift-receipt-page">
      {/* ── Back nav ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-[#0B1C2D] p-6 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
          <Gift className="h-8 w-8 text-purple-300" />
        </div>

        <div>
          <p className="text-gray-400 text-sm mb-1">Gifted tip</p>
          <p className="text-4xl font-mono font-bold text-white">
            {tip.amount} <span className="text-purple-300">{tip.assetCode}</span>
          </p>
          {tip.usdAmount != null && (
            <p className="text-sm text-gray-400 mt-1">≈ ${tip.usdAmount.toFixed(2)} USD</p>
          )}
        </div>

        <GiftTag gift={gift} variant={receipt.isRecipient ? 'received' : receipt.isGiver ? 'given' : 'artist'} className="mx-auto" />

        {/* Notification banner for recipient */}
        {receipt.isRecipient && (
          <div className="rounded-xl border border-purple-400/30 bg-purple-900/20 px-4 py-3 text-sm text-purple-200">
            🎁 {giverName ? `${giverName} sent` : 'Someone sent'} this gift to you
            {gift.giftNote && (
              <p className="mt-1.5 text-purple-100 font-medium italic">"{gift.giftNote}"</p>
            )}
          </div>
        )}
      </div>

      {/* ── Parties ── */}
      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5 text-sm" data-testid="gift-parties">
        {/* Giver */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 rounded-full bg-purple-800 flex items-center justify-center text-purple-300 flex-shrink-0">
            {gift.isAnonymous ? <EyeOff className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-xs">Paid by</p>
            {gift.isAnonymous ? (
              <p className="font-medium text-gray-400 italic">Anonymous</p>
            ) : (
              <p className="font-medium text-white truncate">
                {giverName}
                {gift.giver?.username && <span className="text-gray-400 ml-1">@{gift.giver.username}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Recipient */}
        <div className="flex items-center gap-3 px-4 py-3">
          {gift.recipient.avatarUrl ? (
            <img src={gift.recipient.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-800 flex items-center justify-center text-blue-300 flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-xs">Credited to (tipper)</p>
            <p className="font-medium text-white truncate">
              {recipientName}
              <span className="text-gray-400 ml-1">@{gift.recipient.username}</span>
            </p>
          </div>
        </div>

        {/* Track */}
        {tip.trackTitle && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 flex-shrink-0">
              <Music className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-xs">Track</p>
              <p className="font-medium text-white truncate">{tip.trackTitle}</p>
              {tip.artistName && <p className="text-xs text-gray-400 truncate">by {tip.artistName}</p>}
            </div>
          </div>
        )}

        {/* Artist message */}
        {gift.artistMessage && (
          <div className="px-4 py-3">
            <p className="text-gray-400 text-xs mb-1">Message to artist</p>
            <p className="text-white text-sm italic">"{gift.artistMessage}"</p>
          </div>
        )}
      </div>

      {/* ── Timestamp & Stellar ── */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm space-y-2">
        <div className="flex justify-between text-gray-400">
          <span>Date</span>
          <span className="text-white">{new Date(gift.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Status</span>
          <span className={`font-medium capitalize ${gift.status === 'delivered' ? 'text-green-400' : gift.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
            {gift.status}
          </span>
        </div>
        {stellarUrl && (
          <a
            href={stellarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-medium transition-colors"
            data-testid="stellar-link"
          >
            View on Stellar Explorer
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="space-y-2" data-testid="gift-receipt-actions">
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {shareSuccess ? 'Link copied!' : 'Share Receipt'}
        </button>
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
          data-testid="copy-link-btn"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <Link
          to="/tips/history"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-gray-400 hover:text-white hover:border-white/20 transition-colors text-sm"
        >
          View Tip History
        </Link>
      </div>
    </div>
  );
};

export default GiftReceipt;
