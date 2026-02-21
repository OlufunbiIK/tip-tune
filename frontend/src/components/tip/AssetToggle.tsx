/**
 * Asset Toggle Component
 * Allows switching between XLM and USDC with live conversion display
 */

import React, { useCallback } from 'react';
import { useSpring, animated } from 'react-spring';
import { useReducedMotion, getSpringConfig } from '../../utils/animationUtils';

export interface AssetToggleProps {
    currency: 'XLM' | 'USDC';
    onToggle: (currency: 'XLM' | 'USDC') => void;
    xlmUsdRate?: number;
    walletBalance?: {
        xlm: number;
        usdc: number;
    };
    displayAmount?: number;
}

const AssetToggle: React.FC<AssetToggleProps> = ({
    currency,
    onToggle,
    xlmUsdRate = 0.11,
    walletBalance = { xlm: 1000, usdc: 100 },
    displayAmount = 0,
}) => {
    const reducedMotion = useReducedMotion();

    const handleToggle = useCallback(() => {
        const newCurrency = currency === 'XLM' ? 'USDC' : 'XLM';
        onToggle(newCurrency);
    }, [currency, onToggle]);

    // Animation for toggle switch
    const toggleSpring = useSpring({
        x: currency === 'XLM' ? 0 : 52,
        config: getSpringConfig('stiff'),
        immediate: reducedMotion,
    });

    const balanceXlm = walletBalance.xlm;
    const balanceUsdc = walletBalance.usdc;
    const convertedAmount = currency === 'XLM'
        ? (displayAmount * xlmUsdRate).toFixed(2)
        : (displayAmount / xlmUsdRate).toFixed(2);

    return (
        <div className="space-y-4">
            {/* Toggle Switch */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleToggle}
                    className="relative inline-flex items-center w-24 h-10 rounded-full bg-navy/50 border border-blue-primary/30 hover:border-blue-primary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-primary/50 focus:ring-offset-2 focus:ring-offset-navy"
                    role="switch"
                    aria-checked={currency === 'USDC'}
                    aria-label={`Switch between XLM and USDC (currently ${currency})`}
                >
                    {/* Background track */}
                    <span className="absolute inset-0 rounded-full" />

                    {/* Animated toggle thumb */}
                    <animated.span
                        style={{
                            x: toggleSpring.x as any,
                        }}
                        className="relative z-10 inline-flex w-10 h-10 transform rounded-full bg-gradient-to-r from-blue-primary to-ice-blue items-center justify-center font-semibold text-xs text-white shadow-lg"
                    >
                        {currency}
                    </animated.span>
                </button>

                {/* Conversion Info */}
                <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500 font-medium">≈ ${convertedAmount}</p>
                    <p className="text-xs text-gray-600">
                        {`1 XLM = $${xlmUsdRate.toFixed(4)}`}
                    </p>
                </div>
            </div>

            {/* Balance Display */}
            <div className="flex gap-3">
                {/* XLM Balance */}
                <div
                    className={`flex-1 p-3 rounded-lg transition-all duration-200 ${
                        currency === 'XLM'
                            ? 'bg-blue-primary/20 border border-blue-primary/50'
                            : 'bg-navy/30 border border-navy/50 opacity-60'
                    }`}
                >
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">XLM Balance</p>
                    <p className="text-sm font-semibold text-white mt-1">
                        {balanceXlm.toFixed(2)} XLM
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        ≈ ${(balanceXlm * xlmUsdRate).toFixed(2)}
                    </p>
                </div>

                {/* USDC Balance */}
                <div
                    className={`flex-1 p-3 rounded-lg transition-all duration-200 ${
                        currency === 'USDC'
                            ? 'bg-blue-primary/20 border border-blue-primary/50'
                            : 'bg-navy/30 border border-navy/50 opacity-60'
                    }`}
                >
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">USDC Balance</p>
                    <p className="text-sm font-semibold text-white mt-1">
                        {balanceUsdc.toFixed(2)} USDC
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        ≈ ${balanceUsdc.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Wallet Balance Warning */}
            {((currency === 'XLM' && displayAmount > balanceXlm) ||
                (currency === 'USDC' && displayAmount > balanceUsdc)) && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex gap-2">
                    <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-orange-400">
                        Insufficient {currency} balance
                    </span>
                </div>
            )}
        </div>
    );
};

export default AssetToggle;
