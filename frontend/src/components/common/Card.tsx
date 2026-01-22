import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
