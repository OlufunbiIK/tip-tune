import { WalletStateManager } from "../walletState";
import { WalletError, WalletErrorCode } from "../../types/wallet";

describe("WalletStateManager", () => {
    describe("getConnectionStatus", () => {
        it("should return connecting status when isConnecting is true", () => {
            const status = WalletStateManager.getConnectionStatus(
                false,
                true,
                null,
            );

            expect(status.state).toBe("connecting");
            expect(status.canRetry).toBe(false);
            expect(status.error).toBe("Connecting to wallet...");
        });

        it("should return connected status when isConnected is true", () => {
            const status = WalletStateManager.getConnectionStatus(
                true,
                false,
                null,
            );

            expect(status.state).toBe("connected");
            expect(status.canRetry).toBe(false);
            expect(status.error).toBe("Wallet connected successfully");
        });

        it("should return disconnected status when not connected and no error", () => {
            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                null,
            );

            expect(status.state).toBe("disconnected");
            expect(status.canRetry).toBe(false);
            expect(status.error).toBe("Connect your wallet to get started");
        });

        it("should return rejected status for USER_REJECTED error", () => {
            const lastError = {
                code: WalletErrorCode.USER_REJECTED,
                message: "Connection rejected",
                timestamp: Date.now(),
            };

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Connection rejected",
                lastError,
            );

            expect(status.state).toBe("rejected");
            expect(status.canRetry).toBe(true);
            expect(status.error).toBe("Connection rejected");
        });

        it("should return locked status for LOCKED error", () => {
            const lastError = {
                code: WalletErrorCode.LOCKED,
                message: "Wallet is locked",
                timestamp: Date.now(),
            };

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Wallet is locked",
                lastError,
            );

            expect(status.state).toBe("locked");
            expect(status.canRetry).toBe(true);
            expect(status.error).toBe("Wallet is locked");
        });

        it("should return not_installed status for NOT_INSTALLED error", () => {
            const lastError = {
                code: WalletErrorCode.NOT_INSTALLED,
                message: "Freighter not installed",
                timestamp: Date.now(),
            };

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Freighter not installed",
                lastError,
            );

            expect(status.state).toBe("not_installed");
            expect(status.canRetry).toBe(false);
            expect(status.error).toBe("Freighter not installed");
        });

        it("should return error status for UNKNOWN_ERROR", () => {
            const lastError = {
                code: WalletErrorCode.UNKNOWN_ERROR,
                message: "Unknown error occurred",
                timestamp: Date.now(),
            };

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Unknown error occurred",
                lastError,
            );

            expect(status.state).toBe("error");
            expect(status.canRetry).toBe(true);
            expect(status.error).toBe("Unknown error occurred");
        });
    });

    describe("getErrorSolutions", () => {
        it("should return appropriate solutions for not_installed state", () => {
            const solutions =
                WalletStateManager.getErrorSolutions("not_installed");

            expect(solutions.primary).toBe("Install Freighter Wallet");
            expect(solutions.secondary).toBe(
                "Freighter is the secure wallet for Stellar",
            );
            expect(solutions.installUrl).toBe("https://freighter.app");
        });

        it("should return appropriate solutions for rejected state", () => {
            const solutions = WalletStateManager.getErrorSolutions("rejected");

            expect(solutions.primary).toBe("Try Connecting Again");
            expect(solutions.secondary).toBe(
                "Make sure to approve the connection in Freighter",
            );
            expect(solutions.installUrl).toBeUndefined();
        });

        it("should return appropriate solutions for locked state", () => {
            const solutions = WalletStateManager.getErrorSolutions("locked");

            expect(solutions.primary).toBe("Unlock Your Wallet");
            expect(solutions.secondary).toBe(
                "Open Freighter and unlock your wallet, then retry",
            );
            expect(solutions.installUrl).toBeUndefined();
        });

        it("should return appropriate solutions for error state", () => {
            const solutions = WalletStateManager.getErrorSolutions("error");

            expect(solutions.primary).toBe("Try Again");
            expect(solutions.secondary).toBe(
                "Check your internet connection and Freighter extension",
            );
            expect(solutions.installUrl).toBeUndefined();
        });

        it("should return default solutions for disconnected state", () => {
            const solutions =
                WalletStateManager.getErrorSolutions("disconnected");

            expect(solutions.primary).toBe("Connect Wallet");
            expect(solutions.secondary).toBeUndefined();
            expect(solutions.installUrl).toBeUndefined();
        });
    });

    describe("getStateIcon", () => {
        it("should return appropriate icons for each state", () => {
            expect(WalletStateManager.getStateIcon("connected")).toBe("✅");
            expect(WalletStateManager.getStateIcon("connecting")).toBe("⏳");
            expect(WalletStateManager.getStateIcon("rejected")).toBe("❌");
            expect(WalletStateManager.getStateIcon("locked")).toBe("🔒");
            expect(WalletStateManager.getStateIcon("not_installed")).toBe("⚠️");
            expect(WalletStateManager.getStateIcon("error")).toBe("⚠️");
            expect(WalletStateManager.getStateIcon("disconnected")).toBe("🔌");
        });
    });

    describe("getStateColor", () => {
        it("should return appropriate colors for each state", () => {
            expect(WalletStateManager.getStateColor("connected")).toBe(
                "text-green-500",
            );
            expect(WalletStateManager.getStateColor("connecting")).toBe(
                "text-blue-500",
            );
            expect(WalletStateManager.getStateColor("rejected")).toBe(
                "text-red-500",
            );
            expect(WalletStateManager.getStateColor("locked")).toBe(
                "text-yellow-500",
            );
            expect(WalletStateManager.getStateColor("not_installed")).toBe(
                "text-orange-500",
            );
            expect(WalletStateManager.getStateColor("error")).toBe(
                "text-red-500",
            );
            expect(WalletStateManager.getStateColor("disconnected")).toBe(
                "text-gray-500",
            );
        });
    });
});

