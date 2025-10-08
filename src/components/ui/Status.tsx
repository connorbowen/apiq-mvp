import React from 'react';

// Status Badge Component
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'running' | 'paused' | 'error' | 'success' | 'warning' | 'info';
  children?: React.ReactNode;
  className?: string;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  paused: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800'
};

const statusIcons = {
  active: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  inactive: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  running: (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  paused: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className = ''
}) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]} ${className}`}>
    {statusIcons[status]}
    <span className="ml-1">{children || status}</span>
  </span>
);

// Status Indicator Component (for connection health, etc.)
interface StatusIndicatorProps {
  status: 'healthy' | 'unhealthy' | 'testing' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const indicatorColors = {
  healthy: 'bg-green-500',
  unhealthy: 'bg-red-500',
  testing: 'bg-yellow-500 animate-pulse',
  unknown: 'bg-gray-400'
};

const indicatorSizes = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4'
};

const statusLabels = {
  healthy: 'Healthy',
  unhealthy: 'Unhealthy',
  testing: 'Testing',
  unknown: 'Unknown'
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false,
  className = ''
}) => (
  <div className={`flex items-center ${className}`}>
    <div className={`${indicatorSizes[size]} ${indicatorColors[status]} rounded-full`} />
    {showLabel && (
      <span className="ml-2 text-sm text-gray-600">{statusLabels[status]}</span>
    )}
  </div>
);

// Connection Status Component (specific to your use case)
interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  lastTested?: string;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  lastTested,
  className = ''
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Connected'
        };
      case 'disconnected':
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          label: 'Disconnected'
        };
      case 'testing':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          label: 'Testing...'
        };
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Error'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: null,
          label: 'Unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}>
      {statusInfo.icon && (
        <span className={`${statusInfo.color} mr-2`}>
          {statusInfo.icon}
        </span>
      )}
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
      {lastTested && (
        <span className="ml-2 text-xs text-gray-500">
          Last tested: {lastTested}
        </span>
      )}
    </div>
  );
};
