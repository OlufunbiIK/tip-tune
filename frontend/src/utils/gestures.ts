/**
 * Mobile gesture detection and handling utilities
 * Provides touch gesture detection (swipe, pull, double-tap) with proper mobile UX
 */

export interface GesturePoint {
    x: number;
    y: number;
    timestamp: number;
}

export interface SwipeGesture {
    direction: 'up' | 'down' | 'left' | 'right';
    distance: number;
    velocity: number;
    duration: number;
}

export interface GestureConfig {
    swipeThreshold?: number;      // minimum distance to trigger swipe (px)
    velocityThreshold?: number;    // minimum velocity for swipe (px/ms)
    doubleTapDelay?: number;       // max time between taps for double-tap (ms)
    pullThreshold?: number;        // distance to trigger pull-to-refresh (px)
}

const DEFAULT_CONFIG: GestureConfig = {
    swipeThreshold: 50,
    velocityThreshold: 0.1,
    doubleTapDelay: 300,
    pullThreshold: 80,
};

class GestureHandler {
    private startPoint: GesturePoint | null = null;
    private lastTapTime: number = 0;
    private config: GestureConfig;

    constructor(config: Partial<GestureConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Record the start of a touch gesture
     */
    onTouchStart(x: number, y: number): void {
        this.startPoint = { x, y, timestamp: Date.now() };
    }

    /**
     * Detect and return swipe gesture if conditions are met
     */
    onTouchEnd(x: number, y: number): SwipeGesture | null {
        if (!this.startPoint) return null;

        const deltaX = x - this.startPoint.x;
        const deltaY = y - this.startPoint.y;
        const duration = Date.now() - this.startPoint.timestamp;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / duration;

        // Check if it's a valid swipe
        if (distance < this.config.swipeThreshold! || velocity < this.config.velocityThreshold!) {
            this.startPoint = null;
            return null;
        }

        // Determine direction (dominant axis)
        const direction: 'up' | 'down' | 'left' | 'right' =
            Math.abs(deltaY) > Math.abs(deltaX)
                ? deltaY < 0
                    ? 'up'
                    : 'down'
                : deltaX < 0
                ? 'left'
                : 'right';

        this.startPoint = null;
        return { direction, distance, velocity, duration };
    }

    /**
     * Detect double-tap gesture
     */
    onTap(): boolean {
        const now = Date.now();
        const doubleTapGap = now - this.lastTapTime;

        if (doubleTapGap < this.config.doubleTapDelay!) {
            this.lastTapTime = 0; // Reset
            return true;
        }

        this.lastTapTime = now;
        return false;
    }

    /**
     * Reset gesture state
     */
    reset(): void {
        this.startPoint = null;
        this.lastTapTime = 0;
    }
}

export function createGestureHandler(config?: Partial<GestureConfig>): GestureHandler {
    return new GestureHandler(config);
}

/**
 * Calculate velocity-based distance for animations
 * Higher velocity = greater distance
 */
export function calculateMomentum(
    velocity: number,
    threshold: number = 0.5
): number {
    return Math.max(0, (velocity - threshold) * 500);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Detect if device has touch capability
 */
export function isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0)
    );
}

/**
 * Get safe area insets from CSS environment variables
 * Used for notch/dynamic island support on mobile
 */
export function getSafeAreaInsets(): {
    top: number;
    left: number;
    right: number;
    bottom: number;
} {
    if (typeof window === 'undefined') {
        return { top: 0, left: 0, right: 0, bottom: 0 };
    }

    const root = document.documentElement;
    const top = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-top') || '0');
    const left = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-left') || '0');
    const right = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-right') || '0');
    const bottom = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom') || '0');

    return { top, left, right, bottom };
}

/**
 * Set safe area insets as CSS variables for viewport-fit=cover support
 */
export function setupSafeAreaInsets(): void {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left, 0px)');
    root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right, 0px)');
    root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)');
}
