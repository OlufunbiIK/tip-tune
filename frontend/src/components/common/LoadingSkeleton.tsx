import React from 'react';

interface LoadingSkeletonProps {
    className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = '' }) => {
    return (
        <div
            className={`animate-pulse bg-navy-800/50 rounded-lg ${className}`}
        />
    );
};

export default LoadingSkeleton;
