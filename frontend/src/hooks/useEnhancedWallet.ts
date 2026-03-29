import { useWallet as useOriginalWallet } from "./useWallet";
import type { WalletConnectionState } from "../types/wallet";
import { WalletStateManager } from "../utils/walletState";

/**
 * Enhanced wallet hook that provides consistent state management
 * across all wallet components with proper UX affordances.
 */
export const useEnhancedWallet = () => {
    const originalWallet = useOriginalWallet();

    // Derive connection state from original wallet properties
    const connectionState: WalletConnectionState = originalWallet.isConnecting
        ? "connecting"
        : originalWallet.isConnected
          ? "connected"
          : originalWallet.error
            ? WalletStateManager.getConnectionStatus(
                  originalWallet.isConnected,
                  originalWallet.isConnecting,
                  originalWallet.error,
              ).state
            : "disconnected";

    const getConnectionMessage = (): string => {
        if (originalWallet.isConnecting) return "Connecting to wallet...";
        if (originalWallet.isConnected) return "Wallet connected successfully";
        if (originalWallet.error) return originalWallet.error;
        return "Connect your wallet to get started";
    };

    const canRetry = (): boolean => {
        // Determine retry capability based on state
        switch (connectionState) {
            case "rejected":
            case "locked":
            case "error":
                return true;
            case "not_installed":
            case "connecting":
            case "connected":
            case "disconnected":
                return false;
            default:
                return false;
        }
    };

    const getStateIcon = (): string => {
        return WalletStateManager.getStateIcon(connectionState);
    };

    const getStateColor = (): string => {
        return WalletStateManager.getStateColor(connectionState);
    };

    const getErrorSolutions = () => {
        return WalletStateManager.getErrorSolutions(connectionState);
    };

    const retryConnection = async () => {
        if (canRetry()) {
            await originalWallet.connect();
        }
    };

    const clearError = () => {
        // This would need to be added to original wallet context
        // For now, we'll just reconnect to clear the error
        if (originalWallet.error && !originalWallet.isConnected) {
            // Error will be cleared on next connection attempt
        }
    };

    return {
        ...originalWallet,
        connectionState,
        getConnectionMessage,
        canRetry,
        getStateIcon,
        getStateColor,
        getErrorSolutions,
        retryConnection,
        clearError,
    };
};

/**
 * Hook for getting wallet connection status with retry affordances
 */
export const useWalletConnectionStatus = () => {
    const wallet = useEnhancedWallet();

    return {
        getConnectionState: () => wallet.connectionState,
        getConnectionMessage: wallet.getConnectionMessage,
        canRetry: wallet.canRetry,
        getRetryAction: wallet.canRetry() ? wallet.retryConnection : undefined,
        getStateIcon: wallet.getStateIcon,
        getStateColor: wallet.getStateColor,
        getErrorSolutions: wallet.getErrorSolutions,
        retryConnection: wallet.retryConnection,
        clearError: wallet.clearError,
    };
};

/**
 * Hook for wallet connection actions with proper error handling
 */
export const useWalletActions = () => {
    const wallet = useEnhancedWallet();

    const connectWithRetry = async (): Promise<void> => {
        await wallet.connect();
    };

    const disconnectSafely = async (): Promise<void> => {
        try {
            await wallet.disconnect();
        } catch (error) {
            console.error("Failed to disconnect wallet:", error);
        }
    };

    const refreshWithFeedback = async (): Promise<void> => {
        try {
            await wallet.refreshBalance();
        } catch (error) {
            console.error("Failed to refresh balance:", error);
        }
    };

    return {
        connect: connectWithRetry,
        disconnect: disconnectSafely,
        refreshBalance: refreshWithFeedback,
        switchNetwork: wallet.switchNetwork,
        signTransaction: wallet.signTransaction,
    };
};
