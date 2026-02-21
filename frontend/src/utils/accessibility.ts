export type AriaLive = 'polite' | 'assertive' | 'off';

let liveRegionIdCounter = 0;

export const generateLiveRegionId = (): string => {
  liveRegionIdCounter += 1;
  return `a11y-live-region-${liveRegionIdCounter}`;
};

export const announceToScreenReader = (
  message: string,
  priority: AriaLive = 'polite'
): void => {
  const liveRegion = document.getElementById(
    priority === 'assertive' ? 'a11y-assertive-region' : 'a11y-polite-region'
  );
  
  if (liveRegion) {
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 50);
  }
};

export const focusFirstFocusable = (container: HTMLElement): boolean => {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  if (firstFocusable) {
    firstFocusable.focus();
    return true;
  }
  return false;
};

export const focusLastFocusable = (container: HTMLElement): boolean => {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const lastFocusable = focusableElements[focusableElements.length - 1];
  if (lastFocusable) {
    lastFocusable.focus();
    return true;
  }
  return false;
};

export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
};

export const trapFocus = (container: HTMLElement, event: KeyboardEvent): void => {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return;
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }
};

export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const prefersHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: more)').matches;
};

export const formatTimeForScreenReader = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes === 0) {
    return `${remainingSeconds} seconds`;
  }
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return `${minutes} minute${minutes > 1 ? 's' : ''} and ${remainingSeconds} seconds`;
};

export const formatNumberForScreenReader = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} million`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} thousand`;
  }
  return num.toString();
};
