import React, { useEffect, useState } from 'react';
import { useSpring, animated } from 'react-spring';
import { useReducedMotion } from '../../utils/animationUtils';

export type ProcessingPhase = 'idle' | 'processing' | 'confirming' | 'success';

export interface ProcessingAnimationProps {
    phase: ProcessingPhase;
    txHash?: string;
    /** called when success animation finishes */
    onComplete?: () => void;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const Spinner: React.FC = () => (
    <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-primary/20 animate-pulse" />
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-primary animate-spin" />
            {/* Stellar logo center */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-7 h-7 text-blue-primary" fill="currentColor">
                    <path d="M16 3a13 13 0 1 0 0 26A13 13 0 0 0 16 3zm5.6 8.6-1.4.7-8.3 4.2-1.4.7-.5-1 1.4-.7 8.3-4.2 1.4-.7.5 1zm-9.7 8.6 1.4-.7 8.3-4.2 1.4-.7.5 1-1.4.7-8.3 4.2-1.4.7-.5-1z" />
                </svg>
            </div>
        </div>
        <p className="text-sm font-medium text-blue-primary animate-pulse">Sending to Stellar…</p>
    </div>
);

const BlockchainConfirm: React.FC<{ txHash?: string }> = ({ txHash }) => (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="flex items-center gap-2 text-sm font-medium text-ice-blue">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="7" width="5" height="10" rx="1" />
                <rect x="9" y="4" width="5" height="16" rx="1" />
                <rect x="16" y="9" width="5" height="8" rx="1" />
            </svg>
            Awaiting block confirmation
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-navy/40 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-primary to-ice-blue rounded-full animate-fill-bar" />
        </div>

        {txHash && (
            <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ice-blue/70 hover:text-ice-blue underline transition-colors font-mono truncate max-w-full"
            >
                {txHash.slice(0, 8)}…{txHash.slice(-8)}
            </a>
        )}
    </div>
);

const SuccessCheck: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
    const reducedMotion = useReducedMotion();

    const [circleSpring] = useSpring(() => ({
        from: { opacity: 0, scale: 0 },
        to: { opacity: 1, scale: 1 },
        config: { tension: 280, friction: 20 },
    }));

    useEffect(() => {
        const t = setTimeout(() => onComplete?.(), reducedMotion ? 300 : 1200);
        return () => clearTimeout(t);
    }, [onComplete, reducedMotion]);

    return (
        <div className="flex flex-col items-center gap-3">
            <animated.div style={circleSpring} className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center border-2 border-green-400 animate-success-pop">
                <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="#4ade80" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline
                        points="4,13 9,18 20,7"
                        strokeDasharray="100"
                        strokeDashoffset="100"
                        className={reducedMotion ? '' : 'animate-draw-check'}
                    />
                </svg>
            </animated.div>
            <p className="text-sm font-semibold text-green-400">Tip sent! 🎉</p>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ProcessingAnimation: React.FC<ProcessingAnimationProps> = ({ phase, txHash, onComplete }) => {
    const reducedMotion = useReducedMotion();
    const [visible, setVisible] = useState(phase !== 'idle');

    const fadeSpring = useSpring({
        opacity: phase === 'idle' ? 0 : 1,
        scale: phase === 'idle' ? 0.95 : 1,
        config: { tension: 200, friction: 20 },
        onChange: ({ value }) => {
            if (value.opacity > 0) setVisible(true);
        },
        onRest: ({ value }) => {
            if (value.opacity === 0) setVisible(false);
        },
    });

    if (!visible && phase === 'idle') return null;

    return (
        <animated.div
            style={reducedMotion ? {} : fadeSpring}
            className="flex items-center justify-center p-6 rounded-2xl bg-navy/80 backdrop-blur border border-blue-primary/20 min-w-[220px]"
            role="status"
            aria-live="polite"
            aria-label={`Tip status: ${phase}`}
        >
            {phase === 'processing' && <Spinner />}
            {phase === 'confirming' && <BlockchainConfirm txHash={txHash} />}
            {phase === 'success' && <SuccessCheck onComplete={onComplete} />}
        </animated.div>
    );
};

// Fix typo in variable name inside SuccessCheck
// Re-export properly
export default ProcessingAnimation;
