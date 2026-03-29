import React from 'react';
import { useWalletConnectionStatus, useWalletActions, useEnhancedWallet } from '../../hooks/useEnhancedWallet';
import { truncateAddress } from '../../utils/stellar';
import type { WalletBalance } from '../../types/wallet';

/**
 * Enhanced Wallet Connection Component with consistent UX
 * 
 * This component demonstrates the improved wallet connection state management
 * with clear status indicators, retry affordances, and error handling.
 */
const EnhancedWalletConnect: React.FC = () => {
  const {
    getConnectionMessage,
    getErrorSolutions,
    retryConnection,
    clearError,
  } = useWalletConnectionStatus();

  const { connect, disconnect, refreshBalance } = useWalletActions();
  const { publicKey, balance, network } = useEnhancedWallet();
  
  const message = getConnectionMessage();
  const solutions = getErrorSolutions();

  const handleRetry = async () => {
    await retryConnection();
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  // Get connection state from enhanced wallet
  const { connectionState } = useEnhancedWallet();

  // Render different UI based on connection state
  switch (connectionState) {
    case 'connected':
      return <ConnectedState publicKey={publicKey} balance={balance} network={network} onDisconnect={handleDisconnect} onRefresh={refreshBalance} />;
    
    case 'connecting':
      return <ConnectingState message={message} />;
    
    case 'rejected':
      return <RejectedState onRetry={handleRetry} onClear={clearError} />;
    
    case 'locked':
      return <LockedState onRetry={handleRetry} solutions={solutions} />;
    
    case 'not_installed':
      return <NotInstalledState solutions={solutions} />;
    
    case 'error':
      return <ErrorState onRetry={handleRetry} onClear={clearError} message={message} />;
    
    case 'disconnected':
    default:
      return <DisconnectedState onConnect={handleConnect} />;
  }
};

// State-specific components for better organization
const ConnectedState: React.FC<{
  publicKey: string | null;
  balance: WalletBalance | null;
  network: string;
  onDisconnect: () => void;
  onRefresh: () => void;
}> = ({ publicKey, balance, network, onDisconnect, onRefresh }) => {
  
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-blue-primary/30">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-mint rounded-full animate-pulse"></span>
            <span className="text-mint font-medium flex items-center gap-1">
              ✅ Connected
            </span>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-white text-sm transition-colors"
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
            <span className="text-ice-blue text-sm font-medium min-w-[80px]">Address:</span>
            <span className="text-white font-mono text-sm" title={publicKey || ''}>
              {publicKey ? truncateAddress(publicKey) : '---'}
            </span>
          </div>

          {balance && (
            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
              <span className="text-ice-blue text-sm font-medium min-w-[80px]">Balance:</span>
              <span className="text-white font-mono text-sm">
                {balance.balance} {balance.asset}
              </span>
              <button
                onClick={onRefresh}
                className="ml-auto px-2 py-1 text-blue-primary hover:text-ice-blue transition-colors text-lg"
                aria-label="Refresh balance"
                title="Refresh balance"
              >
                ↻
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
            <span className="text-ice-blue text-sm font-medium min-w-[80px]">Network:</span>
            <span className="text-white font-mono text-sm capitalize">{network}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectingState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-blue-primary/30 text-center">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-blue-primary font-medium">⏳ Connecting...</span>
      </div>
      <p className="text-ice-blue text-sm">{message}</p>
    </div>
  );
};

const RejectedState: React.FC<{
  onRetry: () => void;
  onClear: () => void;
}> = ({ onRetry, onClear }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-red-500/30 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">❌</span>
        <span className="text-red-400 font-medium">Connection Rejected</span>
      </div>
      
      <p className="text-ice-blue text-sm mb-6">
        You rejected the connection request. Try again if you changed your mind.
      </p>
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-primary hover:bg-blue-600 text-navy font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const LockedState: React.FC<{
  onRetry: () => void;
  solutions: { primary: string; secondary?: string };
}> = ({ onRetry, solutions }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-yellow-500/30 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">🔒</span>
        <span className="text-yellow-400 font-medium">Wallet Locked</span>
      </div>
      
      <p className="text-ice-blue text-sm mb-2">{solutions.primary}</p>
      {solutions.secondary && (
        <p className="text-gray-400 text-xs mb-6">{solutions.secondary}</p>
      )}
      
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-navy font-medium rounded-lg transition-colors"
      >
        Unlock & Retry
      </button>
    </div>
  );
};

const NotInstalledState: React.FC<{
  solutions: { primary: string; secondary?: string; installUrl?: string };
}> = ({ solutions }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-orange-500/30 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <span className="text-orange-400 font-medium">Wallet Not Installed</span>
      </div>
      
      <p className="text-ice-blue text-sm mb-2">{solutions.primary}</p>
      {solutions.secondary && (
        <p className="text-gray-400 text-xs mb-6">{solutions.secondary}</p>
      )}
      
      {solutions.installUrl && (
        <a
          href={solutions.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
        >
          Install Freighter
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
};

const ErrorState: React.FC<{
  onRetry: () => void;
  onClear: () => void;
  message: string;
}> = ({ onRetry, onClear, message }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-red-500/30 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <span className="text-red-400 font-medium">Connection Error</span>
      </div>
      
      <p className="text-ice-blue text-sm mb-6">{message}</p>
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const DisconnectedState: React.FC<{
  onConnect: () => void;
}> = ({ onConnect }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-navy/80 rounded-xl border border-blue-primary/30 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">🔌</span>
        <span className="text-gray-400 font-medium">Wallet Disconnected</span>
      </div>
      
      <p className="text-ice-blue text-sm mb-6">
        Connect your Freighter wallet to access all features
      </p>
      
      <button
        onClick={onConnect}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-primary to-ice-blue text-navy font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-blue-primary/40 flex items-center justify-center gap-2"
      >
        <span>🔗</span>
        Connect Freighter Wallet
      </button>
    </div>
  );
};

export default EnhancedWalletConnect;
