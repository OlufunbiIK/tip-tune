import { useState } from 'react';
import {
  Wallet,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import type { Network } from '../../types/wallet';

const WalletSettings = () => {
  const {
    isConnected,
    isConnecting,
    publicKey,
    network,
    balance,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    error,
  } = useWallet();

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleCopyAddress = async () => {
    if (!publicKey) return;

    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalance();
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDisconnectConfirm(false);
  };

  const handleNetworkChange = async (newNetwork: Network) => {
    try {
      await switchNetwork(newNetwork);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const getExplorerUrl = (address: string) => {
    const base = network === 'mainnet'
      ? 'https://stellar.expert/explorer/public'
      : 'https://stellar.expert/explorer/testnet';
    return `${base}/account/${address}`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-deep-slate mb-2">No Wallet Connected</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Connect your Stellar wallet to access all features, receive tips, and manage your account.
        </p>
        <button
          onClick={connect}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-blue hover:bg-secondary-indigo text-white font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </>
          )}
        </button>
        {error && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left max-w-md mx-auto">
            <p className="text-amber-800 font-medium mb-2">Connection Failed</p>
            <p className="text-amber-700 text-sm mb-3">{error}</p>
            {error.toLowerCase().includes('not installed') && (
              <div className="text-sm text-gray-600">
                <p className="mb-2">To connect your wallet:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Install the <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline font-medium">Freighter wallet extension</a></li>
                  <li>Create or import a Stellar wallet</li>
                  <li>Return here and click Connect Wallet</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left max-w-md mx-auto">
          <p className="text-gray-700 font-medium mb-2">Don't have a wallet?</p>
          <p className="text-gray-500 text-sm mb-3">
            You'll need the Freighter browser extension to connect your Stellar wallet.
          </p>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-blue hover:text-secondary-indigo text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Get Freighter Wallet
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-deep-slate mb-6">Wallet Settings</h2>

      {/* Connected Wallet Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-blue" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
              <div className="flex items-center gap-2">
                <span className="text-deep-slate font-mono text-lg">
                  {publicKey ? truncateAddress(publicKey) : '---'}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 hover:text-deep-slate" />
                  )}
                </button>
                {publicKey && (
                  <a
                    href={getExplorerUrl(publicKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 hover:text-deep-slate" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-600 text-sm">Connected</span>
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-deep-slate">Balance</h3>
          <button
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-deep-slate transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-deep-slate">
            {balance?.balance || '0.00'}
          </span>
          <span className="text-gray-500">{balance?.asset || 'XLM'}</span>
        </div>
      </div>

      {/* Network Selection */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Network</h3>
        <div className="flex gap-4">
          <button
            onClick={() => handleNetworkChange('mainnet')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              network === 'mainnet'
                ? 'border-primary-blue bg-blue-50 text-deep-slate'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className="font-medium">Mainnet</span>
            <p className="text-xs mt-1 opacity-70">Production network</p>
          </button>
          <button
            onClick={() => handleNetworkChange('testnet')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              network === 'testnet'
                ? 'border-primary-blue bg-blue-50 text-deep-slate'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className="font-medium">Testnet</span>
            <p className="text-xs mt-1 opacity-70">Testing network</p>
          </button>
        </div>
      </div>

      {/* Disconnect Section */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-deep-slate mb-1">Disconnect Wallet</h3>
            <p className="text-gray-600 text-sm mb-4">
              Disconnecting your wallet will log you out and you'll need to reconnect to access your account.
            </p>
            {showDisconnectConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-red-500 text-sm">Are you sure?</span>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Yes, Disconnect
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-deep-slate text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-medium rounded-lg border border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSettings;
