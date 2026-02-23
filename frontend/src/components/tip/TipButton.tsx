import React, { useState, useRef, useCallback } from 'react';
import { useSpring, animated } from 'react-spring';
import { useReducedMotion, generateCoinParticles, type CoinParticle } from '../../utils/animationUtils';

export interface TipButtonProps {
    /** Amount in XLM */
    amount: number;
    currency?: 'XLM' | 'USDC';
    onTip: (amount: number, currency: string) => Promise<void> | void;
    isLoading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'ghost' | 'compact';
    label?: string;
    className?: string;
}

const TipButton: React.FC<TipButtonProps> = ({
    amount,
    currency = 'XLM',
    onTip,
    isLoading = false,
    disabled = false,
    variant = 'primary',
    label,
    className = '',
}) => {
    const reducedMotion = useReducedMotion();
    const [coins, setCoins] = useState<CoinParticle[]>([]);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const [clickScale, setClickScale] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const rippleIdRef = useRef(0);

    // Spring for the button scale (bounce on press)
    const [springProps, springApi] = useSpring(() => ({
        scale: 1,
        config: { tension: 300, friction: 10 },
    }));

    const triggerCoins = useCallback(() => {
        if (reducedMotion) return;
        const newCoins = generateCoinParticles(5);
        setCoins(newCoins);
        setTimeout(() => setCoins([]), 1200);
    }, [reducedMotion]);

    const addRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (reducedMotion) return;
        const rect = btnRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = rippleIdRef.current++;
        setRipples(prev => [...prev, { id, x, y }]);
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 650);
    }, [reducedMotion]);

    const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || isLoading) return;
        addRipple(e);
        triggerCoins();

        // Press animation
        if (!reducedMotion) {
            springApi.start({ scale: 0.92 });
            setTimeout(() => springApi.start({ scale: 1 }), 150);
        }

        setClickScale(true);
        setTimeout(() => setClickScale(false), 300);
        await onTip(amount, currency);
    }, [disabled, isLoading, addRipple, triggerCoins, reducedMotion, springApi, onTip, amount, currency]);

    const baseClasses = {
        primary: `relative overflow-hidden inline-flex items-center justify-center gap-2
      px-6 py-3 rounded-2xl font-semibold text-sm
      bg-gradient-to-r from-accent-gold to-yellow-500
      text-gray-900 shadow-lg shadow-yellow-500/25
      hover:shadow-yellow-500/40 hover:from-yellow-400 hover:to-amber-500
      transition-shadow duration-200
      disabled:opacity-50 disabled:cursor-not-allowed`,
        ghost: `relative overflow-hidden inline-flex items-center justify-center gap-2
      px-5 py-2.5 rounded-2xl font-medium text-sm border-2 border-accent-gold/60
      text-accent-gold hover:bg-accent-gold/10
      transition-colors duration-200
      disabled:opacity-50 disabled:cursor-not-allowed`,
        compact: `relative overflow-hidden inline-flex items-center justify-center gap-1.5
      px-3 py-1.5 rounded-xl font-medium text-xs
      bg-accent-gold/15 text-accent-gold border border-accent-gold/30
      hover:bg-accent-gold/25
      transition-colors duration-200
      disabled:opacity-50 disabled:cursor-not-allowed`,
    };

    return (
        <div className="relative inline-block">
            {/* Coin particles */}
            {coins.map(coin => (
                <span
                    key={coin.id}
                    aria-hidden="true"
                    className="pointer-events-none absolute text-base select-none animate-coin-fly"
                    style={{
                        left: `calc(50% + ${coin.x}px)`,
                        bottom: '100%',
                        animationDuration: `${coin.duration}ms`,
                        animationDelay: `${coin.delay}ms`,
                        transform: `scale(${coin.scale})`,
                        '--coin-rotate': `${coin.angle}deg`,
                    } as React.CSSProperties}
                >
                    🪙
                </span>
            ))}

            <animated.button
                ref={btnRef}
                id={`tip-button-${amount}-${currency}`}
                type="button"
                onClick={handleClick}
                disabled={disabled || isLoading}
                aria-label={`Tip ${amount} ${currency}`}
                aria-busy={isLoading}
                style={{ scale: reducedMotion ? 1 : springProps.scale }}
                className={`${baseClasses[variant]} ${clickScale && !reducedMotion ? 'brightness-110' : ''} ${className}`}
            >
                {/* Ripple effects */}
                {ripples.map(r => (
                    <span
                        key={r.id}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full bg-white/30 w-10 h-10 -translate-x-1/2 -translate-y-1/2 animate-ripple"
                        style={{ left: r.x, top: r.y }}
                    />
                ))}

                {/* Loading spinner */}
                {isLoading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        <span>Sending…</span>
                    </>
                ) : (
                    <>
                        <span aria-hidden="true">🪙</span>
                        <span>{label ?? `Tip ${amount} ${currency}`}</span>
                    </>
                )}
            </animated.button>
        </div>
    );
};

export default TipButton;
