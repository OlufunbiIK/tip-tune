import { useCallback, useRef } from 'react';
import { announceToScreenReader, AriaLive } from '@/utils/accessibility';

interface UseAnnouncerOptions {
  defaultPriority?: AriaLive;
  debounceMs?: number;
}

export const useAnnouncer = (options: UseAnnouncerOptions = {}) => {
  const { defaultPriority = 'polite', debounceMs = 100 } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback(
    (message: string, priority?: AriaLive) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        announceToScreenReader(message, priority ?? defaultPriority);
      }, debounceMs);
    },
    [defaultPriority, debounceMs]
  );

  const announcePolite = useCallback(
    (message: string) => announce(message, 'polite'),
    [announce]
  );

  const announceAssertive = useCallback(
    (message: string) => announce(message, 'assertive'),
    [announce]
  );

  return {
    announce,
    announcePolite,
    announceAssertive,
  };
};

export default useAnnouncer;
