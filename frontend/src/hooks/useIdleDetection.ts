import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseIdleDetectionOptions {
  /** Idle timeout in milliseconds before considering user idle. Default 60_000 (60s). */
  timeoutMs?: number;
  /** Events that reset the idle timer. Default: mousemove, keydown, scroll, touchstart, click. */
  resetEvents?: (keyof WindowEventMap)[];
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RESET_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

/**
 * Returns true when the user has been idle for at least `timeoutMs`.
 * Any of `resetEvents` resets the timer. Call `reset()` to reset manually (e.g. on exit).
 */
export function useIdleDetection(options: UseIdleDetectionOptions = {}): {
  isIdle: boolean;
  reset: () => void;
} {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    resetEvents = DEFAULT_RESET_EVENTS,
  } = options;

  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsIdle(false);
    timeoutRef.current = setTimeout(() => setIsIdle(true), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const scheduleIdle = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsIdle(false);
      timeoutRef.current = setTimeout(() => setIsIdle(true), timeoutMs);
    };

    scheduleIdle();

    resetEvents.forEach((event) => {
      window.addEventListener(event, scheduleIdle);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      resetEvents.forEach((event) => {
        window.removeEventListener(event, scheduleIdle);
      });
    };
  }, [timeoutMs, resetEvents.length]);

  return { isIdle, reset };
}

export default useIdleDetection;
