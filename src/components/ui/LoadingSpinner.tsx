import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  testId?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  text = 'Loading...',
  className = '',
  testId = 'loading-spinner'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div 
      data-testid={testId}
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="loading"
    >
      <svg 
        className={`animate-spin ${sizeClasses[size]} text-indigo-600`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <span className="ml-2 text-sm text-gray-600 loading-text">
          {text}
        </span>
      )}
    </div>
  );
} 