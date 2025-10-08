import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  dismissible?: boolean;
}

const alertStyles = {
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    content: 'text-green-700'
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    content: 'text-red-700'
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    content: 'text-yellow-700'
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    content: 'text-blue-700'
  }
};

const alertIcons = {
  success: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  children,
  onClose,
  className = '',
  dismissible = false
}) => {
  const styles = alertStyles[type];
  const icon = alertIcons[type];

  return (
    <div className={`rounded-md border p-4 ${styles.container} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className={styles.icon}>
            {icon}
          </span>
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${styles.content} ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        </div>
        {dismissible && onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.icon} hover:opacity-75`}
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Toast Notification Component
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  onClose,
  duration = 5000,
  className = ''
}) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = alertStyles[type];
  const icon = alertIcons[type];

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${className}`}>
      <div className={`rounded-md border p-4 shadow-lg ${styles.container}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <span className={styles.icon}>
              {icon}
            </span>
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm ${styles.content}`}>
              {message}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.icon} hover:opacity-75`}
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Banner Component (for your existing MessageBanner pattern)
interface BannerProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  type,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  className = ''
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const styles = alertStyles[type];
  const icon = alertIcons[type];

  return (
    <div className={`${styles.container} border-l-4 ${className}`} role="alert">
      <div className="flex p-4">
        <div className="flex-shrink-0">
          <span className={styles.icon}>
            {icon}
          </span>
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm ${styles.content}`}>
            {message}
          </p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.icon} hover:opacity-75`}
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
