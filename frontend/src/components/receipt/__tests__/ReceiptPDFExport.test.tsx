import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ReceiptPDFExport from '../ReceiptPDFExport';
import type { TipReceipt } from '../../../types';

/* ------------------------------------------------------------------ */
/*  Test fixture                                                       */
/* ------------------------------------------------------------------ */

const mockReceipt: TipReceipt = {
  id: 'tip-uuid-001',
  artistId: 'artist-001',
  stellarTxHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd',
  senderAddress: 'GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG',
  receiverAddress: 'GXYZ1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG',
  amount: 25.0,
  assetCode: 'XLM',
  assetType: 'native',
  status: 'verified',
  type: 'artist',
  isAnonymous: false,
  asset: 'native',
  isPublic: true,
  createdAt: '2026-02-20T10:00:00.000Z',
  updatedAt: '2026-02-20T10:00:00.000Z',
  artist: {
    id: 'artist-001',
    artistName: 'TestArtist',
    walletAddress: 'GXYZ1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG',
  },
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('ReceiptPDFExport', () => {
  let mockPrintWindow: { document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }; onload: (() => void) | null; print: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrintWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      onload: null,
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
  });

  it('renders the component with correct test id', () => {
    render(<ReceiptPDFExport receipt={mockReceipt} />);
    expect(screen.getByTestId('receipt-pdf-export')).toBeInTheDocument();
  });

  it('renders the download PDF button', () => {
    render(<ReceiptPDFExport receipt={mockReceipt} />);
    expect(screen.getByTestId('export-pdf-button')).toBeInTheDocument();
    expect(screen.getByTestId('export-pdf-button')).toHaveTextContent('Download as PDF');
  });

  it('does not render image export button when receiptRef is not provided', () => {
    render(<ReceiptPDFExport receipt={mockReceipt} />);
    expect(screen.queryByTestId('export-image-button')).not.toBeInTheDocument();
  });

  it('renders image export button when receiptRef is provided', () => {
    const ref = { current: document.createElement('div') };
    render(<ReceiptPDFExport receipt={mockReceipt} receiptRef={ref} />);
    expect(screen.getByTestId('export-image-button')).toBeInTheDocument();
    expect(screen.getByTestId('export-image-button')).toHaveTextContent('Save as Image');
  });

  it('opens a print window when PDF button is clicked', () => {
    render(<ReceiptPDFExport receipt={mockReceipt} />);
    fireEvent.click(screen.getByTestId('export-pdf-button'));
    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=800,height=1100');
    expect(mockPrintWindow.document.write).toHaveBeenCalled();
    expect(mockPrintWindow.document.close).toHaveBeenCalled();
  });

  it('writes HTML content containing the receipt data', () => {
    render(<ReceiptPDFExport receipt={mockReceipt} />);
    fireEvent.click(screen.getByTestId('export-pdf-button'));
    const writtenHTML = mockPrintWindow.document.write.mock.calls[0][0] as string;
    expect(writtenHTML).toContain('TipTune Receipt');
    expect(writtenHTML).toContain(mockReceipt.stellarTxHash);
    expect(writtenHTML).toContain(mockReceipt.senderAddress);
    expect(writtenHTML).toContain(mockReceipt.receiverAddress);
    expect(writtenHTML).toContain('TestArtist');
  });

  it('renders heading and description', () => {
    render(<ReceiptPDFExport receipt={mockReceipt} />);
    expect(screen.getByText('Download Receipt')).toBeInTheDocument();
    expect(screen.getByText(/Save a copy of this tip receipt/)).toBeInTheDocument();
  });
});
