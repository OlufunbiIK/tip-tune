import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Play, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { SongRequest } from './types';

export interface RequestCardProps {
  request: SongRequest;
  onAccept?: () => void;
  onDecline?: () => void;
  onPlay?: () => void;
}

const getRemainingSeconds = (expiresAt: string) => {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((expiry - now) / 1000));
};

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onAccept,
  onDecline,
  onPlay,
}) => {
  const [remaining, setRemaining] = useState(() =>
    getRemainingSeconds(request.expiresAt)
  );

  const isExpired = remaining === 0 || request.status === 'expired';

  useEffect(() => {
    if (isExpired || request.status !== 'pending') return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          window.clearInterval(id);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [isExpired, request.status]);

  const statusLabel = useMemo(() => {
    if (isExpired) return 'Expired';
    switch (request.status) {
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      case 'played':
        return 'Played';
      default:
        return 'Pending';
    }
  }, [isExpired, request.status]);

  return (
    <article
      className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-100"
      data-testid="request-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold">
          {request.fanAvatar ? (
            <img
              src={request.fanAvatar}
              alt={request.fanName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            request.fanName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">{request.fanName}</p>
            <span className="text-xs text-slate-400">{statusLabel}</span>
          </div>
          <p className="truncate text-xs text-slate-400">
            Requested: <span className="font-medium">{request.trackTitle}</span>
          </p>
          <p className="text-xs text-amber-300">
            {request.tipAmount.toFixed(2)} {request.assetCode}
          </p>
          {request.message && (
            <p className="line-clamp-2 text-xs text-slate-300">
              &ldquo;{request.message}&rdquo;
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          {isExpired ? (
            <span>Expired</span>
          ) : (
            <span>Expires in {formatCountdown(remaining)}</span>
          )}
        </div>

        {request.status === 'pending' && !isExpired && (
          <div className="flex items-center gap-1.5">
            {onDecline && (
              <button
                type="button"
                onClick={onDecline}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                <ThumbsDown className="mr-1 h-3 w-3" />
                Decline
              </button>
            )}
            {onAccept && (
              <button
                type="button"
                onClick={onAccept}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <ThumbsUp className="mr-1 h-3 w-3" />
                Accept
              </button>
            )}
            {onPlay && (
              <button
                type="button"
                onClick={onPlay}
                className="inline-flex items-center justify-center rounded-lg bg-accent-gold px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:brightness-110"
              >
                <Play className="mr-1 h-3 w-3" />
                Play
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default RequestCard;

