/**
 * GiftTipModal — "Gift a Tip on Behalf Of" flow
 *
 * Steps
 * ──────
 *  1. amount      – pick tip amount & asset
 *  2. recipient   – search & select the friend to credit
 *  3. messages    – artist message (public) + gift note (private to recipient)
 *  4. options     – anonymous toggle + review summary
 *  5. loading     – tx processing
 *  6. success     – confirmation + link to gift receipt
 */

import React, { useState, useCallback, useEffect } from 'react';
import { animated, useSpring } from 'react-spring';
import { X, Gift, ChevronLeft, Eye, EyeOff, Check, Copy, ExternalLink } from 'lucide-react';
import { useReducedMotion, getSpringConfig } from '../../utils/animationUtils';
import AmountSelector from './AmountSelector';
import AssetToggle from './AssetToggle';
import TipMessage from './TipMessage';
import GiftRecipientSearch from './GiftRecipientSearch';
import ConfettiExplosion from './ConfettiExplosion';
import type { GiftUserRef } from '../../types';

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type GiftTipStep =
  | 'amount'
  | 'recipient'
  | 'messages'
  | 'options'
  | 'loading'
  | 'success';

export interface GiftTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
  artistImage?: string;
  /** Called when the gift tip is confirmed; resolve with a receipt/giftId */
  onGiftSuccess?: (payload: GiftTipPayload) => Promise<{ giftId: string; shareUrl: string }>;
  walletBalance?: { xlm: number; usdc: number };
  xlmUsdRate?: number;
  trackId?: string;
}

export interface GiftTipPayload {
  artistId: string;
  trackId?: string;
  amount: number;
  currency: 'XLM' | 'USDC';
  recipient: GiftUserRef;
  artistMessage: string;
  giftNote: string;
  isAnonymous: boolean;
}

const ORDERED_STEPS: Array<Exclude<GiftTipStep, 'loading' | 'success'>> = [
  'amount',
  'recipient',
  'messages',
  'options',
];

/* ─── Component ──────────────────────────────────────────────────────────── */

