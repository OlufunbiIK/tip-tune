import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, Coins } from 'lucide-react';
import { useReducedMotion } from '../utils/animationUtils';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'tip';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  tip: <Coins className="w-5 h-5 text-accent-gold" />,
};

const ACCENT_COLORS: Record<ToastType, string> = {
  success: 'border-l-green-400',
  error: 'border-l-red-400',
  warning: 'border-l-yellow-400',
  info: 'border-l-blue-400',
  tip: 'border-l-accent-gold',
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [exiting, setExiting] = useState(false);

  const dismiss = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => onClose(id), reducedMotion ? 0 : 300);
  }, [id, onClose, reducedMotion]);

  // Progress bar drain via rAF for smoothness
  useEffect(() => {
    if (duration <= 0) return;

    const tick = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, dismiss]);

  const progressColor: Record<ToastType, string> = {
    success: 'bg-green-400',
    error: 'bg-red-400',
    warning: 'bg-yellow-400',
    info: 'bg-blue-400',
    tip: 'bg-accent-gold',
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-testid={`toast-${id}`}
      className={[
        'relative flex flex-col w-full max-w-sm overflow-hidden',
        'rounded-xl bg-[#1a2942] border border-white/8 border-l-4 shadow-2xl shadow-black/40',
        ACCENT_COLORS[type],
        !reducedMotion && !exiting ? 'animate-slide-bounce' : '',
        !reducedMotion && exiting ? 'opacity-0 translate-x-full transition-all duration-300' : '',
      ].join(' ')}
    >
      {/* Content row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">{ICONS[type]}</div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{title}</p>
          <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{message}</p>
        </div>

        <button
          type="button"
          id={`toast-close-${id}`}
          onClick={dismiss}
          aria-label="Close notification"
          className="flex-shrink-0 text-gray-500 hover:text-white transition-colors -mt-0.5 -mr-0.5 p-1 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div
          className="h-0.5 absolute bottom-0 left-0 right-0"
          aria-hidden="true"
        >
          <div
            data-testid="toast-progress"
            className={`h-full ${progressColor[type]} transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
