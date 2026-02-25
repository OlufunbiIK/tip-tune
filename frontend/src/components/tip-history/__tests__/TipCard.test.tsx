import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import TipCard from '../TipCard';
import type { TipHistoryItem } from '../../../types';

/** Wrap component in MemoryRouter since TipCard uses <Link> */
const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

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
    renderWithRouter(<TipCard tip={baseTip} variant="sent" />);
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText(/10.50 XLM/)).toBeInTheDocument();
    expect(screen.getByText('Neon Dreams')).toBeInTheDocument();
  });

  it('renders received variant with tipper name', () => {
    renderWithRouter(<TipCard tip={baseTip} variant="received" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders Stellar transaction link when stellarTxHash is present', () => {
    renderWithRouter(<TipCard tip={baseTip} variant="sent" />);
    const link = screen.getByTestId('stellar-tx-link');
    expect(link).toHaveAttribute('href', expect.stringContaining('stellar.expert'));
    expect(link).toHaveAttribute('href', expect.stringContaining('abc123'));
  });

  it('has tip-card test id', () => {
    renderWithRouter(<TipCard tip={baseTip} variant="sent" />);
    expect(screen.getByTestId('tip-card')).toBeInTheDocument();
  });

  it('renders view receipt link', () => {
    renderWithRouter(<TipCard tip={baseTip} variant="sent" />);
    const link = screen.getByTestId('view-receipt-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/tips/tip-1/receipt');
  });

  it('renders share button when onShare is provided and calls handler on click', async () => {
    const user = userEvent.setup();
    const handleShare = jest.fn();

    renderWithRouter(
      <TipCard
        tip={baseTip}
        variant="sent"
        onShare={handleShare}
      />
    );

    const btn = screen.getByTestId('tip-share-button');
    expect(btn).toBeInTheDocument();

    await user.click(btn);

    expect(handleShare).toHaveBeenCalledWith(
      expect.objectContaining({ id: baseTip.id }),
      'sent'
    );
  });
});
