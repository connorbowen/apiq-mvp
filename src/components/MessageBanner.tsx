/**
 * MessageBanner Component
 * 
 * Unified message display component for all notification types.
 * Features:
 * - Support for success, error, warning, and info message types
 * - Auto-clear functionality with configurable timeouts
 * - Accessibility features (ARIA live regions)
 * - Mobile responsive design
 * - Manual close functionality
 * 
 * Usage:
 * <MessageBanner
 *   type="success"
 *   message="Operation completed successfully"
 *   onClose={() => setMessage(null)}
 *   autoClose={true}
 *   autoCloseDelay={5000}
 * />
 */

import React from 'react';

interface MessageBannerProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function MessageBanner({ 
  type, 
  message, 
  onClose, 
  autoClose = true, 
  autoCloseDelay 
}: MessageBannerProps) {
  // Don't render if no message
  if (!message) {
    return null;
  }

  // Default timeouts based on message type
  const getDefaultTimeout = () => {
    switch (type) {
      case 'success': return 5000;
      case 'error': return 8000;
      case 'warning': return 6000;
      case 'info': return 4000;
      default: return 5000;
    }
  };

  const timeout = autoCloseDelay ?? getDefaultTimeout();

  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, timeout);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, timeout]);

  React.useEffect(() => {
    // Announce to screen readers
    const liveRegion = document.getElementById('aria-live-announcements');
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, [message]);

  // Get styling based on message type
  const getMessageStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-400',
          hoverColor: 'hover:text-green-600',
          focusColor: 'focus:ring-green-500',
          testId: 'success-message',
          icon: (
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-400',
          hoverColor: 'hover:text-red-600',
          focusColor: 'focus:ring-red-500',
          testId: 'error-message',
          icon: (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-400',
          hoverColor: 'hover:text-yellow-600',
          focusColor: 'focus:ring-yellow-500',
          testId: 'warning-message',
          icon: (
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-400',
          hoverColor: 'hover:text-blue-600',
          focusColor: 'focus:ring-blue-500',
          testId: 'info-message',
          icon: (
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const styles = getMessageStyles();

  return (
    <div 
      data-testid={styles.testId}
      className={`mb-6 p-4 ${styles.bgColor} border ${styles.borderColor} rounded-md`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm ${styles.textColor}`}>{message}</p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex ${styles.textColor} ${styles.hoverColor} focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.focusColor}`}
              aria-label="Close message"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 