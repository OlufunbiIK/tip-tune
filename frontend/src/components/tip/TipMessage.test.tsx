/**
 * TipMessage Component Tests
 */

import { render, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TipMessage from './TipMessage';

describe('TipMessage', () => {
    const mockOnChange = vi.fn();

    const defaultProps = {
        value: '',
        onChange: mockOnChange,
        maxLength: 280,
        placeholder: 'Send a message to the artist...',
    };

    it('renders textarea', () => {
        render(<TipMessage {...defaultProps} />);
        expect(screen.getByPlaceholderText(/Send a message/i)).toBeInTheDocument();
    });

    it('updates value on input change', async () => {
        const user = userEvent.setup();
        render(<TipMessage {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/Send a message/i);
        await user.type(textarea, 'Great performance!');

        expect(mockOnChange).toHaveBeenCalledWith('Great performance!');
    });

    it('displays character counter', () => {
        render(<TipMessage {...defaultProps} value="Test" />);
        expect(screen.getByText(/4 \/ 280/)).toBeInTheDocument();
    });

    it('enforces max length', async () => {
        const user = userEvent.setup();
        const longText = 'a'.repeat(300);

        render(
            <TipMessage
                {...defaultProps}
                maxLength={10}
            />
        );

        const textarea = screen.getByPlaceholderText(/Send a message/i);
        await user.type(textarea, longText);

        expect(mockOnChange).toHaveBeenLastCalledWith('a'.repeat(10));
    });

    it('shows emoji picker button', () => {
        render(<TipMessage {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Open emoji picker/i })).toBeInTheDocument();
    });

    it('opens emoji picker when button clicked', async () => {
        const user = userEvent.setup();
        render(<TipMessage {...defaultProps} />);

        const emojiBtn = screen.getByRole('button', { name: /Open emoji picker/i });
        await user.click(emojiBtn);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Add ❤️ emoji/i })).toBeInTheDocument();
        });
    });

    it('adds emoji to message when clicked', async () => {
        const user = userEvent.setup();
        render(<TipMessage {...defaultProps} value="Love" />);

        const emojiBtn = screen.getByRole('button', { name: /Open emoji picker/i });
        await user.click(emojiBtn);

        const heartBtn = screen.getByRole('button', { name: /Add ❤️ emoji/i });
        await user.click(heartBtn);

        expect(mockOnChange).toHaveBeenCalledWith('Love❤️');
    });

    it('shows character counter warning when near limit', () => {
        render(
            <TipMessage
                {...defaultProps}
                value={'a'.repeat(250)}
                maxLength={280}
            />
        );

        const counter = screen.getByText(/250 \/ 280/);
        expect(counter).toHaveClass('text-orange-400');
    });

    it('shows pro tip when message is empty', () => {
        render(<TipMessage {...defaultProps} />);
        expect(screen.getByText(/Pro tip:/)).toBeInTheDocument();
    });

    it('hides emoji picker button when showEmojiPicker is false', () => {
        render(
            <TipMessage
                {...defaultProps}
                showEmojiPicker={false}
            />
        );
        expect(screen.queryByRole('button', { name: /Open emoji picker/i })).not.toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
        render(<TipMessage {...defaultProps} />);
        const textarea = screen.getByPlaceholderText(/Send a message/i);
        expect(textarea).toHaveAttribute('maxLength', '280');
    });
});
