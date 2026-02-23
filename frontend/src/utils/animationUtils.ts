import { useEffect, useState } from 'react';

// ─── Reduced Motion ───────────────────────────────────────────────────────────

/**
 * Returns true when the OS/browser signals prefers-reduced-motion.
 * All animating components should call this and skip animations when true.
 */
export function useReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return prefersReduced;
}

// ─── Spring Configs ───────────────────────────────────────────────────────────

export type SpringPreset = 'gentle' | 'wobbly' | 'stiff' | 'molasses';

export const SPRING_CONFIGS: Record<SpringPreset, { tension: number; friction: number; mass: number }> = {
    gentle: { tension: 120, friction: 14, mass: 1 },
    wobbly: { tension: 180, friction: 12, mass: 1 },
    stiff: { tension: 210, friction: 20, mass: 1 },
    molasses: { tension: 280, friction: 120, mass: 1 },
};

export function getSpringConfig(preset: SpringPreset = 'wobbly') {
    return SPRING_CONFIGS[preset];
}

// ─── Duration Constants ───────────────────────────────────────────────────────

export const ANIMATION_DURATIONS = {
    fast: 150,
    normal: 300,
    slow: 500,
    xslow: 800,
    toast: 5000,
} as const;

// ─── Coin Particle Helpers ────────────────────────────────────────────────────

export interface CoinParticle {
    id: number;
    x: number;
    y: number;
    angle: number;
    speed: number;
    scale: number;
    duration: number;
    delay: number;
}

export function generateCoinParticles(count = 5): CoinParticle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 60,      // horizontal spread in px
        y: -(60 + Math.random() * 60),       // how high they fly
        angle: (Math.random() - 0.5) * 40,  // rotation degrees
        speed: 0.5 + Math.random() * 0.5,
        scale: 0.8 + Math.random() * 0.5,
        duration: 600 + Math.random() * 400,
        delay: i * 60,
    }));
}

// ─── Confetti Particle Helpers ────────────────────────────────────────────────

export interface ConfettiParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = ['#FFD166', '#4DA3FF', '#9BF0E1', '#6EDCFF', '#FF6B9D', '#C77DFF'];

export function generateConfettiParticle(originX: number, originY: number): ConfettiParticle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
    };
}
