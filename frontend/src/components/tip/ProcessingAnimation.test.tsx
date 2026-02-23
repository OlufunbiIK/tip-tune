import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import ProcessingAnimation from './ProcessingAnimation';

vi.mock('../../utils/animationUtils', () => ({
    useReducedMotion: vi.fn(() => false),
}));

vi.mock('react-spring', () => ({
    useSpring: vi.fn(() => [{ opacity: 1, scale: 1 }, {}]),
    animated: new Proxy({} as any, {
        get: () => (props: any) => <div {...props} />,
    }),
}));

describe('ProcessingAnimation', () => {
    it('renders nothing in idle phase', () => {
        const { container } = render(<ProcessingAnimation phase="idle" />);
        expect(container.firstChild).toBeNull();
    });

    it('shows spinner and label in processing phase', () => {
        render(<ProcessingAnimation phase="processing" />);
        expect(screen.getByText(/sending to stellar/i)).toBeInTheDocument();
    });

    it('shows confirmation UI in confirming phase', () => {
        render(<ProcessingAnimation phase="confirming" />);
        expect(screen.getByText(/awaiting block confirmation/i)).toBeInTheDocument();
    });

    it('shows tx hash link when provided in confirming phase', () => {
        const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';
        render(<ProcessingAnimation phase="confirming" txHash={hash} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', expect.stringContaining(hash));
    });

    it('shows success message in success phase', () => {
        render(<ProcessingAnimation phase="success" />);
        expect(screen.getByText(/tip sent/i)).toBeInTheDocument();
    });

    it('has aria role=status', () => {
        render(<ProcessingAnimation phase="processing" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('calls onComplete after success phase (reduced motion fast path)', () => {
        const { useReducedMotion } = require('../../utils/animationUtils');
        useReducedMotion.mockReturnValue(true);

        vi.useFakeTimers();
        const onComplete = vi.fn();
        render(<ProcessingAnimation phase="success" onComplete={onComplete} />);
        vi.advanceTimersByTime(400);
        expect(onComplete).toHaveBeenCalled();
        vi.useRealTimers();
    });
});
