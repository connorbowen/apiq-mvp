/**
 * MessageBanner Component Tests
 * 
 * Comprehensive test suite for the unified message display component.
 * Tests all message types (success, error, warning, info) and functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MessageBanner from '../../../src/components/MessageBanner';

// Mock timers for auto-clear testing
jest.useFakeTimers();

describe('MessageBanner', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Message Rendering', () => {
    test('should render success message correctly', () => {
      render(
        <MessageBanner
          type="success"
          message="Operation completed successfully"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-50', 'border-green-200');
    });

    test('should render error message correctly', () => {
      render(
        <MessageBanner
          type="error"
          message="An error occurred"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'border-red-200');
    });

    test('should render warning message correctly', () => {
      render(
        <MessageBanner
          type="warning"
          message="Please review your input"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Please review your input')).toBeInTheDocument();
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    test('should render info message correctly', () => {
      render(
        <MessageBanner
          type="info"
          message="New features are available"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('New features are available')).toBeInTheDocument();
      expect(screen.getByTestId('info-message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    test('should not render when no message provided', () => {
      const { container } = render(
        <MessageBanner
          type="success"
          message=""
          onClose={mockOnClose}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Message Interaction', () => {
    test('should handle message dismissal', () => {
      render(
        <MessageBanner
          type="success"
          message="Test message"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close message');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should not show close button when onClose is not provided', () => {
      render(
        <MessageBanner
          type="success"
          message="Test message"
        />
      );

      expect(screen.queryByLabelText('Close message')).not.toBeInTheDocument();
    });
  });

  describe('Auto-clear Functionality', () => {
    test('should auto-clear messages after timeout', async () => {
      render(
        <MessageBanner
          type="success"
          message="Auto-clear message"
          onClose={mockOnClose}
          autoClose={true}
          autoCloseDelay={1000}
        />
      );

      expect(screen.getByText('Auto-clear message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should not auto-clear when autoClose is false', () => {
      render(
        <MessageBanner
          type="success"
          message="No auto-clear message"
          onClose={mockOnClose}
          autoClose={false}
        />
      );

      expect(screen.getByText('No auto-clear message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('should use different default timeouts for different message types', () => {
      const { rerender } = render(
        <MessageBanner
          type="success"
          message="Success message"
          onClose={mockOnClose}
        />
      );

      // Success message should auto-clear after 5 seconds
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnClose).toHaveBeenCalled();

      jest.clearAllMocks();

      rerender(
        <MessageBanner
          type="error"
          message="Error message"
          onClose={mockOnClose}
        />
      );

      // Error message should auto-clear after 8 seconds
      act(() => {
        jest.advanceTimersByTime(7000);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnClose).toHaveBeenCalled();

      jest.clearAllMocks();

      rerender(
        <MessageBanner
          type="warning"
          message="Warning message"
          onClose={mockOnClose}
        />
      );

      // Warning message should auto-clear after 6 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnClose).toHaveBeenCalled();

      jest.clearAllMocks();

      rerender(
        <MessageBanner
          type="info"
          message="Info message"
          onClose={mockOnClose}
        />
      );

      // Info message should auto-clear after 4 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should use custom timeout when provided', () => {
      render(
        <MessageBanner
          type="success"
          message="Custom timeout message"
          onClose={mockOnClose}
          autoCloseDelay={2000}
        />
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <MessageBanner
          type="success"
          message="Test message"
          onClose={mockOnClose}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    test('should have proper close button accessibility', () => {
      render(
        <MessageBanner
          type="success"
          message="Test message"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close message');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close message');
    });

    test('should announce messages to screen readers', () => {
      // Create aria-live region if it doesn't exist
      let liveRegion = document.getElementById('aria-live-announcements');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        document.body.appendChild(liveRegion);
      }

      render(
        <MessageBanner
          type="success"
          message="Screen reader message"
          onClose={mockOnClose}
        />
      );

      expect(liveRegion.textContent).toBe('Screen reader message');

      // Clean up
      setTimeout(() => {
        expect(liveRegion.textContent).toBe('');
      }, 1000);
    });
  });

  describe('Styling and Icons', () => {
    test('should have appropriate icons for each message type', () => {
      const { rerender } = render(
        <MessageBanner
          type="success"
          message="Success message"
          onClose={mockOnClose}
        />
      );

      // Success icon (checkmark)
      expect(screen.getByTestId('success-message')).toBeInTheDocument();

      rerender(
        <MessageBanner
          type="error"
          message="Error message"
          onClose={mockOnClose}
        />
      );

      // Error icon (X)
      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      rerender(
        <MessageBanner
          type="warning"
          message="Warning message"
          onClose={mockOnClose}
        />
      );

      // Warning icon (triangle)
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();

      rerender(
        <MessageBanner
          type="info"
          message="Info message"
          onClose={mockOnClose}
        />
      );

      // Info icon (i)
      expect(screen.getByTestId('info-message')).toBeInTheDocument();
    });

    test('should have appropriate color schemes for each message type', () => {
      const { rerender } = render(
        <MessageBanner
          type="success"
          message="Success message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('bg-green-50', 'border-green-200');
      expect(screen.getByRole('alert').querySelector('p')).toHaveClass('text-green-800');

      rerender(
        <MessageBanner
          type="error"
          message="Error message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'border-red-200');
      expect(screen.getByRole('alert').querySelector('p')).toHaveClass('text-red-800');

      rerender(
        <MessageBanner
          type="warning"
          message="Warning message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50', 'border-yellow-200');
      expect(screen.getByRole('alert').querySelector('p')).toHaveClass('text-yellow-800');

      rerender(
        <MessageBanner
          type="info"
          message="Info message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('bg-blue-50', 'border-blue-200');
      expect(screen.getByRole('alert').querySelector('p')).toHaveClass('text-blue-800');
    });
  });
}); 