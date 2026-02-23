import React, { useMemo, useRef, useState } from 'react';
import { X, Twitter, Instagram } from 'lucide-react';
import Modal from '../common/Modal';
import type { TipHistoryItem } from '../../types';
import ShareCardPreview from './ShareCardPreview';
import ShareCardDownload from './ShareCardDownload';

export interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tip: TipHistoryItem | null;
  variant: 'sent' | 'received';
}

const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  tip,
  variant,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [customMessage, setCustomMessage] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    if (!tip) return 'Artist';
    return variant === 'sent' ? tip.artistName ?? 'Artist' : tip.tipperName;
  }, [tip, variant]);

  const initialMessage = useMemo(() => {
    if (!tip) return '';
    if (tip.message) return tip.message;
    if (variant === 'sent') {
      return `Just tipped ${displayName} on TipTune ✨`;
    }
    return `I just received a tip on TipTune ✨`;
  }, [tip, variant, displayName]);

  // Keep text input controlled but seed from tip / variant
  const effectiveMessage = customMessage.length > 0 ? customMessage : initialMessage;

  const handleShareTwitter = () => {
    if (!tip) return;
    const text = effectiveMessage || `Just tipped ${displayName} on TipTune ✨`;
    const url = `${window.location.origin}/tips/history`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenInstagram = () => {
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
  };

  if (!tip) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Your Tip">
      <div className="space-y-6" data-testid="social-share-modal">
        {/* Preview */}
        <div className="border border-slate-800 rounded-2xl bg-slate-950/60 px-2 py-4">
          <ShareCardPreview
            ref={cardRef}
            tip={tip}
            variant={variant}
            theme={theme}
            customMessage={effectiveMessage}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-100">
              Card theme
            </span>
            <div className="inline-flex rounded-full bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  theme === 'dark'
                    ? 'bg-slate-950 text-white shadow'
                    : 'text-slate-300'
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-300'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <label
              htmlFor="share-message"
              className="text-sm font-medium text-slate-100"
            >
              Custom message
            </label>
            <textarea
              id="share-message"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue resize-none"
              placeholder={initialMessage}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              This message appears on the social card and in your tweet.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <ShareCardDownload cardRef={cardRef} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShareTwitter}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-sky-500 text-white hover:bg-sky-400 transition-colors"
              >
                <Twitter className="w-4 h-4" />
                Share on X
              </button>
              <button
                type="button"
                onClick={handleOpenInstagram}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:brightness-110 transition-colors"
              >
                <Instagram className="w-4 h-4" />
                Open Instagram
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Download the card and share it anywhere — X, Instagram Stories, or
          your favorite platform. Keep your wallet address private; this card
          only shows the artist, track, and tip details.
        </p>
      </div>
    </Modal>
  );
};

export default SocialShareModal;