const GiftTipModal: React.FC<GiftTipModalProps> = ({
  isOpen,
  onClose,
  artistId,
  artistName,
  artistImage,
  onGiftSuccess,
  walletBalance = { xlm: 1000, usdc: 100 },
  xlmUsdRate = 0.11,
  trackId,
}) => {
  const reducedMotion = useReducedMotion();

  /* ── State ── */
  const [step, setStep] = useState<GiftTipStep>('amount');
  const [tipAmount, setTipAmount] = useState(5);
  const [currency, setCurrency] = useState<'XLM' | 'USDC'>('XLM');
  const [recipient, setRecipient] = useState<GiftUserRef | null>(null);
  const [artistMessage, setArtistMessage] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giftResult, setGiftResult] = useState<{ giftId: string; shareUrl: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  /* ── Reset state on close ── */
  const resetState = useCallback(() => {
    setStep('amount');
    setTipAmount(5);
    setCurrency('XLM');
    setRecipient(null);
    setArtistMessage('');
    setGiftNote('');
    setIsAnonymous(false);
    setError(null);
    setGiftResult(null);
    setCopiedLink(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  /* ── Keyboard close ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  /* ── Navigation ── */
  const currentStepIndex = ORDERED_STEPS.indexOf(step as any);

  const handleNext = useCallback(() => {
    if (step === 'amount') { setStep('recipient'); return; }
    if (step === 'recipient') {
      if (!recipient) { setError('Please select a recipient.'); return; }
      setError(null);
      setStep('messages');
      return;
    }
    if (step === 'messages') { setStep('options'); return; }
  }, [step, recipient]);

  const handleBack = useCallback(() => {
    if (step === 'recipient') setStep('amount');
    else if (step === 'messages') setStep('recipient');
    else if (step === 'options') setStep('messages');
  }, [step]);

  /* ── Confirm gift ── */
  const handleConfirm = useCallback(async () => {
    if (!recipient) return;
    setStep('loading');
    setError(null);
    try {
      const payload: GiftTipPayload = {
        artistId,
        trackId,
        amount: tipAmount,
        currency,
        recipient,
        artistMessage,
        giftNote,
        isAnonymous,
      };

      // Fallback mock when no handler provided
      const result = onGiftSuccess
        ? await onGiftSuccess(payload)
        : await mockGiftTip(payload);

      setGiftResult(result);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send gift tip');
      setStep('options');
    }
  }, [recipient, artistId, trackId, tipAmount, currency, artistMessage, giftNote, isAnonymous, onGiftSuccess]);

  /* ── Copy share link ── */
  const handleCopyLink = useCallback(async () => {
    const url = giftResult?.shareUrl ?? window.location.origin + `/gifts/${giftResult?.giftId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch { /* silent */ }
  }, [giftResult]);

  /* ── Animations ── */
  const backdropSpring = useSpring({
    opacity: isOpen ? 1 : 0,
    config: getSpringConfig('gentle'),
    immediate: reducedMotion,
  });

  const sheetSpring = useSpring({
    transform: isOpen ? 'translateY(0%)' : 'translateY(100%)',
    opacity: isOpen ? 1 : 0,
    config: getSpringConfig('gentle'),
    immediate: reducedMotion,
  });

  if (!isOpen) return null;

  /* ── USD equivalent label ── */
  const usdEquiv = currency === 'XLM'
    ? `≈ $${(tipAmount * xlmUsdRate).toFixed(2)} USD`
    : `$${tipAmount.toFixed(2)} USD`;

  /* ── Render ── */
  return (
    <animated.div
      style={{ ...backdropSpring, position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={handleClose}
      data-testid="gift-tip-modal-backdrop"
    >
      <animated.div
        style={{
          ...sheetSpring,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '92vh',
          borderRadius: '24px 24px 0 0',
          backgroundColor: '#0B1C2D',
          borderTop: '1px solid rgba(147,51,234,0.3)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Gift a Tip"
        data-testid="gift-tip-modal"
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-[#0B1C2D] border-b border-white/5 px-5 pt-5 pb-4">
          {/* Drag handle */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && step !== 'loading' && step !== 'success' && (
                <button
                  onClick={handleBack}
                  aria-label="Go back"
                  className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-display font-bold text-white">
                  {step === 'success' ? 'Gift Sent! 🎁' : step === 'loading' ? 'Sending Gift…' : 'Gift a Tip'}
                </h2>
              </div>
            </div>
            {step !== 'loading' && (
              <button onClick={handleClose} aria-label="Close" className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Progress indicators */}
          {!['loading', 'success'].includes(step) && (
            <div className="flex gap-1.5 mt-3">
              {ORDERED_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i <= currentStepIndex ? 'bg-purple-500' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 space-y-5">

          {/* Artist info chip */}
          {!['loading', 'success'].includes(step) && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              {artistImage ? (
                <img src={artistImage} alt={artistName} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {artistName.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Tipping</p>
                <p className="font-semibold text-white">{artistName}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-400">{currency}</p>
                <p className="font-mono font-bold text-purple-300">{tipAmount} {currency}</p>
                <p className="text-xs text-gray-500">{usdEquiv}</p>
              </div>
            </div>
          )}

          {/* ── STEP: amount ── */}
          {step === 'amount' && (
            <div className="space-y-4" data-testid="step-amount">
              <AssetToggle currency={currency} onToggle={setCurrency} />
              <AmountSelector
                value={tipAmount}
                onAmountChange={setTipAmount}
                currency={currency}
                walletBalance={walletBalance}
                xlmUsdRate={xlmUsdRate}
              />
            </div>
          )}

          {/* ── STEP: recipient ── */}
          {step === 'recipient' && (
            <div className="space-y-3" data-testid="step-recipient">
              <p className="text-sm text-gray-300">
                Search for a friend to publicly credit for this tip. They will receive a notification and the artist will see them as the tipper.
              </p>
              <GiftRecipientSearch value={recipient} onChange={setRecipient} />
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}

          {/* ── STEP: messages ── */}
          {step === 'messages' && (
            <div className="space-y-5" data-testid="step-messages">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Message to artist <span className="text-gray-500">(public)</span>
                </label>
                <TipMessage
                  value={artistMessage}
                  onChange={setArtistMessage}
                  placeholder={`Say something to ${artistName}…`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Gift note to <span className="text-purple-300">@{recipient?.username}</span>{' '}
                  <span className="text-gray-500">(private)</span>
                </label>
                <TipMessage
                  value={giftNote}
                  onChange={setGiftNote}
                  placeholder="Let your friend know why you gifted this…"
                />
              </div>
            </div>
          )}

          {/* ── STEP: options / review ── */}
          {step === 'options' && recipient && (
            <div className="space-y-4" data-testid="step-options">
              {/* Review card */}
              <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5 text-sm">
                <ReviewRow label="Tip amount" value={`${tipAmount} ${currency} (${usdEquiv})`} />
                <ReviewRow label="Artist" value={artistName} />
                <ReviewRow label="Credited to" value={`${recipient.displayName ?? recipient.username} (@${recipient.username})`} />
                {artistMessage && <ReviewRow label="Artist message" value={artistMessage} />}
                {giftNote && <ReviewRow label="Gift note" value={giftNote} isProtected />}
              </div>

              {/* Anonymous toggle */}
              <button
                type="button"
                onClick={() => setIsAnonymous((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl border border-white/10
                  bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors group"
                data-testid="anonymous-toggle"
              >
                <div className="flex items-center gap-3">
                  {isAnonymous ? (
                    <EyeOff className="h-5 w-5 text-purple-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 group-hover:text-purple-300" />
                  )}
                  <div className="text-left">
                    <p className={`font-medium ${isAnonymous ? 'text-purple-300' : 'text-white'}`}>
                      Anonymous gifting
                    </p>
                    <p className="text-xs text-gray-400">
                      {isAnonymous
                        ? 'Your identity is hidden from the artist and recipient'
                        : 'Your name will appear in the gift receipt'}
                    </p>
                  </div>
                </div>
                <div
                  className={`h-6 w-11 rounded-full transition-all duration-200 flex items-center ${
                    isAnonymous ? 'bg-purple-500 justify-end' : 'bg-white/20 justify-start'
                  } px-0.5`}
                >
                  <div className="h-5 w-5 rounded-full bg-white shadow transition-all duration-200" />
                </div>
              </button>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </div>
          )}

          {/* ── STEP: loading ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4" data-testid="step-loading">
              <div className="relative">
                <Gift className="h-14 w-14 text-purple-400" />
                <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-50" />
              </div>
              <p className="text-lg font-semibold text-white animate-pulse">Sending your gift tip…</p>
              <p className="text-sm text-gray-400">Processing on Stellar network</p>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && giftResult && recipient && (
            <div className="flex flex-col items-center text-center gap-5 py-4" data-testid="step-success">
              <ConfettiExplosion active />
              <div className="h-16 w-16 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                <Check className="h-8 w-8 text-purple-300" />
              </div>
              <div>
                <p className="text-xl font-display font-bold text-white">Gift Sent! 🎁</p>
                <p className="text-sm text-gray-300 mt-1">
                  {tipAmount} {currency} has been credited to{' '}
                  <span className="text-purple-300 font-semibold">
                    {recipient.displayName ?? `@${recipient.username}`}
                  </span>
                  {' '}and {artistName} has been notified.
                </p>
              </div>

              {/* Share / receipt actions */}
              <div className="w-full space-y-2">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/50
                    bg-purple-500/10 px-4 py-3 text-purple-300 hover:bg-purple-500/20 transition-colors font-medium"
                  data-testid="copy-gift-link"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? 'Link copied!' : 'Copy shareable link'}
                </button>
                <a
                  href={giftResult.shareUrl || `/gifts/${giftResult.giftId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3
                    text-white hover:bg-purple-700 transition-colors font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Gift Receipt
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer CTA (only on linear steps) ── */}
        {!['loading', 'success'].includes(step) && (
          <div className="sticky bottom-0 border-t border-white/5 bg-[#0B1C2D] px-5 py-4 pb-safe">
            {step === 'options' ? (
              <button
                onClick={handleConfirm}
                disabled={!recipient}
                className="w-full rounded-xl bg-purple-600 py-3.5 font-display font-bold text-white
                  hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                data-testid="confirm-gift-btn"
              >
                <Gift className="h-5 w-5" />
                Confirm Gift Tip
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={step === 'recipient' && !recipient}
                className="w-full rounded-xl bg-purple-600 py-3.5 font-display font-bold text-white
                  hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                data-testid="next-step-btn"
              >
                {step === 'amount' ? 'Choose Recipient →' : step === 'recipient' ? 'Add Messages →' : 'Review Gift →'}
              </button>
            )}
          </div>
        )}
      </animated.div>
    </animated.div>
  );
};

/* ─── Helper sub-components ──────────────────────────────────────────────── */

const ReviewRow: React.FC<{ label: string; value: string; isProtected?: boolean }> = ({
  label,
  value,
  isProtected,
}) => (
  <div className="flex justify-between gap-3 px-4 py-2.5">
    <span className="text-gray-400 flex-shrink-0">{label}</span>
    <span className={`text-right font-medium ${isProtected ? 'text-purple-300' : 'text-white'} truncate max-w-[60%]`}>
      {isProtected ? '🔒 ' : ''}{value}
    </span>
  </div>
);

/* ─── Mock gift tip handler ──────────────────────────────────────────────── */

async function mockGiftTip(_payload: GiftTipPayload): Promise<{ giftId: string; shareUrl: string }> {
  await new Promise((r) => setTimeout(r, 1800));
  const giftId = `gift-${Date.now()}`;
  return {
    giftId,
    shareUrl: `${window.location.origin}/gifts/${giftId}`,
  };
}

export default GiftTipModal;
