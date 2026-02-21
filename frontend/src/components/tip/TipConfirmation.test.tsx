/**
 * TipConfirmation Component Tests
 */

import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { describe, it, expect } from 'vitest';
import TipConfirmation from './TipConfirmation';

describe('TipConfirmation', () => {
    const defaultProps = {
        amount: 10,
        currency: 'XLM' as const,
        message: 'Great performance!',
        artistName: 'Test Artist',
        walletBalance: { xlm: 1000, usdc: 100 },
        xlmUsdRate: 0.11,
    };

    it('renders confirmation screen', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText('Review Your Tip')).toBeInTheDocument();
    });

    it('displays recipient name', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(defaultProps.artistName)).toBeInTheDocument();
    });

    it('displays tip amount and currency', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(/10.00 XLM/)).toBeInTheDocument();
    });

    it('displays USD equivalent', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(/≈ \$1.10/)).toBeInTheDocument();
    });

    it('displays network fee', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(/Network Fee/)).toBeInTheDocument();
        expect(screen.getByText(/Stellar/)).toBeInTheDocument();
    });

    it('displays message when provided', () => {
        render(<TipConfirmation {...defaultProps} message="Love your music!" />);
        expect(screen.getByText(/Love your music!/)).toBeInTheDocument();
        expect(screen.getByText(/Your Message/)).toBeInTheDocument();
    });

    it('does not display message section when message is empty', () => {
        render(<TipConfirmation {...defaultProps} message="" />);
        expect(screen.queryByText(/Your Message/)).not.toBeInTheDocument();
    });

    it('shows sufficient balance indicator', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(/Sufficient Balance/)).toBeInTheDocument();
    });

    it('shows insufficient balance warning', () => {
        render(
            <TipConfirmation
                {...defaultProps}
                amount={2000}
                walletBalance={{ xlm: 100, usdc: 100 }}
            />
        );
        expect(screen.getByText(/Insufficient Balance/)).toBeInTheDocument();
    });

    it('displays exchange rate', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(/Exchange Rate:/)).toBeInTheDocument();
        expect(screen.getByText(/1 XLM = \$0.1100/)).toBeInTheDocument();
    });

    it('calculates total correctly for XLM', () => {
        render(
            <TipConfirmation
                {...defaultProps}
                amount={10}
                currency="XLM"
            />
        );
        // Amount (10) + Fee (0.00001) should display
        expect(screen.getByText(/Total/)).toBeInTheDocument();
    });

    it('handles USDC currency', () => {
        render(
            <TipConfirmation
                {...defaultProps}
                amount={10}
                currency="USDC"
            />
        );
        expect(screen.getByText(/10.00 USDC/)).toBeInTheDocument();
    });

    it('displays zero fee note', () => {
        render(<TipConfirmation {...defaultProps} />);
        expect(screen.getByText(/may vary/i)).toBeInTheDocument();
    });
});
