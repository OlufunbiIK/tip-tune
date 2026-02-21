/**
 * Gesture Utilities and Hooks Tests
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
    createGestureHandler,
    calculateMomentum,
    clamp,
    isTouchDevice,
    getSafeAreaInsets,
} from './gestures';
import { useSwipeGesture, useDoubleTap, useVirtualKeyboard } from '../hooks/useGestures';

describe('Gesture Utilities', () => {
    describe('GestureHandler', () => {
        it('detects downward swipe', () => {
            const handler = createGestureHandler();

            handler.onTouchStart(100, 100);
            const gesture = handler.onTouchEnd(100, 200);

            expect(gesture).not.toBeNull();
            expect(gesture!.direction).toBe('down');
        });

        it('detects upward swipe', () => {
            const handler = createGestureHandler();

            handler.onTouchStart(100, 200);
            const gesture = handler.onTouchEnd(100, 100);

            expect(gesture).not.toBeNull();
            expect(gesture!.direction).toBe('up');
        });

        it('detects left swipe', () => {
            const handler = createGestureHandler();

            handler.onTouchStart(200, 100);
            const gesture = handler.onTouchEnd(100, 100);

            expect(gesture).not.toBeNull();
            expect(gesture!.direction).toBe('left');
        });

        it('detects right swipe', () => {
            const handler = createGestureHandler();

            handler.onTouchStart(100, 100);
            const gesture = handler.onTouchEnd(200, 100);

            expect(gesture).not.toBeNull();
            expect(gesture!.direction).toBe('right');
        });

        it('returns null for short swipe', () => {
            const handler = createGestureHandler({ swipeThreshold: 50 });

            handler.onTouchStart(100, 100);
            const gesture = handler.onTouchEnd(110, 110);

            expect(gesture).toBeNull();
        });

        it('detects double-tap', () => {
            const handler = createGestureHandler();

            const tap1 = handler.onTap();
            expect(tap1).toBe(false);

            const tap2 = handler.onTap();
            expect(tap2).toBe(true);
        });
    });

    describe('calculateMomentum', () => {
        it('returns 0 for velocity below threshold', () => {
            expect(calculateMomentum(0.3, 0.5)).toBe(0);
        });

        it('calculates momentum above threshold', () => {
            expect(calculateMomentum(1.0, 0.5)).toBeGreaterThan(0);
        });

        it('higher velocity produces greater momentum', () => {
            const low = calculateMomentum(0.6, 0.5);
            const high = calculateMomentum(1.5, 0.5);
            expect(high).toBeGreaterThan(low);
        });
    });

    describe('clamp', () => {
        it('clamps value to max', () => {
            expect(clamp(150, 0, 100)).toBe(100);
        });

        it('clamps value to min', () => {
            expect(clamp(-10, 0, 100)).toBe(0);
        });

        it('returns unchanged value within range', () => {
            expect(clamp(50, 0, 100)).toBe(50);
        });
    });

    describe('isTouchDevice', () => {
        it('returns boolean', () => {
            const result = isTouchDevice();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getSafeAreaInsets', () => {
        it('returns safe area insets object', () => {
            const insets = getSafeAreaInsets();
            expect(insets).toHaveProperty('top');
            expect(insets).toHaveProperty('left');
            expect(insets).toHaveProperty('right');
            expect(insets).toHaveProperty('bottom');
        });

        it('all insets are non-negative numbers', () => {
            const insets = getSafeAreaInsets();
            expect(insets.top).toBeGreaterThanOrEqual(0);
            expect(insets.left).toBeGreaterThanOrEqual(0);
            expect(insets.right).toBeGreaterThanOrEqual(0);
            expect(insets.bottom).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('Gesture Hooks', () => {
    describe('useSwipeGesture', () => {
        it('initializes without error', () => {
            const ref = React.createRef<HTMLDivElement>();
            const { result } = renderHook(() =>
                useSwipeGesture(ref, { enabled: false })
            );
            expect(result).toBeDefined();
        });
    });

    describe('useDoubleTap', () => {
        it('initializes without error', () => {
            const { result } = renderHook(() =>
                useDoubleTap({ enabled: false })
            );
            expect(result.current.handleTap).toBeDefined();
        });

        it('provides handleTap function', () => {
            const { result } = renderHook(() =>
                useDoubleTap({ enabled: true })
            );
            expect(typeof result.current.handleTap).toBe('function');
        });
    });

    describe('useVirtualKeyboard', () => {
        it('returns keyboard height', () => {
            const { result } = renderHook(() => useVirtualKeyboard());
            expect(typeof result.current).toBe('number');
            expect(result.current).toBeGreaterThanOrEqual(0);
        });
    });
});

// Mock React for hook tests
import React from 'react';
