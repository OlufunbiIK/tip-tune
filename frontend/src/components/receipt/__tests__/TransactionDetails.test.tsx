import { render, waitFor } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import TransactionDetails, { StatusBadge } from '../TransactionDetails';
import type { TipReceipt } from '../../../types';

/* ------------------------------------------------------------------ */
/*  Test fixture                                                       */
/* ------------------------------------------------------------------ */

const mockReceipt: TipReceipt = {
  id: 'tip-uuid-001',
  artistId: 'artist-001',
  trackId: 'track-001',
  stellarTxHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd',
  senderAddress: 'GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG',
  receiverAddress: 'GXYZ1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG',
  amount: 25.1234567,
  assetCode: 'XLM',
  assetType: 'native',
  status: 'verified',
  type: 'track',
  isAnonymous: false,
  asset: 'native',
  isPublic: true,
  createdAt: '2026-02-20T10:00:00.000Z',
  updatedAt: '2026-02-20T10:00:00.000Z',
  exchangeRate: 0.11,
  fiatCurrency: 'USD',
  fiatAmount: 2.76,
  message: 'Love this track!',
  stellarTimestamp: '2026-02-20T10:00:05.000Z',
  artist: {
    id: 'artist-001',
    artistName: 'TestArtist',
    profileImage: 'https://example.com/artist.jpg',
    walletAddress: 'GXYZ1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG',
    genre: 'Electronic',
  },
  track: {
    id: 'track-001',
    title: 'Neon Dreams',
    coverArtUrl: 'https://example.com/cover.jpg',
  },
};

/* ------------------------------------------------------------------ */
/*  StatusBadge tests                                                  */
/* ------------------------------------------------------------------ */

describe('StatusBadge', () => {
  it.each([
    ['verified', 'Confirmed'],
    ['pending', 'Pending'],
    ['failed', 'Failed'],
    ['reversed', 'Reversed'],
  ] as const)('renders %s status correctly', (status, expectedLabel) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent(expectedLabel);
  });
});

/* ------------------------------------------------------------------ */
/*  TransactionDetails tests                                           */
/* ------------------------------------------------------------------ */

describe('TransactionDetails', () => {
  const renderComponent = (overrides: Partial<TipReceipt> = {}) =>
    render(<TransactionDetails receipt={{ ...mockReceipt, ...overrides }} />);

  it('renders the component with correct test id', () => {
    renderComponent();
    expect(screen.getByTestId('transaction-details')).toBeInTheDocument();
  });

  it('displays the tip amount in Stellar format', () => {
    renderComponent();
    expect(screen.getByTestId('tip-amount')).toHaveTextContent('25.1234567');
    expect(screen.getByTestId('tip-amount')).toHaveTextContent('XLM');
  });

  it('displays the USD value', () => {
    renderComponent();
    expect(screen.getByTestId('tip-usd-value')).toHaveTextContent('$2.76');
  });

  it('displays artist name when artist relation is loaded', () => {
    renderComponent();
    expect(screen.getByText('TestArtist')).toBeInTheDocument();
  });

  it('displays artist genre badge', () => {
    renderComponent();
    expect(screen.getByText('Electronic')).toBeInTheDocument();
  });

  it('displays track title when track relation is loaded', () => {
    renderComponent();
    expect(screen.getByText('Neon Dreams')).toBeInTheDocument();
  });

  it('displays the tip message', () => {
    renderComponent();
    expect(screen.getByText(/"Love this track!"/)).toBeInTheDocument();
  });

  it('shows "Track Tip" for track type', () => {
    renderComponent({ type: 'track' });
    expect(screen.getByText('Track Tip')).toBeInTheDocument();
  });

  it('shows "Artist Tip" for artist type', () => {
    renderComponent({ type: 'artist' });
    expect(screen.getByText('Artist Tip')).toBeInTheDocument();
  });

  it('renders truncated sender address', () => {
    renderComponent();
    // truncateAddress with 6, 6 -> first 6 chars + last 6 chars
    expect(screen.getByText(/GABC12.*BCDEFG/)).toBeInTheDocument();
  });

  it('does not render track section when track is undefined', () => {
    renderComponent({ track: undefined });
    expect(screen.queryByText('Neon Dreams')).not.toBeInTheDocument();
  });

  it('does not render message section when message is undefined', () => {
    renderComponent({ message: undefined });
    expect(screen.queryByText(/Love this track/)).not.toBeInTheDocument();
  });

  it('calculates USD from exchangeRate when fiatAmount is null', () => {
    renderComponent({ fiatAmount: undefined, exchangeRate: 0.15 });
    // 25.1234567 * 0.15 ≈ 3.77
    expect(screen.getByTestId('tip-usd-value')).toHaveTextContent('$3.77');
  });

  it('shows network fee', () => {
    renderComponent();
    expect(screen.getByText('0.00001 XLM (base fee)')).toBeInTheDocument();
  });

  it('renders artist profile image when available', () => {
    renderComponent();
    const img = screen.getByAltText('TestArtist');
    expect(img).toHaveAttribute('src', 'https://example.com/artist.jpg');
  });

  it('renders artist initial when no profile image', () => {
    renderComponent({
      artist: { ...mockReceipt.artist!, profileImage: undefined },
    });
    expect(screen.getByText('T')).toBeInTheDocument();
  });
});
