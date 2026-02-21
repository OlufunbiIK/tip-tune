import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import TipCard from '../TipCard';
import type { TipHistoryItem } from '../../../types';

const baseTip: TipHistoryItem = {
  id: 'tip-1',
  tipperName: 'Alice',
  tipperAvatar: 'https://example.com/avatar.png',
  amount: 10.5,
  message: 'Great track!',
  timestamp: '2024-06-15T14:30:00.000Z',
  trackId: 'track-1',
  trackTitle: 'Neon Dreams',
  artistName: 'Artist A',
  assetCode: 'XLM',
  usdAmount: 2.5,
  stellarTxHash: 'abc123',
};

describe('TipCard', () => {
  it('renders tip with artist/user info and amount', () => {
    render(<TipCard tip={baseTip} variant="sent" />);
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText(/10.50 XLM/)).toBeInTheDocument();
    expect(screen.getByText('Neon Dreams')).toBeInTheDocument();
  });

  it('renders received variant with tipper name', () => {
    render(<TipCard tip={baseTip} variant="received" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders Stellar transaction link when stellarTxHash is present', () => {
    render(<TipCard tip={baseTip} variant="sent" />);
    const link = screen.getByTestId('stellar-tx-link');
    expect(link).toHaveAttribute('href', expect.stringContaining('stellar.expert'));
    expect(link).toHaveAttribute('href', expect.stringContaining('abc123'));
  });

  it('has tip-card test id', () => {
    render(<TipCard tip={baseTip} variant="sent" />);
    expect(screen.getByTestId('tip-card')).toBeInTheDocument();
  });
});
