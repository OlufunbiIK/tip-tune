/**
 * Tip Confirmation Component
 * Shows confirmation screen with estimated fee and balance check
 */

import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface TipConfirmationProps {
    amount: number;
    currency: 'XLM' | 'USDC';
    message: string;
    artistName: string;
    walletBalance: {
        xlm: number;
        usdc: number;
    };
    xlmUsdRate?: number;
}

const ESTIMATED_FEE = 0.00001; // XLM network fee (in stroops)

const TipConfirmation: React.FC<TipConfirmationProps> = ({
    amount,
    currency,
    message,
    artistName,
    walletBalance,
    xlmUsdRate = 0.11,
}) => {
    const confirmation = useMemo(() => {
        const tipAmountUsd = currency === 'XLM'
            ? (amount * xlmUsdRate).toFixed(2)
            : amount.toFixed(2);

        const feeUsd = (ESTIMATED_FEE * xlmUsdRate).toFixed(6);
        const totalUsd = currency === 'XLM'
            ? ((amount + ESTIMATED_FEE) * xlmUsdRate).toFixed(2)
            : (amount + (ESTIMATED_FEE * xlmUsdRate)).toFixed(2);

        const hasBalance = currency === 'XLM'
            ? walletBalance.xlm >= (amount + ESTIMATED_FEE)
            : walletBalance.usdc >= amount;

        return {
            tipAmountUsd,
            feeUsd,
            totalUsd,
            hasBalance,
        };
    }, [amount, currency, walletBalance, xlmUsdRate]);

    return (
        <div className="space-y-6">
            {/* Review Header */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Review Your Tip</h2>
            </div>

            {/* Recipient */}
            <div className="p-4 rounded-lg bg-navy/30 border border-blue-primary/10">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Recipient</p>
                <p className="text-lg font-semibold text-white">{artistName}</p>
            </div>

            {/* Tip Details */}
            <div className="space-y-3 p-4 rounded-lg bg-navy/30 border border-blue-primary/10">
                <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">Tip Amount</span>
                    <div className="text-right">
                        <p className="text-white font-semibold">
                            {amount.toFixed(2)} {currency}
                        </p>
                        <p className="text-xs text-gray-400">
                            ≈ ${confirmation.tipAmountUsd}
                        </p>
                    </div>
                </div>

                <div className="h-px bg-blue-primary/10" />

                <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium flex items-center gap-2">
                        Network Fee
                        <span className="text-xs text-gray-500">(Stellar)</span>
                    </span>
                    <div className="text-right">
                        <p className="text-white font-semibold">
                            {ESTIMATED_FEE.toFixed(6)} XLM
                        </p>
                        <p className="text-xs text-gray-400">
                            ≈ ${confirmation.feeUsd}
                        </p>
                    </div>
                </div>

                <div className="h-px bg-blue-primary/10" />

                <div className="flex justify-between items-center">
                    <span className="text-blue-primary font-semibold">Total</span>
                    <div className="text-right">
                        <p className="text-lg font-bold bg-gradient-to-r from-accent-gold to-yellow-500 bg-clip-text text-transparent">
                            {currency === 'XLM'
                                ? (amount + ESTIMATED_FEE).toFixed(6)
                                : amount.toFixed(2)} {currency === 'XLM' ? 'XLM' : 'USDC'}
                        </p>
                        <p className="text-sm text-gray-400">
                            ≈ ${confirmation.totalUsd}
                        </p>
                    </div>
                </div>
            </div>

            {/* Message Summary */}
            {message && (
                <div className="p-4 rounded-lg bg-navy/30 border border-blue-primary/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Your Message</p>
                    <p className="text-sm text-gray-200 text-left break-words">"{message}"</p>
                </div>
            )}

            {/* Balance Check */}
            <div
                className={`p-4 rounded-lg border flex gap-3 ${
                    confirmation.hasBalance
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}
            >
                {confirmation.hasBalance ? (
                    <>
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-green-300">Sufficient Balance</p>
                            <p className="text-xs text-green-300/60">
                                You have {currency === 'XLM' ? walletBalance.xlm : walletBalance.usdc} {currency}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-300">Insufficient Balance</p>
                            <p className="text-xs text-red-300/60">
                                You need {amount + (currency === 'XLM' ? ESTIMATED_FEE : 0)} {currency} but only have{' '}
                                {currency === 'XLM' ? walletBalance.xlm : walletBalance.usdc}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Exchange Rate Note */}
            <div className="p-3 rounded-lg bg-blue-primary/5 border border-blue-primary/10 text-xs text-gray-400">
                <p>
                    <span className="font-medium text-blue-primary">Exchange Rate:</span> 1 XLM = ${xlmUsdRate.toFixed(4)} USD
                </p>
                <p className="mt-1 text-gray-500">
                    Rate updates every minute. Final conversion may vary.
                </p>
            </div>
        </div>
    );
};

export default TipConfirmation;
