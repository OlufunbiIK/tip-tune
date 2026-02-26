export { default as useApi } from './useApi';
export { useSearch, addToSearchHistory, getSearchHistory, clearSearchHistory, getTrendingSearches } from './useSearch';
export { default as useReducedMotion } from './useReducedMotion';
export { default as useFocusTrap } from './useFocusTrap';
export { default as useKeyboardShortcuts } from './useKeyboardShortcuts';
export { default as useAnnouncer } from './useAnnouncer';
export type { KeyboardShortcut } from './useKeyboardShortcuts';
export {
    useSwipeGesture,
    usePullToRefresh,
    useDoubleTap,
    useTouchSupport,
    useVirtualKeyboard,
    
} from './useGestures';
export type { UseSwipeGestureOptions, UsePullToRefreshOptions, UseDoubleTapOptions } from './useGestures';
export { useHaptic } from '../utils/haptics';
export { useTheme } from './useTheme';
export { useTipCombo } from './useTipCombo';

