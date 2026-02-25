import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import BlockchainProof from '../BlockchainProof';
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
  stellarTimestamp: '2026-02-20T10:00:05.000Z',
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('BlockchainProof', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  const renderComponent = (overrides: Partial<TipReceipt> = {}) =>
    render(<BlockchainProof receipt={{ ...mockReceipt, ...overrides }} />);

  it('renders the component with correct test id', () => {
    renderComponent();
    expect(screen.getByTestId('blockchain-proof')).toBeInTheDocument();
  });

  it('displays the full transaction hash', () => {
    renderComponent();
    expect(screen.getByTestId('tx-hash')).toHaveTextContent(mockReceipt.stellarTxHash);
  });

  it('renders a link to Stellar Expert', () => {
    renderComponent();
    const link = screen.getByTestId('stellar-explorer-link');
    expect(link).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/tx/${mockReceipt.stellarTxHash}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays the on-chain timestamp', () => {
    renderComponent();
    expect(screen.getByTestId('on-chain-timestamp')).toBeInTheDocument();
  });

  it('displays asset type as Native (XLM) for native assets', () => {
    renderComponent();
    expect(screen.getByTestId('asset-type')).toHaveTextContent('Native (XLM)');
  });

  it('displays raw asset type for non-native assets', () => {
    renderComponent({ assetType: 'credit_alphanum4' });
    expect(screen.getByTestId('asset-type')).toHaveTextContent('credit_alphanum4');
  });

  it('displays asset issuer when present', () => {
    const issuer = 'GISSUER1234567890ABCDEF1234567890ABCDEF1234567890ABCDEFG';
    renderComponent({ assetIssuer: issuer });
    expect(screen.getByTestId('asset-type')).toHaveTextContent(/Issuer:/);
  });

  it('displays source account with full address', () => {
    renderComponent();
    expect(screen.getByTestId('source-account')).toHaveTextContent(mockReceipt.senderAddress);
  });

  it('displays destination account with full address', () => {
    renderComponent();
    expect(screen.getByTestId('destination-account')).toHaveTextContent(
      mockReceipt.receiverAddress,
    );
  });

  it('copies the transaction hash to clipboard', async () => {
    renderComponent();
    const copyBtn = screen.getByTestId('copy-txHash');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockReceipt.stellarTxHash);
  });

  it('copies the sender address to clipboard', async () => {
    renderComponent();
    const copyBtn = screen.getByTestId('copy-senderAddress');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockReceipt.senderAddress);
  });

  it('shows memo when present', () => {
    renderComponent({ stellarMemo: 'Test Memo' });
    expect(screen.getByTestId('stellar-memo')).toHaveTextContent('Test Memo');
  });

  it('does not show memo when not present', () => {
    renderComponent();
    expect(screen.queryByTestId('stellar-memo')).not.toBeInTheDocument();
  });

  it('shows distribution hash when present', () => {
    renderComponent({ distributionHash: 'distrib-hash-abc123' });
    expect(screen.getByTestId('distribution-hash')).toHaveTextContent('distrib-hash-abc123');
  });

  it('does not show distribution hash when not present', () => {
    renderComponent();
    expect(screen.queryByTestId('distribution-hash')).not.toBeInTheDocument();
  });
});
