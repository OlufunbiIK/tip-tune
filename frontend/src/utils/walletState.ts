import {
    WalletConnectionState,
    WalletConnectionStatus,
    WalletErrorCode,
    WalletError,
} from "../types/wallet";

export class WalletStateManager {
    private static getStateFromError(
        error: WalletError | Error | null,
    ): WalletConnectionState {
        if (!error) return "disconnected";

        let code: WalletErrorCode | string | undefined;
        const message = error.message?.toLowerCase() || "";

        if (error instanceof WalletError) {
            code = error.code;
        }

        switch (code) {
            case WalletErrorCode.NOT_INSTALLED:
                return "not_installed";
            case WalletErrorCode.USER_REJECTED:
                return "rejected";
            case WalletErrorCode.LOCKED:
                return "locked";
            case WalletErrorCode.NETWORK_ERROR:
            case WalletErrorCode.UNKNOWN_ERROR:
                return "error";
            default:
                // Check error message for patterns
                if (
                    message.includes("not installed") ||
                    message.includes("freighter")
                ) {
                    return "not_installed";
                }
                if (message.includes("reject") || message.includes("denied")) {
                    return "rejected";
                }
                if (message.includes("lock") || message.includes("unlock")) {
                    return "locked";
                }
                return "error";
        }
    }

    private static canRetryForState(state: WalletConnectionState): boolean {
        switch (state) {
            case "rejected":
            case "locked":
            case "error":
                return true;
            case "not_installed":
                return false; // Can't retry if not installed
            case "connecting":
            case "connected":
            case "disconnected":
                return false;
            default:
                return false;
        }
    }

    private static getRetryMessageForState(
        state: WalletConnectionState,
    ): string {
        switch (state) {
            case "rejected":
                return "Connection was rejected. Try again?";
            case "locked":
                return "Wallet is locked. Unlock and retry?";
            case "error":
                return "Connection failed. Try again?";
            case "not_installed":
                return "Freighter wallet is required";
            default:
                return "";
        }
    }

    private static getActionMessageForState(
        state: WalletConnectionState,
    ): string {
        switch (state) {
            case "disconnected":
                return "Connect your wallet to get started";
            case "connecting":
                return "Connecting to wallet...";
            case "connected":
                return "Wallet connected successfully";
            case "rejected":
                return "You rejected the connection request";
            case "locked":
                return "Your wallet is locked. Please unlock it in Freighter.";
            case "not_installed":
                return "Freighter wallet is not installed. Please install it first.";
            case "error":
                return "An error occurred while connecting to your wallet";
            default:
                return "";
        }
    }

    static getConnectionStatus(
        isConnected: boolean,
        isConnecting: boolean,
        error: string | null,
        lastError?: {
            code: WalletErrorCode;
            message: string;
            timestamp: number;
        },
    ): WalletConnectionStatus {
        let state: WalletConnectionState;

        if (isConnecting) {
            state = "connecting";
        } else if (isConnected) {
            state = "connected";
        } else if (error && lastError) {
            // Convert lastError to WalletError for getStateFromError
            const walletError = new WalletError(
                lastError.code,
                lastError.message,
            );
            state = this.getStateFromError(walletError);
        } else {
            state = "disconnected";
        }

        const canRetry = this.canRetryForState(state);
        const actionMessage = this.getActionMessageForState(state);

        return {
            state,
            error: error || actionMessage,
            canRetry,
            retryAction: canRetry ? undefined : undefined, // Will be set by context
        };
    }

    static getErrorSolutions(state: WalletConnectionState): {
        primary: string;
        secondary?: string;
        installUrl?: string;
    } {
        switch (state) {
            case "not_installed":
                return {
                    primary: "Install Freighter Wallet",
                    secondary: "Freighter is the secure wallet for Stellar",
                    installUrl: "https://freighter.app",
                };
            case "rejected":
                return {
                    primary: "Try Connecting Again",
                    secondary:
                        "Make sure to approve the connection in Freighter",
                };
            case "locked":
                return {
                    primary: "Unlock Your Wallet",
                    secondary:
                        "Open Freighter and unlock your wallet, then retry",
                };
            case "error":
                return {
                    primary: "Try Again",
                    secondary:
                        "Check your internet connection and Freighter extension",
                };
            default:
                return {
                    primary: "Connect Wallet",
                };
        }
    }

    static getStateIcon(state: WalletConnectionState): string {
        switch (state) {
            case "connected":
                return "✅";
            case "connecting":
                return "⏳";
            case "rejected":
                return "❌";
            case "locked":
                return "🔒";
            case "not_installed":
                return "⚠️";
            case "error":
                return "⚠️";
            case "disconnected":
                return "🔌";
            default:
                return "❓";
        }
    }

    static getStateColor(state: WalletConnectionState): string {
        switch (state) {
            case "connected":
                return "text-green-500";
            case "connecting":
                return "text-blue-500";
            case "rejected":
                return "text-red-500";
            case "locked":
                return "text-yellow-500";
            case "not_installed":
                return "text-orange-500";
            case "error":
                return "text-red-500";
            case "disconnected":
                return "text-gray-500";
            default:
                return "text-gray-500";
        }
    }
}
