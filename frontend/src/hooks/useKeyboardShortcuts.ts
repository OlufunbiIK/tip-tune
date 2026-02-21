import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

const isShortcutMatch = (
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean => {
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
  const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
  const altMatches = shortcut.altKey ? event.altKey : !event.altKey;
  const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey;

  return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
};

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions['enabled'] | UseKeyboardShortcutsOptions = {}
) => {
  const config: UseKeyboardShortcutsOptions =
    typeof options === 'boolean' ? { enabled: options, shortcuts } : { enabled: true, shortcuts, ...options };
  
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!config.enabled) return;

      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (isShortcutMatch(event, shortcut)) {
          if (isInputField && !shortcut.ctrlKey && !shortcut.metaKey) {
            continue;
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [config.enabled]
  );

  useEffect(() => {
    if (!config.enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.enabled, handleKeyDown]);
};

export default useKeyboardShortcuts;
