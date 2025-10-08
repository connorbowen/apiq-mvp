import React from 'react';

// Progress Bar Component
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const progressSizes = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4'
};

const progressColors = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  yellow: 'bg-yellow-600',
  red: 'bg-red-600',
  indigo: 'bg-indigo-600'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'indigo',
  showLabel = false,
  label,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-700 mb-1">
          <span>{label || 'Progress'}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${progressSizes[size]}`}>
        <div
          className={`${progressSizes[size]} ${progressColors[color]} rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  );
};

// Loading Skeleton Component
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
  lines = 1
}) => {
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${width} ${height} bg-gray-200 rounded animate-pulse`}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${width} ${height} bg-gray-200 rounded animate-pulse ${className}`}
    />
  );
};

// Loading States Component
interface LoadingStateProps {
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  children,
  skeleton,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={className}>
        {skeleton || <Skeleton lines={3} />}
      </div>
    );
  }

  return <>{children}</>;
};

// Spinner Component (enhanced version of your existing LoadingSpinner)
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white';
  className?: string;
}

const spinnerSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const spinnerColors = {
  blue: 'text-blue-600',
  gray: 'text-gray-600',
  white: 'text-white'
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = ''
}) => (
  <div className={`animate-spin ${spinnerSizes[size]} ${spinnerColors[color]} ${className}`}>
    <svg fill="none" viewBox="0 0 24 24">
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
  </div>
);

// Loading Overlay Component
interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  children,
  text = 'Loading...',
  className = ''
}) => (
  <div className={`relative ${className}`}>
    {children}
    {loading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="flex flex-col items-center space-y-2">
          <Spinner size="lg" />
          {text && <span className="text-sm text-gray-600">{text}</span>}
        </div>
      </div>
    )}
  </div>
);

// Step Progress Component (for multi-step processes)
interface StepProgressProps {
  steps: Array<{
    id: string;
    label: string;
    status: 'completed' | 'current' | 'upcoming';
  }>;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  className = ''
}) => (
  <nav className={`${className}`} aria-label="Progress">
    <ol className="flex items-center">
      {steps.map((step, index) => (
        <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
          {/* Connector line */}
          {index !== steps.length - 1 && (
            <div
              className={`absolute inset-0 flex items-center ${
                step.status === 'completed' ? 'text-indigo-600' : 'text-gray-300'
              }`}
              aria-hidden="true"
            >
              <div className="h-0.5 w-full bg-current" />
            </div>
          )}
          
          {/* Step content */}
          <div className="relative flex items-center justify-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                step.status === 'completed'
                  ? 'border-indigo-600 bg-indigo-600'
                  : step.status === 'current'
                  ? 'border-indigo-600 bg-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {step.status === 'completed' ? (
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className={`text-sm font-medium ${
                  step.status === 'current' ? 'text-indigo-600' : 'text-gray-500'
                }`}>
                  {index + 1}
                </span>
              )}
            </div>
            <span className={`ml-4 text-sm font-medium ${
              step.status === 'current' ? 'text-indigo-600' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  </nav>
);
