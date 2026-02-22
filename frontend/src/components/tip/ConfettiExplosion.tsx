import React, { useEffect, useRef, useCallback } from 'react';
import {
    useReducedMotion,
    generateConfettiParticle,
    type ConfettiParticle,
} from '../../utils/animationUtils';

export interface ConfettiExplosionProps {
    /** Whether to trigger explosion */
    active: boolean;
    /** Origin X (viewport px) — defaults to window center */
    originX?: number;
    /** Origin Y (viewport px) — defaults to window center */
    originY?: number;
    /** Number of particles (default 60) */
    count?: number;
    /** Called when animation completes */
    onComplete?: () => void;
}

const ConfettiExplosion: React.FC<ConfettiExplosionProps> = ({
    active,
    originX,
    originY,
    count = 60,
    onComplete,
}) => {
    const reducedMotion = useReducedMotion();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<ConfettiParticle[]>([]);
    const rafRef = useRef<number | null>(null);

    const stopAnimation = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        particlesRef.current = [];
    }, []);

    useEffect(() => {
        if (!active || reducedMotion) {
            stopAnimation();
            if (active && reducedMotion) onComplete?.();
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const ox = originX ?? window.innerWidth / 2;
        const oy = originY ?? window.innerHeight / 2;

        particlesRef.current = Array.from({ length: count }, () =>
            generateConfettiParticle(ox, oy)
        );

        const GRAVITY = 0.25;
        const DRAG = 0.99;
        const FADE_RATE = 0.018;

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = 0;

            for (const p of particlesRef.current) {
                if (p.opacity <= 0) continue;
                alive++;

                // Physics
                p.vy += GRAVITY;
                p.vx *= DRAG;
                p.vy *= DRAG;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.opacity = Math.max(0, p.opacity - FADE_RATE);

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);

                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                }

                ctx.restore();
            }

            if (alive > 0) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                stopAnimation();
                onComplete?.();
            }
        };

        rafRef.current = requestAnimationFrame(tick);

        return stopAnimation;
    }, [active, originX, originY, count, reducedMotion, stopAnimation, onComplete]);

    // Not active — render nothing
    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[9999]"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
};

export default ConfettiExplosion;
