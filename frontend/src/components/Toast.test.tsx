import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import { Toast } from './Toast';

vi.mock('../utils/animationUtils', () => ({
    useReducedMotion: vi.fn(() => false),
}));

// rAF stub
let rafCallback: FrameRequestCallback | null = null;
beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });
});
afterEach(() => {
    vi.restoreAllMocks();
    rafCallback = null;
});

describe('Toast', () => {
    const baseProps = {
        id: 'toast-1',
        type: 'success' as const,
        title: 'Test title',
        message: 'Test message',
        onClose: vi.fn(),
    };

    beforeEach(() => vi.clearAllMocks());

    it('renders title and message', () => {
        render(<Toast {...baseProps} />);
        expect(screen.getByText('Test title')).toBeInTheDocument();
        expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('has role=alert', () => {
        render(<Toast {...baseProps} />);
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders close button', () => {
        render(<Toast {...baseProps} />);
        expect(screen.getByRole('button', { name: /close notification/i })).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
        render(<Toast {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: /close notification/i }));
        // Allow exit animation delay (reducedMotion=false, delay=300ms — stub with 0 for test)
        expect(baseProps.onClose).toHaveBeenCalledWith('toast-1');
    });

    it('renders progress bar when duration > 0', () => {
        render(<Toast {...baseProps} duration={5000} />);
        expect(screen.getByTestId('toast-progress')).toBeInTheDocument();
    });

    it('does not render progress bar when duration=0', () => {
        render(<Toast {...baseProps} duration={0} />);
        expect(screen.queryByTestId('toast-progress')).toBeNull();
    });

    it('renders tip type variant with correct test id', () => {
        render(<Toast {...baseProps} type="tip" />);
        expect(screen.getByTestId('toast-toast-1')).toBeInTheDocument();
    });

    it('calls onClose after duration via rAF', () => {
        render(<Toast {...baseProps} duration={100} />);
        // Advance rAF past 100ms
        act(() => {
            if (rafCallback) {
                rafCallback(0);      // first tick (start time = 0)
                rafCallback(200);    // 200ms elapsed > 100ms duration → dismiss
            }
        });
        expect(baseProps.onClose).toHaveBeenCalledWith('toast-1');
    });
});
