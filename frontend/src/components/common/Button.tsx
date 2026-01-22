import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-blue-primary text-white hover:bg-blue-600 focus:ring-blue-primary',
    secondary: 'bg-ice-blue text-navy hover:bg-cyan-400 focus:ring-ice-blue',
    outline: 'border-2 border-blue-primary text-blue-primary hover:bg-blue-primary hover:text-white focus:ring-blue-primary',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
