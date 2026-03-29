"use client";

import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import {
    setAllowed,
    isConnected,
    getAddress,
    getNetwork,
    signTransaction,
} from "@stellar/freighter-api";
import type {
    Network,
    EnhancedWalletState,
    EnhancedWalletContextType,
    WalletErrorCode,
    WalletConnectionState,
} from "../types/wallet";
import { WalletError } from "../types/wallet";
import {
    getServer,
    getNetworkPassphrase,
    formatStellarAmount,
} from "../utils/stellar";
import { WalletStateManager } from "../utils/walletState";

interface WalletProviderProps {
    children: ReactNode;
    defaultNetwork?: Network;
}

const WalletContext = createContext<EnhancedWalletContextType | null>(null);

export const WalletProvider: React.FC<WalletProviderProps> = ({
    children,
    defaultNetwork = "testnet",
}) => {
    const [state, setState] = useState<EnhancedWalletState>({
        connectionState: "disconnected",
        isConnected: false,
        isConnecting: false,
        publicKey: null,
        network: defaultNetwork,
        balance: null,
        error: null,
        lastError: undefined,
        connectionStatus: {
            state: "disconnected",
            error: "Connect your wallet to get started",
            canRetry: false,
        },
    });

    // Update connection status whenever relevant state changes
    useEffect(() => {
        const connectionStatus = WalletStateManager.getConnectionStatus(
            state.isConnected,
            state.isConnecting,
            state.error,
            state.lastError,
        );

        setState((prev) => ({
            ...prev,
            connectionStatus: {
                ...connectionStatus,
                retryAction: connectionStatus.canRetry
                    ? retryConnection
                    : undefined,
            },
        }));
    }, [
        state.isConnected,
        state.isConnecting,
        state.error,
        state.lastError,
        retryConnection,
    ]);

    // Update connection state based on current state
    useEffect(() => {
        let newConnectionState: WalletConnectionState;

        if (state.isConnecting) {
            newConnectionState = "connecting";
        } else if (state.isConnected) {
            newConnectionState = "connected";
        } else if (state.error && state.lastError) {
            newConnectionState = WalletStateManager.getConnectionStatus(
                state.isConnected,
                state.isConnecting,
                state.error,
                state.lastError,
            ).state;
        } else {
            newConnectionState = "disconnected";
        }

        if (newConnectionState !== state.connectionState) {
            setState((prev) => ({
                ...prev,
                connectionState: newConnectionState,
            }));
        }
    }, [
        state.isConnected,
        state.isConnecting,
        state.error,
        state.lastError,
        state.connectionState,
    ]);

    // Check if Freighter is installed
    const checkFreighterInstalled = useCallback(async (): Promise<boolean> => {
        try {
            // Try to access Freighter API
            if (typeof window !== "undefined" && (window as any).freighterApi) {
                return true;
            }
            // Fallback: try to call isConnected
            await isConnected();
            return true;
    // Initialize wallet connection on mount
    useEffect(() => {
        const initializeWallet = async () => {
            try {
                const installed = await checkFreighterInstalled();
                if (!installed) {
                    return;
                }

                const connected = await isConnected();
                if (connected) {
                    const { address } = await getAddress();
                    const publicKey = address;

                    // Validate publicKey before proceeding
                    if (!publicKey || publicKey.trim() === "") {
                        console.debug(
                            "Connected but no valid address returned",
                        );
                        return;
                    }

                    let network: Network = defaultNetwork;

                    try {
                        const { network: freighterNetwork } =
                            await getNetwork();
                        // Map Freighter network to our Network type
                        if (freighterNetwork === "PUBLIC") {
                            network = "mainnet";
                        } else if (freighterNetwork === "TESTNET") {
                            network = "testnet";
                        } else {
                            network = defaultNetwork;
                        }
                    } catch {
                        // If getNetwork fails, use default
                        network = defaultNetwork;
                    }

                    setState((prev) => ({
                        ...prev,
                        isConnected: true,
                        publicKey,
                        network,
                        error: null,
                        lastError: undefined,
                    }));

                    // Fetch balance
                    await fetchBalance(publicKey, network);
                }
            } catch (error) {
                // Silently fail initialization - wallet might not be connected
                console.debug("Wallet not connected on initialization:", error);
            }
        };

        initializeWallet();
    }, [defaultNetwork, checkFreighterInstalled]);

    // Fetch balance for a given address and network
    const fetchBalance = useCallback(
        async (publicKey: string, network: Network) => {
            // Validate publicKey before making request
            if (!publicKey || publicKey.trim() === "") {
                console.debug("Cannot fetch balance: no valid publicKey");
                return;
            }

            try {
                const server = getServer(network);
                const account = await server.loadAccount(publicKey);

                // Find XLM balance
                const xlmBalance = account.balances.find(
                    (balance) => balance.asset_type === "native",
                );

                if (xlmBalance) {
                    setState((prev) => ({
                        ...prev,
                        balance: {
                            asset: "XLM",
                            balance: formatStellarAmount(xlmBalance.balance),
                        },
                        error: null,
                    }));
                }
            } catch (error) {
                console.error("Error fetching balance:", error);
                setState((prev) => ({
                    ...prev,
                    balance: null,
                    error: "Failed to fetch balance",
                }));
            }
        },
        [],
    );

    // Connect wallet
    const connect = useCallback(async () => {
        try {
            setState((prev) => ({
                ...prev,
                isConnecting: true,
                error: null,
                lastError: undefined,
            }));

            // Check if Freighter is installed
            const installed = await checkFreighterInstalled();
            if (!installed) {
                const error = new WalletError(
                    "NOT_INSTALLED" as WalletErrorCode,
                    "Freighter wallet is not installed. Please install it from https://freighter.app",
                );
                setLastError(error);
                throw error;
            }

            // Request connection
            const allowed = await setAllowed();
            if (!allowed) {
                const error = new WalletError(
                    "USER_REJECTED" as WalletErrorCode,
                    "Connection request was rejected",
                );
                setLastError(error);
                throw error;
            }

            // Get public key
            const { address } = await getAddress();
            const publicKey = address;
            if (!publicKey) {
                const error = new WalletError(
                    "UNKNOWN_ERROR" as WalletErrorCode,
                    "Failed to get public key from wallet",
                );
                setLastError(error);
                throw error;
            }

            // Get network
            let network: Network = defaultNetwork;
            try {
                const { network: freighterNetwork } = await getNetwork();
                if (freighterNetwork === "PUBLIC") {
                    network = "mainnet";
                } else if (freighterNetwork === "TESTNET") {
                    network = "testnet";
                }
            } catch {
                // Use default if getNetwork fails
                network = defaultNetwork;
            }

            setState((prev) => ({
                ...prev,
                isConnected: true,
                isConnecting: false,
                publicKey,
                network,
                error: null,
                lastError: undefined,
            }));

            // Fetch balance
            await fetchBalance(publicKey, network);
        } catch (error) {
            let walletError: WalletError;

            if (error instanceof WalletError) {
                walletError = error;
            } else if (
                error &&
                typeof error === "object" &&
                "message" in error
            ) {
                const message = String(error.message);
                if (message.includes("locked") || message.includes("Locked")) {
                    walletError = new WalletError(
                        "LOCKED" as WalletErrorCode,
                        "Wallet is locked. Please unlock Freighter and try again.",
                    );
                } else if (
                    message.includes("reject") ||
                    message.includes("Reject")
                ) {
                    walletError = new WalletError(
                        "USER_REJECTED" as WalletErrorCode,
                        "Request was rejected by user",
                    );
                } else {
                    walletError = new WalletError(
                        "UNKNOWN_ERROR" as WalletErrorCode,
                        message || "Failed to connect wallet",
                        error,
                    );
                }
            } else {
                walletError = new WalletError(
                    "UNKNOWN_ERROR" as WalletErrorCode,
                    "An unknown error occurred while connecting wallet",
                    error,
                );
            }

            setLastError(walletError);

            setState((prev) => ({
                ...prev,
                isConnected: false,
                isConnecting: false,
                publicKey: null,
                error: walletError.message,
            }));

            throw walletError;
        }
    }, [defaultNetwork, checkFreighterInstalled, fetchBalance, setLastError]);

    // Disconnect wallet
    const disconnect = useCallback(async () => {
        setState({
            connectionState: "disconnected",
            isConnected: false,
            isConnecting: false,
            publicKey: null,
            network: defaultNetwork,
            balance: null,
            error: null,
            lastError: undefined,
            connectionStatus: {
                state: "disconnected",
                error: "Connect your wallet to get started",
                canRetry: false,
            },
        });
    }, [defaultNetwork]);

    // Switch network
    const switchNetwork = useCallback(
        async (network: Network) => {
            try {
                setState((prev) => ({ ...prev, error: null }));

                const publicKey = state.publicKey;
                if (publicKey) {
                    setState((prev) => ({
                        ...prev,
                        network,
                    }));

                    // Refresh balance for new network
                    await fetchBalance(publicKey, network);
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Failed to switch network";
                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                }));
                throw new WalletError(
                    "NETWORK_ERROR" as WalletErrorCode,
                    errorMessage,
                    error,
                );
            }
        },
        [state.publicKey, fetchBalance],
    );

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        if (state.publicKey && state.isConnected) {
            await fetchBalance(state.publicKey, state.network);
        }
    }, [state.publicKey, state.isConnected, state.network, fetchBalance]);

    // Sign transaction
    const signTransactionHandler = useCallback(
        async (transactionXdr: string): Promise<string> => {
            try {
                if (!state.isConnected || !state.publicKey) {
                    throw new WalletError(
                        "NOT_INSTALLED" as WalletErrorCode,
                        "Wallet is not connected",
                    );
                }

                setState((prev) => ({ ...prev, error: null }));

                // Sign transaction using Freighter
                const response = await signTransaction(transactionXdr, {
                    networkPassphrase: getNetworkPassphrase(state.network),
                    address: state.publicKey,
                });

                return response.signedTxXdr;
            } catch (error) {
                let walletError: WalletError;

                if (error && typeof error === "object" && "message" in error) {
                    const message = String(error.message);
                    if (
                        message.includes("reject") ||
                        message.includes("Reject")
                    ) {
                        walletError = new WalletError(
                            "USER_REJECTED" as WalletErrorCode,
                            "Transaction signing was rejected by user",
                        );
                    } else if (
                        message.includes("locked") ||
                        message.includes("Locked")
                    ) {
                        walletError = new WalletError(
                            "LOCKED" as WalletErrorCode,
                            "Wallet is locked. Please unlock Freighter and try again.",
                        );
                    } else {
                        walletError = new WalletError(
                            "UNKNOWN_ERROR" as WalletErrorCode,
                            message || "Failed to sign transaction",
                            error,
                        );
                    }
                } else {
                    walletError = new WalletError(
                        "UNKNOWN_ERROR" as WalletErrorCode,
                        "An unknown error occurred while signing transaction",
                        error,
                    );
                }

                setLastError(walletError);

                setState((prev) => ({
                    ...prev,
                    error: walletError.message,
                }));

                throw walletError;
            }
        },
        [state.isConnected, state.publicKey, state.network, setLastError],
    );

    const value: EnhancedWalletContextType = {
        ...state,
        connect,
        disconnect,
        switchNetwork,
        refreshBalance,
        signTransaction: signTransactionHandler,
        retryConnection,
        clearError,
        getConnectionStatus,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

export { WalletContext };
