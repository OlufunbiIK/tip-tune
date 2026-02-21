/**
 * React hooks for gesture detection and handling
 * Provides swipe, double-tap, and pull-to-refresh gestures for mobile
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
    createGestureHandler,
    type SwipeGesture,
    type GestureConfig,
    isTouchDevice,
} from '../utils/gestures';

export interface UseSwipeGestureOptions extends GestureConfig {
    onSwipe?: (gesture: SwipeGesture) => void;
    onSwipeDown?: (gesture: SwipeGesture) => void;
    onSwipeUp?: (gesture: SwipeGesture) => void;
    onSwipeLeft?: (gesture: SwipeGesture) => void;
    onSwipeRight?: (gesture: SwipeGesture) => void;
    enabled?: boolean;
}

/**
 * Hook for detecting and handling swipe gestures
 * Useful for dismiss gestures, navigation, etc.
 */
export function useSwipeGesture(
    elementRef: React.RefObject<HTMLElement>,
    options: UseSwipeGestureOptions = {}
) {
    const { onSwipe, onSwipeDown, onSwipeUp, onSwipeLeft, onSwipeRight, enabled = true, ...gestureConfig } = options;
    const gestureHandlerRef = useRef(createGestureHandler(gestureConfig));

    useEffect(() => {
        if (!enabled || !elementRef.current || !isTouchDevice()) return;

        const element = elementRef.current;
        const handler = gestureHandlerRef.current;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            handler.onTouchStart(touch.clientX, touch.clientY);
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.changedTouches.length === 0) return;
            const touch = e.changedTouches[0];
            const gesture = handler.onTouchEnd(touch.clientX, touch.clientY);

            if (gesture) {
                onSwipe?.(gesture);

                if (gesture.direction === 'down') onSwipeDown?.(gesture);
                else if (gesture.direction === 'up') onSwipeUp?.(gesture);
                else if (gesture.direction === 'left') onSwipeLeft?.(gesture);
                else if (gesture.direction === 'right') onSwipeRight?.(gesture);
            }
        };

        element.addEventListener('touchstart', handleTouchStart);
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [enabled, onSwipe, onSwipeDown, onSwipeUp, onSwipeLeft, onSwipeRight]);
}

export interface UsePullToRefreshOptions extends GestureConfig {
    onPull?: (offset: number) => void;
    onRefresh?: () => Promise<void>;
    enabled?: boolean;
}

/**
 * Hook for pull-to-refresh gesture (pull down to trigger refresh)
 * Useful for refreshing wallet balance, etc.
 */
export function usePullToRefresh(
    elementRef: React.RefObject<HTMLElement>,
    options: UsePullToRefreshOptions = {}
) {
    const { onPull, onRefresh, enabled = true, pullThreshold = 80 } = options;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullOffset, setPullOffset] = useState(0);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const scrollPositionRef = useRef(0);

    useEffect(() => {
        if (!enabled || !elementRef.current || !isTouchDevice()) return;

        const element = elementRef.current;

        const handleTouchStart = (e: TouchEvent) => {
            // Only track if at top of scrollable area
            const scrollTop = element.scrollTop || window.scrollY;
            if (scrollTop === 0) {
                const touch = e.touches[0];
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                scrollPositionRef.current = scrollTop;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStartRef.current || isRefreshing) return;

            const touch = e.touches[0];
            const deltaY = touch.clientY - touchStartRef.current.y;

            // Only track downward movement
            if (deltaY > 0) {
                e.preventDefault();
                setPullOffset(deltaY);
                onPull?.(deltaY);
            }
        };

        const handleTouchEnd = async () => {
            if (pullOffset >= pullThreshold && !isRefreshing) {
                setIsRefreshing(true);
                try {
                    await onRefresh?.();
                } finally {
                    setIsRefreshing(false);
                }
            }

            touchStartRef.current = null;
            setPullOffset(0);
        };

        element.addEventListener('touchstart', handleTouchStart);
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [enabled, pullThreshold, isRefreshing, pullOffset, onPull, onRefresh]);

    return { pullOffset, isRefreshing };
}

export interface UseDoubleTapOptions {
    onDoubleTap?: (e: React.TouchEvent<HTMLElement>) => void;
    onSingleTap?: (e: React.TouchEvent<HTMLElement>) => void;
    enabled?: boolean;
}

/**
 * Hook for detecting double-tap gestures
 * Useful for quick tipping, favoring, etc.
 */
export function useDoubleTap(
    options: UseDoubleTapOptions = {}
) {
    const { onDoubleTap, onSingleTap, enabled = true } = options;
    const gestureHandlerRef = useRef(createGestureHandler());
    const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleTap = useCallback(
        (e: React.TouchEvent<HTMLElement>) => {
            if (!enabled) return;

            const handler = gestureHandlerRef.current;
            const isDoubleTap = handler.onTap();

            if (tapTimerRef.current) {
                clearTimeout(tapTimerRef.current);
                tapTimerRef.current = null;
            }

            if (isDoubleTap) {
                onDoubleTap?.(e);
            } else {
                tapTimerRef.current = setTimeout(() => {
                    onSingleTap?.(e);
                    tapTimerRef.current = null;
                }, 300);
            }
        },
        [enabled, onDoubleTap, onSingleTap]
    );

    useEffect(() => {
        return () => {
            if (tapTimerRef.current) {
                clearTimeout(tapTimerRef.current);
            }
        };
    }, []);

    return { handleTap };
}

/**
 * Hook to check if device supports touch
 */
export function useTouchSupport(): boolean {
    const [hasTouch, setHasTouch] = useState(isTouchDevice());

    useEffect(() => {
        setHasTouch(isTouchDevice());
    }, []);

    return hasTouch;
}

/**
 * Hook for virtual keyboard detection and height tracking
 * Useful for adjusting modal position when keyboard appears
 */
export function useVirtualKeyboard() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const screenHeight = window.screen.height;
            const keyboard = Math.max(0, screenHeight - viewportHeight);
            setKeyboardHeight(keyboard);
        };

        window.visualViewport?.addEventListener('resize', handleResize);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
        };
    }, []);

    return keyboardHeight;
}
