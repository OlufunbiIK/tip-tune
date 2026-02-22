import React, { useState, useRef, useCallback } from 'react';
import TipButton, { TipButtonProps } from './TipButton';
import ConfettiExplosion from './ConfettiExplosion';
import ProcessingAnimation, { ProcessingPhase } from './ProcessingAnimation';

export type TipState = 'idle' | 'flying' | 'processing' | 'confirming' | 'success';

export interface TipAnimationProps extends Omit<TipButtonProps, 'onTip' | 'isLoading'> {
    /**
     * Called to perform the actual tip. Return the Stellar tx hash for the confirming phase.
     * Throw to transition to idle (error handling is up to the caller).
     */
    onTip: (amount: number, currency: string) => Promise<string | undefined | void>;
    /** Called when the full animation cycle completes */
    onComplete?: (amount: number, currency: string) => void;
    /** Milliseconds to show success before resetting (default 1500) */
    resetDelay?: number;
}

const TipAnimation: React.FC<TipAnimationProps> = ({
    onTip,
    onComplete,
    resetDelay = 1500,
    amount,
    currency = 'XLM',
    ...buttonProps
}) => {
    const [state, setState] = useState<TipState>('idle');
    const [txHash, setTxHash] = useState<string | undefined>();
    const [confettiOrigin, setConfettiOrigin] = useState<{ x: number; y: number } | undefined>();
    const [showConfetti, setShowConfetti] = useState(false);
    const buttonWrapRef = useRef<HTMLDivElement>(null);

    const handleTip = useCallback(async (tipAmount: number, tipCurrency: string) => {
        if (state !== 'idle') return;

        // Capture button position for confetti origin
        if (buttonWrapRef.current) {
            const rect = buttonWrapRef.current.getBoundingClientRect();
            setConfettiOrigin({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            });
        }

        setState('flying');
        // Brief delay so coin animation plays before processing overlay
        await new Promise(r => setTimeout(r, 350));
        setState('processing');

        try {
            const hash = await onTip(tipAmount, tipCurrency);
            if (hash) {
                setTxHash(hash);
                setState('confirming');
                // Simulate block confirmation wait (real apps would poll Stellar)
                await new Promise(r => setTimeout(r, 2000));
            }
            setState('success');
            setShowConfetti(true);
        } catch {
            // Reset on error — caller handles error UI
            setState('idle');
        }
    }, [state, onTip]);

    const handleSuccessComplete = useCallback(() => {
        setTimeout(() => {
            setState('idle');
            setTxHash(undefined);
            setShowConfetti(false);
            onComplete?.(amount, currency ?? 'XLM');
        }, resetDelay);
    }, [resetDelay, onComplete, amount, currency]);

    const isProcessing = state === 'processing' || state === 'confirming';

    return (
        <div className="relative flex flex-col items-center gap-4" id="tip-animation-root">
            {/* Confetti layer */}
            <ConfettiExplosion
                active={showConfetti}
                originX={confettiOrigin?.x}
                originY={confettiOrigin?.y}
                count={70}
                onComplete={() => setShowConfetti(false)}
            />

            {/* Tip button */}
            <div ref={buttonWrapRef}>
                <TipButton
                    {...buttonProps}
                    amount={amount}
                    currency={currency}
                    onTip={handleTip}
                    isLoading={isProcessing}
                    disabled={state !== 'idle' || buttonProps.disabled}
                />
            </div>

            {/* Processing overlay — shown only during non-idle states */}
            {state !== 'idle' && state !== 'flying' && (
                <ProcessingAnimation
                    phase={state as ProcessingPhase}
                    txHash={txHash}
                    onComplete={handleSuccessComplete}
                />
            )}
        </div>
    );
};

export default TipAnimation;
