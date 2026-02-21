import React, { useEffect, useRef, useCallback } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ShortcutItem {
  keys: string[];
  description: string;
  category?: string;
}

interface KeyboardShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: ShortcutItem[];
}

const defaultShortcuts: ShortcutItem[] = [
  { keys: ['?'], description: 'Open keyboard shortcuts help', category: 'General' },
  { keys: ['Esc'], description: 'Close modals', category: 'General' },
  { keys: ['Space'], description: 'Play/Pause', category: 'Player' },
  { keys: ['←'], description: 'Previous track', category: 'Player' },
  { keys: ['→'], description: 'Next track', category: 'Player' },
  { keys: ['↑'], description: 'Increase volume', category: 'Player' },
  { keys: ['↓'], description: 'Decrease volume', category: 'Player' },
  { keys: ['M'], description: 'Mute/Unmute', category: 'Player' },
  { keys: ['Tab'], description: 'Navigate to next element', category: 'Navigation' },
  { keys: ['Shift', 'Tab'], description: 'Navigate to previous element', category: 'Navigation' },
];

const formatKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Escape': 'Esc',
    'Control': 'Ctrl',
    'Meta': '⌘',
  };
  return keyMap[key] || key;
};

export const KeyboardShortcutHelp: React.FC<KeyboardShortcutHelpProps> = ({
  isOpen,
  onClose,
  shortcuts = defaultShortcuts,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useFocusTrap(modalRef, { enabled: isOpen, initialFocus: closeButtonRef });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      tabIndex={-1}
    >
      <div
        className="fixed inset-0 bg-black/75"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className={`relative bg-deep-slate border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden ${
          prefersReducedMotion ? '' : 'animate-fade-up'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-primary-blue" aria-hidden="true" />
            <h2
              id="keyboard-shortcuts-title"
              className="text-lg font-semibold text-white"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-6">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <ul className="space-y-2">
                {items.map((shortcut, index) => (
                  <li
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-gray-200">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-gray-800 text-gray-200 rounded border border-gray-600 min-w-[2rem] text-center">
                            {formatKey(key)}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-500 text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-700 rounded">?</kbd> anytime to see this help
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutHelp;