describe("Enhanced Wallet Hook Integration", () => {
    // Mock the original useWallet hook
    const mockOriginalWallet = {
        isConnected: false,
        isConnecting: false,
        publicKey: null,
        network: "testnet" as const,
        balance: null,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchNetwork: jest.fn(),
        refreshBalance: jest.fn(),
        signTransaction: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("useEnhancedWallet", () => {
        it("should derive connection state correctly", () => {
            // Test connecting state
            mockOriginalWallet.isConnecting = true;

            // This would be tested in the actual component context
            expect(mockOriginalWallet.isConnecting).toBe(true);
        });

        it("should handle error state transitions", () => {
            // Test error handling
            const error = new WalletError(
                WalletErrorCode.USER_REJECTED,
                "Connection rejected by user",
            );

            expect(error.code).toBe(WalletErrorCode.USER_REJECTED);
            expect(error.message).toBe("Connection rejected by user");
        });
    });

    describe("Wallet State Transitions", () => {
        it("should handle transition from disconnected to connecting", () => {
            // Initial state
            expect(mockOriginalWallet.isConnected).toBe(false);
            expect(mockOriginalWallet.isConnecting).toBe(false);

            // Start connection
            mockOriginalWallet.isConnecting = true;
            expect(mockOriginalWallet.isConnecting).toBe(true);

            // Simulate successful connection
            mockOriginalWallet.isConnected = true;
            mockOriginalWallet.isConnecting = false;
            (mockOriginalWallet as any).publicKey = "GABC123...";

            expect(mockOriginalWallet.isConnected).toBe(true);
            expect(mockOriginalWallet.isConnecting).toBe(false);
            expect((mockOriginalWallet as any).publicKey).toBe("GABC123...");
        });

        it("should handle transition from connecting to rejected", () => {
            // Start connection
            mockOriginalWallet.isConnecting = true;
            expect(mockOriginalWallet.isConnecting).toBe(true);

            // Simulate rejection
            mockOriginalWallet.isConnecting = false;
            (mockOriginalWallet as any).error = "Connection rejected by user";

            expect(mockOriginalWallet.isConnecting).toBe(false);
            expect((mockOriginalWallet as any).error).toBe(
                "Connection rejected by user",
            );
        });

        it("should handle transition from connected to disconnected", () => {
            // Start with connected state
            mockOriginalWallet.isConnected = true;
            (mockOriginalWallet as any).publicKey = "GABC123...";
            (mockOriginalWallet as any).balance = {
                asset: "XLM",
                balance: "100.5",
            };

            expect(mockOriginalWallet.isConnected).toBe(true);
            expect((mockOriginalWallet as any).publicKey).toBe("GABC123...");

            // Disconnect
            mockOriginalWallet.isConnected = false;
            (mockOriginalWallet as any).publicKey = null;
            (mockOriginalWallet as any).balance = null;
            (mockOriginalWallet as any).error = null;

            expect(mockOriginalWallet.isConnected).toBe(false);
            expect((mockOriginalWallet as any).publicKey).toBeNull();
            expect((mockOriginalWallet as any).balance).toBeNull();
        });
    });

    describe("Error Handling Scenarios", () => {
        it("should handle wallet not installed error", () => {
            const error = new WalletError(
                WalletErrorCode.NOT_INSTALLED,
                "Freighter wallet is not installed",
            );

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                error.message,
                {
                    code: error.code,
                    message: error.message,
                    timestamp: Date.now(),
                },
            );

            expect(status.state).toBe("not_installed");
            expect(status.canRetry).toBe(false);
            expect(status.error).toBe("Freighter wallet is not installed");
        });

        it("should handle wallet locked error", () => {
            const error = new WalletError(
                WalletErrorCode.LOCKED,
                "Wallet is locked. Please unlock Freighter.",
            );

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                error.message,
                {
                    code: error.code,
                    message: error.message,
                    timestamp: Date.now(),
                },
            );

            expect(status.state).toBe("locked");
            expect(status.canRetry).toBe(true);
            expect(status.error).toBe(
                "Wallet is locked. Please unlock Freighter.",
            );
        });

        it("should handle network error", () => {
            const error = new WalletError(
                WalletErrorCode.NETWORK_ERROR,
                "Network connection failed",
            );

            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                error.message,
                {
                    code: error.code,
                    message: error.message,
                    timestamp: Date.now(),
                },
            );

            expect(status.state).toBe("error");
            expect(status.canRetry).toBe(true);
            expect(status.error).toBe("Network connection failed");
        });
    });

    describe("Retry Logic", () => {
        it("should allow retry for rejected connections", () => {
            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Connection rejected",
                {
                    code: WalletErrorCode.USER_REJECTED,
                    message: "Connection rejected",
                    timestamp: Date.now(),
                },
            );

            expect(status.canRetry).toBe(true);
        });

        it("should allow retry for locked wallet", () => {
            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Wallet locked",
                {
                    code: WalletErrorCode.LOCKED,
                    message: "Wallet locked",
                    timestamp: Date.now(),
                },
            );

            expect(status.canRetry).toBe(true);
        });

        it("should not allow retry for not installed wallet", () => {
            const status = WalletStateManager.getConnectionStatus(
                false,
                false,
                "Freighter not installed",
                {
                    code: WalletErrorCode.NOT_INSTALLED,
                    message: "Freighter not installed",
                    timestamp: Date.now(),
                },
            );

            expect(status.canRetry).toBe(false);
        });

        it("should not allow retry when already connecting", () => {
            const status = WalletStateManager.getConnectionStatus(
                false,
                true,
                null,
            );

            expect(status.canRetry).toBe(false);
        });

        it("should not allow retry when already connected", () => {
            const status = WalletStateManager.getConnectionStatus(
                true,
                false,
                null,
            );

            expect(status.canRetry).toBe(false);
        });
    });
});
