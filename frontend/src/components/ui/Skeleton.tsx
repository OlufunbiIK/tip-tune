
import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className}`}></div>
  );
};

export default Skeleton;
