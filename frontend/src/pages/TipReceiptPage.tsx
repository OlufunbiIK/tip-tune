import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Repeat,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { tipService } from '../services/tipService';
import type { TipReceipt } from '../types';
import {
  TransactionDetails,
  BlockchainProof,
  ReceiptQRCode,
  ReceiptPDFExport,
} from '../components/receipt';
import TipModal from '../components/tip/TipModal';
import { useWallet } from '../hooks/useWallet';

/* ------------------------------------------------------------------ */
/*  TipReceiptPage                                                     */
/* ------------------------------------------------------------------ */

const TipReceiptPage: React.FC = () => {
  const { tipId } = useParams<{ tipId: string }>();
  const navigate = useNavigate();
  const { publicKey, balance } = useWallet();

  /* ----- State ----- */
  const [receipt, setReceipt] = useState<TipReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const receiptContentRef = useRef<HTMLDivElement>(null);

  /* ----- Fetch receipt ----- */
  const fetchReceipt = useCallback(async () => {
    if (!tipId) {
      setError('No tip ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await tipService.getReceipt(tipId);
      setReceipt(data);
    } catch (err: any) {
      const message =
        err?.response?.status === 404
          ? 'Tip not found. It may have been removed or the ID is invalid.'
          : err?.message ?? 'Failed to load tip receipt.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [tipId]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  /* ----- Share receipt link ----- */
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const shareData: ShareData = {
      title: 'TipTune Receipt',
      text: receipt
        ? `Check out my tip of ${receipt.amount} ${receipt.assetCode} on TipTune!`
        : 'View tip receipt on TipTune',
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
    } catch {
      // User cancelled share sheet — no-op
    }
  }, [receipt]);

  /* ----- Tip Again handler ----- */
  const handleTipAgain = useCallback(() => {
    setShowTipModal(true);
  }, []);

  /* ----- Loading state ----- */
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" data-testid="receipt-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading receipt…</p>
        </div>
      </div>
    );
  }

  /* ----- Error state ----- */
  if (error || !receipt) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" data-testid="receipt-error">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-800">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-display font-semibold text-gray-900 dark:text-white">
            Receipt Unavailable
          </h2>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={fetchReceipt}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Derived values ---- */
  const walletBalance = balance
    ? {
        xlm: parseFloat(
          balance.find((b) => b.asset === 'native')?.balance ?? '0',
        ),
        usdc: parseFloat(
          balance.find((b) => b.asset.startsWith('USDC'))?.balance ?? '0',
        ),
      }
    : undefined;

  return (
    <>
      <div className="mx-auto max-w-3xl pb-12" data-testid="tip-receipt-page">
        {/* ---- Top bar ---- */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              data-testid="share-button"
            >
              {shareSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Share
                </>
              )}
            </button>

            <button
              onClick={fetchReceipt}
              className="rounded-lg border border-gray-300 p-1.5 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              aria-label="Refresh receipt"
              data-testid="refresh-button"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ---- Page heading ---- */}
        <header className="mb-6">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white sm:text-3xl">
            Tip Receipt
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Receipt ID:{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-700">
              {receipt.id}
            </code>
          </p>
        </header>

        {/* ---- Capturable receipt area ---- */}
        <div ref={receiptContentRef} className="space-y-6">
          {/* Transaction Details */}
          <TransactionDetails receipt={receipt} />

          {/* Blockchain Proof */}
          <BlockchainProof receipt={receipt} />

          {/* QR Code */}
          <ReceiptQRCode stellarTxHash={receipt.stellarTxHash} />
        </div>

        {/* ---- Export & Downloads (outside capture area) ---- */}
        <div className="mt-6 space-y-6">
          <ReceiptPDFExport receipt={receipt} receiptRef={receiptContentRef} />

          {/* ---- Actions ---- */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Tip Again */}
            {receipt.artist && (
              <button
                onClick={handleTipAgain}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-gold to-yellow-400 px-5 py-3 text-sm font-semibold text-gray-900 shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                data-testid="tip-again-button"
              >
                <Repeat className="h-4 w-4" />
                Tip Again
              </button>
            )}

            {/* Share link */}
            <button
              onClick={handleShare}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              data-testid="share-receipt-button"
            >
              <Link2 className="h-4 w-4" />
              Copy Receipt Link
            </button>
          </div>

          {/* Link back to history */}
          <div className="text-center">
            <Link
              to="/tips/history"
              className="text-sm font-medium text-primary-blue hover:underline"
            >
              ← View all tip history
            </Link>
          </div>
        </div>
      </div>

      {/* ---- Tip Again Modal ---- */}
      {receipt.artist && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          artistId={receipt.artist.id}
          artistName={receipt.artist.artistName}
          artistImage={receipt.artist.profileImage}
          walletBalance={walletBalance}
        />
      )}
    </>
  );
};

export default TipReceiptPage;
