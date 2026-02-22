import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`bg-white dark:bg-deep-slate rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
