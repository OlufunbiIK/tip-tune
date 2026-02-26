import { useEffect, useCallback, RefObject } from 'react';
import { getFocusableElements } from '@/utils/accessibility';

interface UseFocusTrapOptions {
  enabled?: boolean;
  initialFocus?: RefObject<HTMLElement>;
  restoreFocus?: boolean;
}

export const useFocusTrap = <T extends HTMLElement>(
  containerRef: RefObject<T>,
  options: UseFocusTrapOptions = {}
) => {
  const { enabled = true, initialFocus, restoreFocus = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return;
      
      const container = containerRef.current;
      const focusableElements = getFocusableElements(container);
      
      if (focusableElements.length === 0) return;
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    },
    [enabled, containerRef]
  );

  useEffect(() => {
    if (!enabled) return;

    const previousActiveElement = document.activeElement as HTMLElement;

    document.addEventListener('keydown', handleKeyDown);

    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else if (containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      if (restoreFocus && previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [enabled, handleKeyDown, containerRef, initialFocus, restoreFocus]);
};

export default useFocusTrap;
