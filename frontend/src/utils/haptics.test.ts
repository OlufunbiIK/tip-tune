/**
 * Haptic Feedback Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HapticFeedback } from './haptics';

describe('HapticFeedback', () => {
    beforeEach(() => {
        // Mock navigator.vibrate
        Object.defineProperty(navigator, 'vibrate', {
            value: vi.fn(() => true),
            writable: true,
        });
    });

    describe('initialize', () => {
        it('initializes haptic feedback', () => {
            HapticFeedback.initialize();
            expect(HapticFeedback.available).toBeDefined();
        });

        it('can be called multiple times safely', () => {
            HapticFeedback.initialize();
            HapticFeedback.initialize();
            expect(HapticFeedback.available).toBeDefined();
        });
    });

    describe('trigger', () => {
        beforeEach(() => {
            HapticFeedback.initialize();
        });

        it('triggers light haptic', () => {
            HapticFeedback.trigger('light');
            expect(navigator.vibrate).toHaveBeenCalledWith(10);
        });

        it('triggers medium haptic', () => {
            HapticFeedback.trigger('medium');
            expect(navigator.vibrate).toHaveBeenCalledWith(30);
        });

        it('triggers heavy haptic', () => {
            HapticFeedback.trigger('heavy');
            expect(navigator.vibrate).toHaveBeenCalledWith(50);
        });

        it('triggers success pattern', () => {
            HapticFeedback.trigger('success');
            expect(navigator.vibrate).toHaveBeenCalledWith([10, 20, 20]);
        });

        it('triggers warning pattern', () => {
            HapticFeedback.trigger('warning');
            expect(navigator.vibrate).toHaveBeenCalledWith([30, 10, 30]);
        });

        it('triggers error pattern', () => {
            HapticFeedback.trigger('error');
            expect(navigator.vibrate).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
        });

        it('triggers selection haptic', () => {
            HapticFeedback.trigger('selection');
            expect(navigator.vibrate).toHaveBeenCalledWith(5);
        });

        it('does not throw on unsupported device', () => {
            Object.defineProperty(navigator, 'vibrate', {
                value: undefined,
                writable: true,
            });

            expect(() => HapticFeedback.trigger('light')).not.toThrow();
        });
    });

    describe('custom', () => {
        beforeEach(() => {
            HapticFeedback.initialize();
        });

        it('triggers custom pattern', () => {
            HapticFeedback.custom([100, 50, 100]);
            expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
        });

        it('triggers single duration', () => {
            HapticFeedback.custom(50);
            expect(navigator.vibrate).toHaveBeenCalledWith(50);
        });
    });

    describe('stop', () => {
        beforeEach(() => {
            HapticFeedback.initialize();
        });

        it('stops vibration', () => {
            HapticFeedback.stop();
            expect(navigator.vibrate).toHaveBeenCalledWith(0);
        });
    });

    describe('available', () => {
        it('returns availability status', () => {
            HapticFeedback.initialize();
            expect(typeof HapticFeedback.available).toBe('boolean');
        });
    });
});
