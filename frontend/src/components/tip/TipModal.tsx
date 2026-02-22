/**
 * Mobile-first Tip Modal with gesture support
 * Bottom sheet design with swipe-to-dismiss, haptic feedback, and smooth animations
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { animated, useSpring, useTrail } from 'react-spring';
import { X } from 'lucide-react';
import { useSwipeGesture, useVirtualKeyboard, useHaptic } from '../../hooks';
import { useReducedMotion, getSpringConfig } from '../../utils/animationUtils';
import { getSafeAreaInsets, setupSafeAreaInsets } from '../../utils/gestures';
import AmountSelector from './AmountSelector';
import TipMessage from './TipMessage';
import TipConfirmation from './TipConfirmation';

export interface TipModalProps {
    isOpen: boolean;
    onClose: () => void;
    artistId: string;
    artistName: string;
    artistImage?: string;
    onTipSuccess?: (amount: number, currency: string, message?: string) => Promise<void>;
    walletBalance?: {
        xlm: number;
        usdc: number;
    };
    xlmUsdRate?: number;
}

export type TipModalStep = 'amount' | 'message' | 'confirmation' | 'loading' | 'success';

const TipModal: React.FC<TipModalProps> = ({
    isOpen,
    onClose,
    artistName,
    artistImage,
    onTipSuccess,
    walletBalance = { xlm: 1000, usdc: 100 },
    xlmUsdRate = 0.11,
}) => {
    const reducedMotion = useReducedMotion();
    const haptic = useHaptic();
    const safeAreaRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const keyboardHeight = useVirtualKeyboard();

    // State
    const [step, setStep] = useState<TipModalStep>('amount');
    const [tipAmount, setTipAmount] = useState(5);
    const [currency, setCurrency] = useState<'XLM' | 'USDC'>('XLM');
    const [message, setMessage] = useState('');
    const [isDismissing, setIsDismissing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize safe area insets on mount
    useEffect(() => {
        setupSafeAreaInsets();
    }, []);

    // Close modal with escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Swipe gesture handler
    const handleSwipeDown = useCallback(
        (gesture: any) => {
            if (gesture.distance < 80) return; // Minimum distance to dismiss

            haptic.trigger('selection');
            setIsDismissing(true);
            setTimeout(() => handleClose(), 300);
        },
        [haptic]
    );

    useSwipeGesture(sheetRef, {
        onSwipeDown: handleSwipeDown,
        enabled: isOpen && step === 'amount',
    });

    const handleClose = useCallback(() => {
        setIsDismissing(true);
        setTimeout(() => {
            setStep('amount');
            setTipAmount(5);
            setCurrency('XLM');
            setMessage('');
            setError(null);
            setIsDismissing(false);
            onClose();
        }, 300);
    }, [onClose]);

    const handleAmountChange = useCallback((amount: number) => {
        setTipAmount(amount);
        haptic.trigger('selection');
    }, [haptic]);

    const handleCurrencyToggle = useCallback((newCurrency: 'XLM' | 'USDC') => {
        setCurrency(newCurrency);
        haptic.trigger('light');
    }, [haptic]);

    const handleMessageChange = useCallback((text: string) => {
        setMessage(text);
    }, []);

    const handleProceedToMessage = useCallback(() => {
        haptic.trigger('medium');
        setStep('message');
    }, [haptic]);

    const handleProceedToConfirmation = useCallback(() => {
        haptic.trigger('medium');
        setStep('confirmation');
    }, [haptic]);

    const handleConfirmTip = useCallback(async () => {
        setStep('loading');
        haptic.trigger('medium');

        try {
            await onTipSuccess?.(tipAmount, currency, message);
            haptic.trigger('success');
            setStep('success');

            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            haptic.trigger('error');
            setError(err instanceof Error ? err.message : 'Failed to send tip');
            setStep('confirmation');
        }
    }, [tipAmount, currency, message, onTipSuccess, haptic, handleClose]);

    // Content animation based on step
    const fadeSpring = useSpring({
        opacity: isOpen && !isDismissing ? 1 : 0,
        config: getSpringConfig('gentle'),
        immediate: reducedMotion,
    });

    const slideSpring = useSpring({
        transform: isOpen && !isDismissing ? 'translateY(0%)' : 'translateY(100%)',
        opacity: isOpen && !isDismissing ? 1 : 0,
        config: getSpringConfig('gentle'),
        immediate: reducedMotion,
    });

    const safeAreaInsets = getSafeAreaInsets();
    const bottomPadding = Math.max(safeAreaInsets.bottom, 16) + keyboardHeight;

    if (!isOpen && !isDismissing) return null;

    return (
        <animated.div
            ref={safeAreaRef}
            style={{
                ...fadeSpring,
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={handleClose}
        >
            {/* Bottom Sheet */}
            <animated.div
                ref={sheetRef}
                style={{
                    ...slideSpring,
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: '90vh',
                    borderRadius: '24px 24px 0 0',
                    backgroundColor: '#0B1C2D',
                    borderTop: '1px solid rgba(77, 163, 255, 0.15)',
                    maxWidth: '100vw',
                    paddingBottom: `${bottomPadding}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tip-modal-title"
            >
                {/* Drag Handle */}
                <div className="flex flex-col items-center gap-3 px-4 py-3">
                    <div className="w-12 h-1 rounded-full bg-gray-600" aria-hidden="true" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-4">
                    <div className="flex items-center gap-3">
                        {artistImage && (
                            <img
                                src={artistImage}
                                alt={artistName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        )}
                        <div>
                            <h1 id="tip-modal-title" className="text-lg font-semibold text-white">
                                Tip {artistName}
                            </h1>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-navy/50 rounded-lg transition-colors"
                        aria-label="Close tip modal"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 pb-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {step === 'amount' && (
                        <StepAmount
                            amount={tipAmount}
                            currency={currency}
                            onAmountChange={handleAmountChange}
                            onCurrencyToggle={handleCurrencyToggle}
                            onNext={handleProceedToMessage}
                            walletBalance={walletBalance}
                            xlmUsdRate={xlmUsdRate}
                            reducedMotion={reducedMotion}
                        />
                    )}

                    {step === 'message' && (
                        <StepMessage
                            message={message}
                            onMessageChange={handleMessageChange}
                            onNext={handleProceedToConfirmation}
                            onBack={() => setStep('amount')}
                            reducedMotion={reducedMotion}
                        />
                    )}

                    {step === 'confirmation' && (
                        <StepConfirmation
                            amount={tipAmount}
                            currency={currency}
                            message={message}
                            artistName={artistName}
                            walletBalance={walletBalance}
                            xlmUsdRate={xlmUsdRate}
                            onConfirm={handleConfirmTip}
                            onBack={() => setStep('message')}
                            error={error}
                            reducedMotion={reducedMotion}
                        />
                    )}

                    {step === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="relative w-12 h-12 mb-4">
                                <div className="absolute inset-0 rounded-full border-2 border-blue-primary/20" />
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-primary animate-spin" />
                            </div>
                            <p className="text-gray-400 text-sm">Sending tip...</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-success-pop">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-white font-medium">Tip sent!</p>
                            <p className="text-gray-400 text-sm mt-1">Thank you for supporting {artistName}</p>
                        </div>
                    )}
                </div>
            </animated.div>
        </animated.div>
    );
};

// Step Components

interface StepProps {
    reducedMotion: boolean;
}

const StepAmount: React.FC<
    {
        amount: number;
        currency: 'XLM' | 'USDC';
        onAmountChange: (amount: number) => void;
        onCurrencyToggle: (currency: 'XLM' | 'USDC') => void;
        onNext: () => void;
        walletBalance: { xlm: number; usdc: number };
        xlmUsdRate: number;
    } & StepProps
> = ({
    amount,
    currency,
    onAmountChange,
    onCurrencyToggle,
    onNext,
    walletBalance,
    xlmUsdRate,
    reducedMotion,
}) => {
    const trail = useTrail(2, {
        from: { opacity: 0, y: 10 },
        to: { opacity: 1, y: 0 },
        config: getSpringConfig('gentle'),
        immediate: reducedMotion,
    });

    return (
        <animated.div style={{ ...trail[0] }} className="space-y-6">
            <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-4">Select Amount</p>
                <AmountSelector
                    value={amount}
                    currency={currency}
                    onAmountChange={onAmountChange}
                    onCurrencyToggle={onCurrencyToggle}
                    xlmUsdRate={xlmUsdRate}
                    walletBalance={walletBalance}
                />
            </div>

            <animated.div style={{ ...trail[1] }}>
                <button
                    onClick={onNext}
                    disabled={amount <= 0}
                    className="w-full py-3 rounded-lg font-semibold text-white
                    bg-gradient-to-r from-accent-gold to-yellow-500
                    hover:from-yellow-400 hover:to-amber-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                    Continue
                </button>
            </animated.div>
        </animated.div>
    );
};

const StepMessage: React.FC<
    {
        message: string;
        onMessageChange: (message: string) => void;
        onNext: () => void;
        onBack: () => void;
    } & StepProps
> = ({ message, onMessageChange, onNext, onBack, reducedMotion }) => {
    const trail = useTrail(2, {
        from: { opacity: 0, y: 10 },
        to: { opacity: 1, y: 0 },
        config: getSpringConfig('gentle'),
        immediate: reducedMotion,
    });

    return (
        <animated.div style={{ ...trail[0] }} className="space-y-6">
            <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-4">Message (Optional)</p>
                <TipMessage value={message} onChange={onMessageChange} />
            </div>

            <animated.div style={{ ...trail[1] }} className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 rounded-lg font-semibold text-blue-primary border-2 border-blue-primary/30 
                    hover:border-blue-primary/60 hover:bg-blue-primary/5
                    transition-all duration-200"
                >
                    Back
                </button>
                <button
                    onClick={onNext}
                    className="flex-1 py-3 rounded-lg font-semibold text-white
                    bg-gradient-to-r from-accent-gold to-yellow-500
                    hover:from-yellow-400 hover:to-amber-500
                    transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                    Review
                </button>
            </animated.div>
        </animated.div>
    );
};

const StepConfirmation: React.FC<
    {
        amount: number;
        currency: 'XLM' | 'USDC';
        message: string;
        artistName: string;
        walletBalance: { xlm: number; usdc: number };
        xlmUsdRate: number;
        onConfirm: () => void;
        onBack: () => void;
        error: string | null;
    } & StepProps
> = ({
    amount,
    currency,
    message,
    artistName,
    walletBalance,
    xlmUsdRate,
    onConfirm,
    onBack,
    error,
    reducedMotion,
}) => {
    const trail = useTrail(2, {
        from: { opacity: 0, y: 10 },
        to: { opacity: 1, y: 0 },
        config: getSpringConfig('gentle'),
        immediate: reducedMotion,
    });

    return (
        <animated.div style={{ ...trail[0] }} className="space-y-6">
            <TipConfirmation
                amount={amount}
                currency={currency}
                message={message}
                artistName={artistName}
                walletBalance={walletBalance}
                xlmUsdRate={xlmUsdRate}
            />

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <animated.div style={{ ...trail[1] }} className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 rounded-lg font-semibold text-blue-primary border-2 border-blue-primary/30 
                    hover:border-blue-primary/60 hover:bg-blue-primary/5
                    transition-all duration-200"
                >
                    Back
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 rounded-lg font-semibold text-white
                    bg-gradient-to-r from-accent-gold to-yellow-500
                    hover:from-yellow-400 hover:to-amber-500
                    transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                    Send Tip
                </button>
            </animated.div>
        </animated.div>
    );
};

export default TipModal;
