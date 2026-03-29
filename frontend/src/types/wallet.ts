export type Network = "testnet" | "mainnet" | "futurenet" | "local";

export type WalletConnectionState =
    | "disconnected" // No wallet connected
    | "connecting" // Connection in progress
    | "connected" // Successfully connected
    | "rejected" // User rejected connection
    | "locked" // Wallet is locked
    | "not_installed" // Wallet not installed
    | "error"; // Generic error

export type WalletConnectionStatus = {
    state: WalletConnectionState;
    error?: string;
    canRetry: boolean;
    retryAction?: () => Promise<void>;
};

export interface WalletBalance {
    asset: string;
    balance: string;
    limit?: string;
}

export interface EnhancedWalletState {
    connectionState: WalletConnectionState;
    isConnected: boolean;
    isConnecting: boolean;
    publicKey: string | null;
    network: Network;
    balance: WalletBalance | null;
    error: string | null;
    lastError?: {
        code: WalletErrorCode;
        message: string;
        timestamp: number;
    };
    connectionStatus: WalletConnectionStatus;
}

export interface WalletState {
    isConnected: boolean;
    isConnecting: boolean;
    publicKey: string | null;
    network: Network;
    balance: WalletBalance | null;
    error: string | null;
}

export interface EnhancedWalletContextType extends EnhancedWalletState {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    switchNetwork: (network: Network) => Promise<void>;
    refreshBalance: () => Promise<void>;
    signTransaction: (transactionXdr: string) => Promise<string>;
    retryConnection: () => Promise<void>;
    clearError: () => void;
    getConnectionStatus: () => WalletConnectionStatus;
}

export interface WalletContextType extends WalletState {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    switchNetwork: (network: Network) => Promise<void>;
    refreshBalance: () => Promise<void>;
    signTransaction: (transactionXdr: string) => Promise<string>;
}

export interface FreighterError {
    code: string;
    message: string;
    data?: unknown;
}

export enum WalletErrorCode {
    NOT_INSTALLED = "NOT_INSTALLED",
    LOCKED = "LOCKED",
    USER_REJECTED = "USER_REJECTED",
    NETWORK_ERROR = "NETWORK_ERROR",
    INVALID_NETWORK = "INVALID_NETWORK",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class WalletError extends Error {
    constructor(
        public code: WalletErrorCode,
        message: string,
        public originalError?: unknown,
    ) {
        super(message);
        this.name = "WalletError";
    }
}
