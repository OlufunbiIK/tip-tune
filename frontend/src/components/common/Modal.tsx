import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    description?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, description }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const prefersReducedMotion = useReducedMotion();

    useFocusTrap(modalRef, { enabled: isOpen, initialFocus: closeButtonRef });

    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen && previousActiveElement.current) {
            previousActiveElement.current.focus();
        }
    }, [isOpen]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="relative z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-description' : undefined}
        >
            <div
                className="fixed inset-0 bg-black/75 transition-opacity"
                aria-hidden="true"
                onClick={handleBackdropClick}
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
                    onClick={handleBackdropClick}
                    role="presentation"
                >
                    <div
                        ref={modalRef}
                        className={`relative transform overflow-hidden rounded-lg bg-navy-900 border border-navy-700 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg ${
                            prefersReducedMotion ? '' : 'transition-all'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="document"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-navy-800">
                            <h2 id="modal-title" className="text-lg font-semibold text-white">
                                {title}
                            </h2>
                            <button
                                ref={closeButtonRef}
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                                aria-label={`Close ${title} modal`}
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>
                        {description && (
                            <p id="modal-description" className="sr-only">
                                {description}
                            </p>
                        )}
                        <div className="p-4 sm:p-6">{children}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
