export { default as useApi } from './useApi';
export { useSearch, addToSearchHistory, getSearchHistory, clearSearchHistory, getTrendingSearches } from './useSearch';
export {
    useSwipeGesture,
    usePullToRefresh,
    useDoubleTap,
    useTouchSupport,
    useVirtualKeyboard,
    useHaptic,
} from './useGestures';
export type { UseSwipeGestureOptions, UsePullToRefreshOptions, UseDoubleTapOptions } from './useGestures';
