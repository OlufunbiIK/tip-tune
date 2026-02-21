import React, { useState, useCallback } from 'react';
import { animated, useSpring, useTrail } from 'react-spring';
import { useReducedMotion, getSpringConfig } from '../../utils/animationUtils';
import { useHaptic } from '../../hooks';
import AssetToggle from './AssetToggle';

const PRESETS = [1, 5, 10, 25, 50];

export interface AmountSelectorProps {
    value: number;
    currency: 'XLM' | 'USDC';
    onAmountChange: (amount: number) => void;
    onCurrencyToggle?: (currency: 'XLM' | 'USDC') => void;
    walletBalance?: { xlm: number; usdc: number };
    xlmUsdRate?: number;
}

const AmountSelector: React.FC<AmountSelectorProps> = ({
    value,
    currency,
    onAmountChange,
    onCurrencyToggle,
    walletBalance = { xlm: 1000, usdc: 5000 },
    xlmUsdRate = 0.12,
}) => {
    const reducedMotion = useReducedMotion();
    const haptic = useHaptic();
    const presets = PRESETS;
    const [activePreset, setActivePreset] = useState(5);
    const [customValue, setCustomValue] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [pressedId, setPressedId] = useState<number | null>(null);
    const [showSlider, setShowSlider] = useState(false);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);

    const maxAmount = currency === 'XLM' ? walletBalance.xlm : walletBalance.usdc;

    const springConfig = getSpringConfig(reducedMotion ? undefined : 'gentle');
    const presetSpringConfig = getSpringConfig(reducedMotion ? undefined : 'wobbly');

    const trail = useTrail(presets.length, {
        from: { opacity: 0, scale: 0.8 },
        to: { opacity: 1, scale: 1 },
        config: presetSpringConfig,
    });

    const inputSpring = useSpring({
        opacity: showCustomInput ? 1 : 0,
        height: showCustomInput ? 48 : 0,
        config: springConfig,
    });

    const handlePresetClick = useCallback((preset: number, idx: number) => {
        haptic?.trigger('light');
        setActivePreset(preset);
        setPressedId(idx);
        setCustomValue('');
        setShowCustomInput(false);
        setShowSlider(false);
        onAmountChange(preset);
        setTimeout(() => setPressedId(null), 150);
    }, [onAmountChange, haptic]);

    const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomValue(val);
        const numVal = parseFloat(val) || 0;
        if (numVal > 0 && numVal <= maxAmount) {
            onAmountChange(numVal);
            setActivePreset(-1);
            haptic?.trigger('light');
        }
    }, [onAmountChange, maxAmount, haptic]);

    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.currentTarget.value);
        onAmountChange(val);
        setActivePreset(-1);
    }, [onAmountChange]);

    const handleSliderDragStart = useCallback(() => {
        setIsDraggingSlider(true);
        haptic?.trigger('medium');
    }, [haptic]);

    const handleSliderDragEnd = useCallback(() => {
        setIsDraggingSlider(false);
        haptic?.trigger('light');
    }, [haptic]);

    const handleCurrencyToggle = useCallback(() => {
        haptic?.trigger('selection');
        const next = currency === 'XLM' ? 'USDC' : 'XLM';
        onCurrencyToggle?.(next);
    }, [currency, onCurrencyToggle, haptic]);

    const usdEquivalent = currency === 'XLM'
        ? (value * xlmUsdRate).toFixed(2)
        : value.toFixed(2);

    return (
        <div className="space-y-4" role="group" aria-label="Select tip amount">
            <AssetToggle
                currency={currency}
                onToggle={handleCurrencyToggle}
                xlmUsdRate={xlmUsdRate}
                walletBalance={walletBalance}
                displayAmount={value}
            />

            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preset amounts">
                {trail.map((style, idx) => {
                    const preset = presets[idx];
                    const isActive = activePreset === preset;
                    const isPressed = pressedId === idx;

                    return (
                        <animated.button
                            key={preset}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            id={`preset-amount-${preset}`}
                            onClick={() => handlePresetClick(preset, idx)}
                            style={{
                                ...style,
                                scale: isPressed && !reducedMotion ? 0.88 : isActive && !reducedMotion ? 1.08 : 1,
                            }}
                            className={`min-w-[52px] px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-150
                ${isActive
                                    ? 'bg-accent-gold text-gray-900 shadow-lg shadow-accent-gold/30'
                                    : 'bg-navy/40 border border-blue-primary/20 text-gray-300 hover:border-blue-primary/50 hover:text-white'}
              `}
                        >
                            {preset}
                        </animated.button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={() => {
                    setShowSlider(!showSlider);
                    setShowCustomInput(false);
                    haptic?.trigger('light');
                }}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
                {showSlider ? '▼' : '▶'} Slider
            </button>

            {showSlider && (
                <div className="space-y-3">
                    <label htmlFor="amount-slider" className="text-xs text-gray-400 uppercase tracking-wider font-medium block">
                        Quick Adjust
                    </label>
                    <div className="relative">
                        <input
                            id="amount-slider"
                            type="range"
                            min="0"
                            max={maxAmount}
                            step={currency === 'XLM' ? 0.1 : 0.01}
                            value={value}
                            onChange={handleSliderChange}
                            onMouseDown={handleSliderDragStart}
                            onMouseUp={handleSliderDragEnd}
                            onTouchStart={handleSliderDragStart}
                            onTouchEnd={handleSliderDragEnd}
                            className="w-full h-2 rounded-full bg-navy appearance-none cursor-pointer"
                            aria-label="Tip amount slider"
                            aria-valuemin={0}
                            aria-valuemax={maxAmount}
                            aria-valuenow={value}
                            aria-valuetext={`${value.toFixed(2)} ${currency}`}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>0</span>
                        <span className={isDraggingSlider ? 'text-blue-primary font-semibold' : ''}>
                            {value.toFixed(2)} {currency}
                        </span>
                        <span>{maxAmount.toFixed(2)}</span>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => {
                    setShowCustomInput(!showCustomInput);
                    setShowSlider(false);
                    haptic?.trigger('light');
                }}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
                {showCustomInput ? '▼' : '▶'} Custom Amount
            </button>

            {showCustomInput && (
                <animated.div style={reducedMotion ? {} : inputSpring} className="rounded-xl overflow-hidden">
                    <div className="relative flex items-center bg-navy/40 border border-blue-primary/20 rounded-xl">
                        <span className="pl-4 text-gray-400 text-sm select-none">Custom</span>
                        <input
                            id="custom-tip-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={customValue}
                            onChange={handleCustomChange}
                            placeholder="0.00"
                            aria-label="Custom tip amount"
                            className="flex-1 bg-transparent text-right pr-3 py-3 text-white text-sm font-medium outline-none placeholder-gray-600"
                        />
                        <span className="pr-4 text-gray-400 text-xs font-medium">{currency}</span>
                    </div>
                </animated.div>
            )}

            <p className="text-xs text-gray-500 text-right">
                ≈ <span className="text-gray-300 font-medium">${usdEquivalent} USD</span>
            </p>
        </div>
    );
};

export default AmountSelector;
