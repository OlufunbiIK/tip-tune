import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import TipButton from './TipButton';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../utils/animationUtils', () => ({
    useReducedMotion: vi.fn(() => false),
    generateCoinParticles: vi.fn(() => [
        { id: 0, x: 10, y: -70, angle: 15, speed: 0.8, scale: 1, duration: 700, delay: 0 },
    ]),
}));

vi.mock('react-spring', () => {
    const animated = new Proxy({} as any, {
        get: (_target, prop) => {
            if (prop === 'button') {
                // Return a plain button so tests can interact with it
                return (props: any) => <button {...props} />;
            }
            return (props: any) => <div {...props} />;
        },
    });
    return {
        animated,
        useSpring: () => [{ scale: 1 }, { start: vi.fn() }],
    };
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('TipButton', () => {
    const mockOnTip = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with default label', () => {
        render(<TipButton amount={5} onTip={mockOnTip} />);
        expect(screen.getByRole('button', { name: /tip 5 xlm/i })).toBeInTheDocument();
    });

    it('renders custom label', () => {
        render(<TipButton amount={10} onTip={mockOnTip} label="Send Tip" />);
        expect(screen.getByText('Send Tip')).toBeInTheDocument();
    });

    it('calls onTip with correct args on click', async () => {
        render(<TipButton amount={5} currency="XLM" onTip={mockOnTip} />);
        fireEvent.click(screen.getByRole('button', { name: /tip/i }));
        await waitFor(() => {
            expect(mockOnTip).toHaveBeenCalledWith(5, 'XLM');
        });
    });

    it('does not call onTip when disabled', () => {
        render(<TipButton amount={5} onTip={mockOnTip} disabled />);
        fireEvent.click(screen.getByRole('button', { name: /tip/i }));
        expect(mockOnTip).not.toHaveBeenCalled();
    });

    it('shows loading spinner when isLoading=true', () => {
        render(<TipButton amount={5} onTip={mockOnTip} isLoading />);
        expect(screen.getByText('Sending…')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('has correct aria-label', () => {
        render(<TipButton amount={10} currency="USDC" onTip={mockOnTip} />);
        expect(screen.getByLabelText('Tip 10 USDC')).toBeInTheDocument();
    });

    it('disables coins when reduced motion is active', () => {
        const { useReducedMotion } = require('../../utils/animationUtils');
        useReducedMotion.mockReturnValue(true);
        const { generateCoinParticles } = require('../../utils/animationUtils');

        render(<TipButton amount={5} onTip={mockOnTip} />);
        fireEvent.click(screen.getByRole('button', { name: /tip/i }));
        expect(generateCoinParticles).not.toHaveBeenCalled();
    });
});
