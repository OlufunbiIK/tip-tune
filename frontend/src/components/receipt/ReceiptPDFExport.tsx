import React, { useCallback, useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { TipReceipt } from '../../types';
import { formatStellarAmount, truncateAddress } from '../../utils/stellar';
import { formatDate, formatCurrency } from '../../utils/formatter';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ReceiptPDFExportProps {
  receipt: TipReceipt;
  /** Ref to the receipt content area to capture as image  */
  receiptRef?: React.RefObject<HTMLElement | null>;
}

/* ------------------------------------------------------------------ */
/*  Helper: build a printable HTML string for the receipt              */
/* ------------------------------------------------------------------ */

function buildPrintableHTML(receipt: TipReceipt): string {
  const usdValue =
    receipt.fiatAmount != null
      ? receipt.fiatAmount
      : receipt.exchangeRate != null
        ? receipt.amount * receipt.exchangeRate
        : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>TipTune Receipt – ${receipt.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #4DA3FF; padding-bottom: 16px; }
    .header h1 { font-size: 24px; color: #0B1C2D; }
    .header p { font-size: 12px; color: #666; margin-top: 4px; }
    .amount-section { text-align: center; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
    .amount { font-size: 36px; font-weight: 700; color: #0B1C2D; }
    .asset { font-size: 18px; color: #4DA3FF; margin-left: 4px; }
    .usd { font-size: 14px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #4DA3FF; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .row .label { color: #64748b; }
    .row .value { color: #1a1a2e; font-weight: 500; text-align: right; max-width: 60%; word-break: break-all; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    .status-verified { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .status-failed { background: #fecaca; color: #991b1b; }
    .status-reversed { background: #e2e8f0; color: #475569; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>TipTune Receipt</h1>
    <p>Transaction Confirmation</p>
  </div>

  <div class="amount-section">
    <span class="status status-${receipt.status}">${receipt.status === 'verified' ? 'Confirmed' : receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}</span>
    <div class="amount">${formatStellarAmount(receipt.amount)} <span class="asset">${receipt.assetCode}</span></div>
    ${usdValue != null ? `<div class="usd">≈ ${formatCurrency(usdValue)} USD</div>` : ''}
  </div>

  <div class="section">
    <h2>Transaction Details</h2>
    <div class="row"><span class="label">Receipt ID</span><span class="value mono">${receipt.id}</span></div>
    <div class="row"><span class="label">Date & Time</span><span class="value">${formatDate(receipt.stellarTimestamp ?? receipt.createdAt)}</span></div>
    <div class="row"><span class="label">Tip Type</span><span class="value">${receipt.type === 'track' ? 'Track Tip' : 'Artist Tip'}</span></div>
    <div class="row"><span class="label">Asset</span><span class="value">${receipt.assetCode} (${receipt.assetType === 'native' ? 'Native' : receipt.assetType})</span></div>
    ${receipt.message ? `<div class="row"><span class="label">Message</span><span class="value">"${receipt.message}"</span></div>` : ''}
    ${receipt.artist ? `<div class="row"><span class="label">Artist</span><span class="value">${receipt.artist.artistName}</span></div>` : ''}
    ${receipt.track ? `<div class="row"><span class="label">Track</span><span class="value">${receipt.track.title}</span></div>` : ''}
  </div>

  <div class="section">
    <h2>Blockchain Proof</h2>
    <div class="row"><span class="label">Transaction Hash</span><span class="value mono">${receipt.stellarTxHash}</span></div>
    <div class="row"><span class="label">Source Account</span><span class="value mono">${receipt.senderAddress}</span></div>
    <div class="row"><span class="label">Destination Account</span><span class="value mono">${receipt.receiverAddress}</span></div>
    <div class="row"><span class="label">Stellar Explorer</span><span class="value"><a href="https://stellar.expert/explorer/testnet/tx/${receipt.stellarTxHash}">View Transaction</a></span></div>
    ${receipt.stellarMemo ? `<div class="row"><span class="label">Memo</span><span class="value">${receipt.stellarMemo}</span></div>` : ''}
    ${receipt.distributionHash ? `<div class="row"><span class="label">Distribution Hash</span><span class="value mono">${receipt.distributionHash}</span></div>` : ''}
  </div>

  <div class="footer">
    <p>This receipt was generated by TipTune &mdash; Real-time music tips powered by Stellar</p>
    <p>Verified on the Stellar blockchain • ${new Date().toISOString().split('T')[0]}</p>
  </div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ReceiptPDFExport: React.FC<ReceiptPDFExportProps> = ({ receipt, receiptRef }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  /**
   * Primary export: open a new window with a styled printable receipt.
   * The user can then use the browser's Print → Save as PDF.
   */
  const handlePDFExport = useCallback(() => {
    setIsExporting(true);
    try {
      const html = buildPrintableHTML(receipt);
      const printWindow = window.open('', '_blank', 'width=800,height=1100');
      if (!printWindow) {
        alert('Please allow popups for this site to download the receipt.');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      // Trigger print dialog after content loads
      printWindow.onload = () => {
        printWindow.print();
      };
    } finally {
      setIsExporting(false);
    }
  }, [receipt]);

  /**
   * Secondary export: capture the on-screen receipt as a PNG image.
   */
  const handleImageExport = useCallback(async () => {
    if (!receiptRef?.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `tiptune-receipt-${receipt.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture receipt image:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [receipt.id, receiptRef]);

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      data-testid="receipt-pdf-export"
    >
      <h2 className="mb-3 text-lg font-display font-semibold text-gray-900 dark:text-white">
        Download Receipt
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Save a copy of this tip receipt for your records.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* PDF / Print */}
        <button
          type="button"
          onClick={handlePDFExport}
          disabled={isExporting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="export-pdf-button"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Download as PDF
        </button>

        {/* PNG image capture */}
        {receiptRef && (
          <button
            type="button"
            onClick={handleImageExport}
            disabled={isCapturing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            data-testid="export-image-button"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Save as Image
          </button>
        )}
      </div>
    </section>
  );
};

export default ReceiptPDFExport;
