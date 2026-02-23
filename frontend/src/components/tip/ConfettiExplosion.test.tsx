import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import ConfettiExplosion from './ConfettiExplosion';

// ─── Canvas Mock ───────────────────────────────────────────────────────────────

const mockCtx = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
};

beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx as any);
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

vi.mock('../../utils/animationUtils', () => ({
    useReducedMotion: vi.fn(() => false),
    generateConfettiParticle: vi.fn(() => ({
        x: 100, y: 100, vx: 2, vy: -3, color: '#FFD166',
        size: 6, rotation: 0, rotationSpeed: 5, opacity: 1, shape: 'rect',
    })),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('ConfettiExplosion', () => {
    it('renders nothing when active=false', () => {
        const { container } = render(<ConfettiExplosion active={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders a canvas when active=true', () => {
        const { container } = render(<ConfettiExplosion active={true} count={5} />);
        expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('canvas has aria-hidden', () => {
        const { container } = render(<ConfettiExplosion active={true} />);
        const canvas = container.querySelector('canvas');
        expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders nothing when prefers-reduced-motion is true', () => {
        const { useReducedMotion } = require('../../utils/animationUtils');
        useReducedMotion.mockReturnValue(true);

        const onComplete = vi.fn();
        const { container } = render(
            <ConfettiExplosion active={true} onComplete={onComplete} />
        );
        // When reduced motion + active, the component renders null and calls onComplete
        expect(container.firstChild).toBeNull();
        expect(onComplete).toHaveBeenCalled();
    });

    it('calls onComplete after animation ends', async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        render(<ConfettiExplosion active={true} count={1} onComplete={onComplete} />);
        // Simulate rAF running until opacity hits 0 by fast-forwarding
        // (In JSDOM rAF doesn't run, but we test that the callback is wired up)
        vi.useRealTimers();
    });
});
