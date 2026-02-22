/**
 * Tip Message Component
 * Allows adding optional message with character counter and emoji picker
 */

import React, { useState, useCallback, useRef } from 'react';
import { Smile } from 'lucide-react';

export interface TipMessageProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    placeholder?: string;
    showEmojiPicker?: boolean;
}

const EMOJI_DEFAULT = [
    '❤️', '😂', '🔥', '👏', '✨', '🎉',
    '😍', '🤩', '💯', '🙌', '👌', '🤘',
    '💪', '😎', '🎵', '🎸', '🎤', '🎼',
];

const TipMessage: React.FC<TipMessageProps> = ({
    value,
    onChange,
    maxLength = 280,
    placeholder = 'Send a message to the artist...',
    showEmojiPicker = true,
}) => {
    const [showEmojis, setShowEmojis] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = e.target.value.slice(0, maxLength);
            onChange(newValue);
        },
        [onChange, maxLength]
    );

    const handleAddEmoji = useCallback(
        (emoji: string) => {
            const newValue = value + emoji;
            onChange(newValue.slice(0, maxLength));
            textareaRef.current?.focus();
        },
        [value, onChange, maxLength]
    );

    const handleAutoResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }, []);

    // Close emoji picker when clicking outside
    React.useEffect(() => {
        if (!showEmojis) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojis(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojis]);

    const charPercentage = (value.length / maxLength) * 100;
    const isNearLimit = charPercentage > 80;

    return (
        <div className="space-y-3">
            {/* Textarea */}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => {
                        handleChange(e);
                        handleAutoResize(e);
                    }}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-lg bg-navy/50 border border-blue-primary/20 
                    text-white placeholder-gray-500 text-sm resize-none
                    focus:border-blue-primary/60 focus:outline-none focus:ring-2 focus:ring-blue-primary/30
                    transition-all duration-200 will-change-height"
                    style={{
                        minHeight: '80px',
                        maxHeight: '120px',
                    }}
                />

                {/* Emoji Picker Button */}
                {showEmojiPicker && (
                    <button
                        type="button"
                        onClick={() => setShowEmojis(!showEmojis)}
                        className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                            showEmojis
                                ? 'bg-blue-primary/30 text-blue-primary'
                                : 'hover:bg-navy text-gray-400 hover:text-blue-primary'
                        }`}
                        aria-label="Open emoji picker"
                        aria-expanded={showEmojis}
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Character Counter */}
            <div className="flex items-center justify-between px-1">
                <span className={`text-xs font-medium transition-colors duration-200 ${
                    isNearLimit ? 'text-orange-400' : 'text-gray-500'
                }`}>
                    {value.length} / {maxLength}
                </span>

                {/* Progress bar */}
                <div className="flex-1 mx-2 h-1 rounded-full bg-navy/50 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-200 ${
                            isNearLimit
                                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                : 'bg-gradient-to-r from-blue-primary to-ice-blue'
                        }`}
                        style={{ width: `${charPercentage}%` }}
                    />
                </div>
            </div>

            {/* Emoji Picker */}
            {showEmojis && (
                <div
                    ref={emojiPickerRef}
                    className="p-3 rounded-lg bg-navy/70 border border-blue-primary/20 grid grid-cols-6 gap-2 animate-fade-up"
                >
                    {EMOJI_DEFAULT.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleAddEmoji(emoji)}
                            className="p-2 rounded transition-all duration-200
                            hover:bg-blue-primary/20 hover:scale-110 active:scale-95
                            text-lg leading-none"
                            aria-label={`Add ${emoji} emoji`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Tips */}
            {value.length === 0 && (
                <p className="text-xs text-gray-600 leading-relaxed">
                    💡 <span className="font-medium text-gray-500">Pro tip:</span> A personalized message makes your tip more special!
                </p>
            )}
        </div>
    );
};

export default TipMessage;
