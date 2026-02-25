import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import ReceiptQRCode from '../ReceiptQRCode';

const TEST_TX_HASH = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd';

describe('ReceiptQRCode', () => {
  it('renders with correct test id', () => {
    render(<ReceiptQRCode stellarTxHash={TEST_TX_HASH} />);
    expect(screen.getByTestId('receipt-qr-code')).toBeInTheDocument();
  });

  it('renders a QR code SVG container', () => {
    render(<ReceiptQRCode stellarTxHash={TEST_TX_HASH} />);
    const container = screen.getByTestId('qr-svg-container');
    expect(container).toBeInTheDocument();
    // QRCodeSVG should render an <svg> inside the container
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders a link to Stellar Expert with correct href', () => {
    render(<ReceiptQRCode stellarTxHash={TEST_TX_HASH} />);
    const link = screen.getByTestId('qr-explorer-link');
    expect(link).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/tx/${TEST_TX_HASH}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders heading text', () => {
    render(<ReceiptQRCode stellarTxHash={TEST_TX_HASH} />);
    expect(screen.getByText('Transaction QR Code')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ReceiptQRCode stellarTxHash={TEST_TX_HASH} />);
    expect(
      screen.getByText(/Scan to verify this transaction/),
    ).toBeInTheDocument();
  });

  it('accepts custom size prop', () => {
    render(<ReceiptQRCode stellarTxHash={TEST_TX_HASH} size={256} />);
    const container = screen.getByTestId('qr-svg-container');
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // QRCodeSVG sets width/height as attributes
    expect(svg).toHaveAttribute('width', '256');
    expect(svg).toHaveAttribute('height', '256');
  });
});
