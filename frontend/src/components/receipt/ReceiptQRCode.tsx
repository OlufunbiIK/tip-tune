import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ReceiptQRCodeProps {
  /** The Stellar transaction hash to encode */
  stellarTxHash: string;
  /** Optional size in px (default 180) */
  size?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ReceiptQRCode: React.FC<ReceiptQRCodeProps> = ({
  stellarTxHash,
  size = 180,
}) => {
  const explorerUrl = `${STELLAR_EXPLORER_BASE}/${stellarTxHash}`;

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      aria-labelledby="qr-code-heading"
      data-testid="receipt-qr-code"
    >
      <h2
        id="qr-code-heading"
        className="mb-3 text-lg font-display font-semibold text-gray-900 dark:text-white"
      >
        Transaction QR Code
      </h2>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Scan to verify this transaction on the Stellar blockchain.
      </p>

      <div className="flex flex-col items-center gap-4">
        <div className="rounded-xl bg-white p-4 shadow-inner" data-testid="qr-svg-container">
          <QRCodeSVG
            value={explorerUrl}
            size={size}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0B1C2D"
          />
        </div>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-blue hover:underline"
          data-testid="qr-explorer-link"
        >
          Open in Stellar Expert
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
};

export default ReceiptQRCode;
