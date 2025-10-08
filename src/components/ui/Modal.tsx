import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  className = '',
  closeOnOverlayClick = true,
  closeOnEscape = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, closeOnEscape]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={title ? "modal-title" : undefined}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleOverlayClick}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`relative bg-white rounded-lg shadow-xl w-full ${modalSizes[size]} ${className}`}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className={title ? 'p-6' : 'p-6'}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal Header Component
interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  onClose,
  className = ''
}) => (
  <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${className}`}>
    {children}
    {onClose && (
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1"
        aria-label="Close modal"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

// Modal Body Component
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = ''
}) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

// Modal Footer Component
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = ''
}) => (
  <div className={`flex justify-end space-x-3 p-6 border-t border-gray-200 ${className}`}>
    {children}
  </div>
);
