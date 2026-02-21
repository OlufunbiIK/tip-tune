/**
 * AssetToggle Component Tests
 */

import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AssetToggle from './AssetToggle';

describe('AssetToggle', () => {
    const mockOnToggle = vi.fn();

    const defaultProps = {
        currency: 'XLM' as const,
        onToggle: mockOnToggle,
        xlmUsdRate: 0.11,
        walletBalance: { xlm: 1000, usdc: 100 },
        displayAmount: 10,
    };

    it('renders toggle switch', () => {
        render(<AssetToggle {...defaultProps} />);
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('displays current currency', () => {
        render(<AssetToggle {...defaultProps} />);
        expect(screen.getByText('XLM')).toBeInTheDocument();
    });

    it('calls onToggle when switched', async () => {
        const user = userEvent.setup();
        render(<AssetToggle {...defaultProps} />);

        const toggle = screen.getByRole('switch');
        await user.click(toggle);

        expect(mockOnToggle).toHaveBeenCalledWith('USDC');
    });

    it('displays wallet balances', () => {
        render(<AssetToggle {...defaultProps} />);
        expect(screen.getByText(/1000.*XLM/)).toBeInTheDocument();
        expect(screen.getByText(/100.*USDC/)).toBeInTheDocument();
    });

    it('shows conversion rate', () => {
        render(<AssetToggle {...defaultProps} />);
        expect(screen.getByText(/≈ \$1.0/)).toBeInTheDocument();
    });

    it('shows insufficient balance warning when needed', () => {
        render(
            <AssetToggle
                {...defaultProps}
                currency="XLM"
                displayAmount={2000}
                walletBalance={{ xlm: 1000, usdc: 100 }}
            />
        );
        expect(screen.getByText(/Insufficient.*balance/i)).toBeInTheDocument();
    });

    it('hides insufficient balance warning when balance is sufficient', () => {
        render(
            <AssetToggle
                {...defaultProps}
                currency="XLM"
                displayAmount={500}
                walletBalance={{ xlm: 1000, usdc: 100 }}
            />
        );
        expect(screen.queryByText(/Insufficient.*balance/i)).not.toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
        render(<AssetToggle {...defaultProps} />);
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(toggle).toHaveAttribute('aria-label', expect.stringContaining('XLM'));
    });
});
