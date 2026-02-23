import React from 'react';

export interface ShareCardProps {
  artistName: string;
  trackTitle?: string;
  tipAmount: number;
  assetCode?: string;
  usdAmount?: number;
  message?: string;
  tipperName?: string;
  tipDate?: string;
  artistImage?: string;
  theme?: 'dark' | 'light';
}

const ShareCard: React.FC<ShareCardProps> = ({
  artistName,
  trackTitle,
  tipAmount,
  assetCode = 'XLM',
  usdAmount,
  message,
  tipperName,
  tipDate,
  artistImage,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const formattedDate = tipDate
    ? new Date(tipDate).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={`relative w-full max-w-[600px] aspect-[1200/630] rounded-3xl overflow-hidden shadow-2xl border ${
        isDark ? 'border-blue-500/30 bg-slate-950' : 'border-slate-200 bg-white'
      }`}
      data-testid="share-card"
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
            : 'bg-gradient-to-br from-white via-slate-50 to-slate-100'
        }`}
      />

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative z-10 h-full px-10 py-8 flex flex-col justify-between">
        {/* Top: context */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xl">
              {artistImage ? (
                <img
                  src={artistImage}
                  alt={artistName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{artistName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold tracking-[0.2em] uppercase ${
                  isDark ? 'text-cyan-300/80' : 'text-blue-600/80'
                }`}
              >
                Proof of Support
              </p>
              <h1
                className={`mt-1 text-2xl font-black tracking-tight truncate ${
                  isDark
                    ? 'text-white'
                    : 'bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'
                }`}
                title={artistName}
              >
                {artistName}
              </h1>
              {trackTitle && (
                <p
                  className={`mt-1 text-sm truncate ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                  title={trackTitle}
                >
                  Track · <span className="font-medium">{trackTitle}</span>
                </p>
              )}
            </div>
          </div>

          {formattedDate && (
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                isDark
                  ? 'bg-white/5 text-slate-200 border border-white/10'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {formattedDate}
            </div>
          )}
        </div>

        {/* Middle: tip info & message */}
        <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p
              className={`text-sm font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {tipperName
                ? `${tipperName} just tipped`
                : 'A supporter just tipped'}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <p
                className={`text-4xl md:text-5xl font-black tracking-tight ${
                  isDark
                    ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent'
                }`}
              >
                {tipAmount.toFixed(2)} {assetCode}
              </p>
              {usdAmount != null && (
                <p
                  className={`mb-1 text-sm font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  ≈ ${usdAmount.toFixed(2)} USD
                </p>
              )}
            </div>
          </div>

          {message && (
            <div
              className={`max-w-sm rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                isDark
                  ? 'border-slate-700 bg-slate-900/80 text-slate-100'
                  : 'border-slate-200 bg-white/90 text-slate-700'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em] mb-1 font-semibold text-slate-400">
                Message
              </p>
              <p className="line-clamp-3 break-words">&ldquo;{message}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Bottom: branding */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center justify-center rounded-xl px-3 py-1 text-xs font-semibold ${
                isDark
                  ? 'bg-slate-900/80 text-slate-100 border border-slate-700'
                  : 'bg-white text-slate-800 border border-slate-200'
              }`}
            >
              <span className="mr-1.5 text-amber-400">🪙</span>
              TipTune
            </div>
            <span
              className={`text-xs font-medium tracking-[0.18em] uppercase ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              ×
            </span>
            <div
              className={`inline-flex items-center justify-center rounded-xl px-3 py-1 text-xs font-semibold ${
                isDark
                  ? 'bg-slate-900/80 text-cyan-300 border border-cyan-500/40'
                  : 'bg-white text-cyan-700 border border-cyan-300'
              }`}
            >
              <span className="mr-1.5">✦</span>
              Powered by Stellar
            </div>
          </div>

          <p
            className={`text-[11px] font-medium tracking-[0.26em] uppercase ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            tiptune.fm/support
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;

