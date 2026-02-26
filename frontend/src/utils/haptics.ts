import React from 'react';

/**
 * Haptic feedback API wrapper
 * Provides cross-platform haptic feedback with graceful fallback
 * Uses Vibration API (standard) with fallbacks for different devices
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticPattern {
    duration: number | number[];
}

const HAPTIC_PATTERNS: Record<HapticStyle, HapticPattern> = {
    light: { duration: 10 },
    medium: { duration: 30 },
    heavy: { duration: 50 },
    success: { duration: [10, 20, 20] },      // bump-bump pattern
    warning: { duration: [30, 10, 30] },      // dah-dit-dah pattern
    error: { duration: [50, 30, 50, 30, 50] }, // SOS pattern - three heavy vibrations
    selection: { duration: 5 },                // very light for UI feedback
};

export class HapticFeedback {
    private static isSupported = false;
    private static initialized = false;

    /**
     * Check if haptic feedback is supported on this device
     */
    static initialize(): void {
        if (this.initialized) return;
        this.initialized = true;

        if (typeof window === 'undefined') return;
        this.isSupported = 'vibrate' in navigator;
    }

    /**
     * Trigger haptic feedback with specified style
     */
    static trigger(style: HapticStyle): void {
        if (!HapticFeedback.isSupported) return;

        const pattern = HAPTIC_PATTERNS[style];
        if (!pattern) return;

        try {
            navigator.vibrate(pattern.duration);
        } catch (error) {
            console.warn('Haptic feedback failed:', error);
        }
    }

    /**
     * Trigger haptic feedback with custom vibration pattern
     * @param pattern Single duration or array of durations [vibrate, pause, vibrate, ...]
     */
    static custom(pattern: number | number[]): void {
        if (!HapticFeedback.isSupported) return;

        try {
            navigator.vibrate(pattern);
        } catch (error) {
            console.warn('Haptic feedback failed:', error);
        }
    }

    /**
     * Stop any ongoing haptic feedback
     */
    static stop(): void {
        if (!HapticFeedback.isSupported) return;

        try {
            navigator.vibrate(0);
        } catch (error) {
            console.warn('Stopping haptic feedback failed:', error);
        }
    }

    /**
     * Check if haptic feedback is available
     */
    static get available(): boolean {
        return HapticFeedback.isSupported;
    }
}

/**
 * React hook for haptic feedback
 * Initializes on component mount and provides trigger function
 */
export function useHaptic() {
    // Initialize on first use
    React.useEffect(() => {
        HapticFeedback.initialize();
    }, []);

    return {
        trigger: (style: HapticStyle) => HapticFeedback.trigger(style),
        custom: (pattern: number | number[]) => HapticFeedback.custom(pattern),
        stop: () => HapticFeedback.stop(),
        available: HapticFeedback.available,
    };
}
