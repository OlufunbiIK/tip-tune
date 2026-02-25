import React, { useCallback } from 'react';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Hash,
  Layers,
  Clock,
} from 'lucide-react';
import type { TipReceipt } from '../../types';
import { truncateAddress } from '../../utils/stellar';
import { formatDate } from '../../utils/formatter';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BlockchainProofProps {
  receipt: TipReceipt;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const BlockchainProof: React.FC<BlockchainProofProps> = ({ receipt }) => {
  const {
    stellarTxHash,
    stellarTimestamp,
    senderAddress,
    receiverAddress,
    assetType,
    assetIssuer,
    distributionHash,
    stellarMemo,
    createdAt,
  } = receipt;

  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = useCallback(
    async (text: string, field: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        // Fallback for insecure context
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      }
    },
    [],
  );

  const explorerTxUrl = `${STELLAR_EXPLORER_BASE}/tx/${stellarTxHash}`;
  const explorerSenderUrl = `${STELLAR_EXPLORER_BASE}/account/${senderAddress}`;
  const explorerReceiverUrl = `${STELLAR_EXPLORER_BASE}/account/${receiverAddress}`;

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      aria-labelledby="blockchain-proof-heading"
      data-testid="blockchain-proof"
    >
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-green-500" />
        <h2
          id="blockchain-proof-heading"
          className="text-lg font-display font-semibold text-gray-900 dark:text-white"
        >
          Blockchain Proof
        </h2>
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        This tip is permanently recorded on the Stellar blockchain and can be independently
        verified by anyone.
      </p>

      <dl className="space-y-4">
        {/* Transaction Hash */}
        <ProofRow
          icon={<Hash className="h-4 w-4" />}
          label="Transaction Hash"
          testId="tx-hash"
        >
          <div className="flex items-center gap-2">
            <code className="break-all rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {stellarTxHash}
            </code>
            <CopyButton
              text={stellarTxHash}
              field="txHash"
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          </div>
          <a
            href={explorerTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-blue hover:underline"
            data-testid="stellar-explorer-link"
          >
            View on Stellar Expert
            <ExternalLink className="h-3 w-3" />
          </a>
        </ProofRow>

        {/* Timestamp */}
        <ProofRow
          icon={<Clock className="h-4 w-4" />}
          label="On-chain Timestamp"
          testId="on-chain-timestamp"
        >
          <span className="text-sm text-gray-900 dark:text-white">
            {formatDate(stellarTimestamp ?? createdAt)}
          </span>
        </ProofRow>

        {/* Ledger / Block info */}
        <ProofRow
          icon={<Layers className="h-4 w-4" />}
          label="Asset Type"
          testId="asset-type"
        >
          <span className="text-sm text-gray-900 dark:text-white">
            {assetType === 'native' ? 'Native (XLM)' : assetType}
          </span>
          {assetIssuer && (
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Issuer: {truncateAddress(assetIssuer, 8, 8)}
            </span>
          )}
        </ProofRow>

        {/* Sender account */}
        <ProofRow icon={null} label="Source Account" testId="source-account">
          <div className="flex items-center gap-2">
            <code className="break-all rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {senderAddress}
            </code>
            <CopyButton
              text={senderAddress}
              field="senderAddress"
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          </div>
          <a
            href={explorerSenderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-blue dark:text-gray-400"
          >
            View account <ExternalLink className="h-3 w-3" />
          </a>
        </ProofRow>

        {/* Destination account */}
        <ProofRow icon={null} label="Destination Account" testId="destination-account">
          <div className="flex items-center gap-2">
            <code className="break-all rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {receiverAddress}
            </code>
            <CopyButton
              text={receiverAddress}
              field="receiverAddress"
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          </div>
          <a
            href={explorerReceiverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-blue dark:text-gray-400"
          >
            View account <ExternalLink className="h-3 w-3" />
          </a>
        </ProofRow>

        {/* Stellar Memo */}
        {stellarMemo && (
          <ProofRow icon={null} label="Memo" testId="stellar-memo">
            <span className="text-sm text-gray-900 dark:text-white">{stellarMemo}</span>
          </ProofRow>
        )}

        {/* Distribution hash (if tip was split among collaborators) */}
        {distributionHash && (
          <ProofRow icon={null} label="Distribution Hash" testId="distribution-hash">
            <div className="flex items-center gap-2">
              <code className="break-all rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {distributionHash}
              </code>
              <CopyButton
                text={distributionHash}
                field="distributionHash"
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            </div>
          </ProofRow>
        )}
      </dl>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  Internal sub-components                                            */
/* ------------------------------------------------------------------ */

interface ProofRowProps {
  icon: React.ReactNode;
  label: string;
  testId: string;
  children: React.ReactNode;
}

const ProofRow: React.FC<ProofRowProps> = ({ icon, label, testId, children }) => (
  <div
    className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-700/20"
    data-testid={testId}
  >
    <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {icon}
      {label}
    </dt>
    <dd>{children}</dd>
  </div>
);

interface CopyButtonProps {
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, field, copiedField, onCopy }) => (
  <button
    type="button"
    onClick={() => onCopy(text, field)}
    className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
    aria-label={copiedField === field ? 'Copied' : 'Copy to clipboard'}
    data-testid={`copy-${field}`}
  >
    {copiedField === field ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <Copy className="h-4 w-4" />
    )}
  </button>
);

export default BlockchainProof;
