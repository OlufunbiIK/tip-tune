import { render, waitFor } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TipReceiptPage from '../TipReceiptPage';
import { tipService } from '../../services/tipService';
import type { TipReceipt } from '../../types';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock('../../services/tipService', () => ({
  tipService: {
    getReceipt: vi.fn(),
  },
}));

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => ({
    publicKey: 'GTEST1234',
    balance: [{ asset: 'native', balance: '100.00' }],
    isConnected: true,
  }),
}));

// Mock QRCodeSVG to avoid canvas rendering in tests
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <svg data-testid="mock-qr" data-value={value} width={size} height={size} />
  ),
}));

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
  amount: 25.0,
  assetCode: 'XLM',
  assetType: 'native',
  status: 'verified',
  type: 'track',
  isAnonymous: false,
  asset: 'native',
  isPublic: true,
  createdAt: '2026-02-20T10:00:00.000Z',
  updatedAt: '2026-02-20T10:00:00.000Z',
  stellarTimestamp: '2026-02-20T10:00:05.000Z',
  exchangeRate: 0.11,
  fiatAmount: 2.75,
  fiatCurrency: 'USD',
  message: 'Love this track!',
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
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function renderPage(tipId = 'tip-uuid-001') {
  return render(
    <MemoryRouter initialEntries={[`/tips/${tipId}/receipt`]}>
      <Routes>
        <Route path="/tips/:tipId/receipt" element={<TipReceiptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('TipReceiptPage', () => {
  beforeEach(() => {
    vi.mocked(tipService.getReceipt).mockResolvedValue(mockReceipt);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    // Don't resolve the promise yet
    vi.mocked(tipService.getReceipt).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('receipt-loading')).toBeInTheDocument();
  });

  it('renders the full receipt page after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('tip-receipt-page')).toBeInTheDocument();
    });
  });

  it('displays the page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tip Receipt')).toBeInTheDocument();
    });
  });

  it('displays the receipt ID', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('tip-uuid-001')).toBeInTheDocument();
    });
  });

  it('renders TransactionDetails section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('transaction-details')).toBeInTheDocument();
    });
  });

  it('renders BlockchainProof section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('blockchain-proof')).toBeInTheDocument();
    });
  });

  it('renders ReceiptQRCode section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('receipt-qr-code')).toBeInTheDocument();
    });
  });

  it('renders ReceiptPDFExport section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('receipt-pdf-export')).toBeInTheDocument();
    });
  });

  it('renders Tip Again button when artist is loaded', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('tip-again-button')).toBeInTheDocument();
      expect(screen.getByTestId('tip-again-button')).toHaveTextContent('Tip Again');
    });
  });

  it('renders share button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });
  });

  it('renders back button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });
  });

  it('renders link to tip history', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('← View all tip history')).toBeInTheDocument();
    });
  });

  it('shows error state when API returns 404', async () => {
    vi.mocked(tipService.getReceipt).mockRejectedValue({
      response: { status: 404 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('receipt-error')).toBeInTheDocument();
      expect(screen.getByText(/Tip not found/)).toBeInTheDocument();
    });
  });

  it('shows generic error state on API failure', async () => {
    vi.mocked(tipService.getReceipt).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('receipt-error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('retries fetching on retry button click', async () => {
    vi.mocked(tipService.getReceipt).mockRejectedValueOnce(new Error('Fail'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('receipt-error')).toBeInTheDocument();
    });

    vi.mocked(tipService.getReceipt).mockResolvedValueOnce(mockReceipt);
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => {
      expect(screen.getByTestId('tip-receipt-page')).toBeInTheDocument();
    });
  });

  it('calls getReceipt with the tipId from URL params', async () => {
    renderPage('custom-tip-id');
    await waitFor(() => {
      expect(tipService.getReceipt).toHaveBeenCalledWith('custom-tip-id');
    });
  });

  it('handles share button click with clipboard fallback', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: undefined,
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('share-button'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
