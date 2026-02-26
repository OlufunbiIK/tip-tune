import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      className = '',
      loading = false,
      loadingText = 'Loading',
      disabled,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-slate disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-primary-blue text-white hover:bg-primary-blue/90 focus-visible:ring-primary-blue',
      secondary: 'bg-secondary-indigo text-white hover:bg-secondary-indigo/90 focus-visible:ring-secondary-indigo',
      outline: 'border-2 border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white focus-visible:ring-primary-blue',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">{loadingText}</span>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
