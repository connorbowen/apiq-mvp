/**
 * TODO: UX SIMPLIFICATION - MESSAGE BANNER UNIT TESTS - @connorbowen 2024-12-19
 * 
 * PHASE 1.4: Consolidate error/success messages
 * - [ ] test('should render success message correctly')
 * - [ ] test('should render error message correctly')
 * - [ ] test('should render warning message correctly')
 * - [ ] test('should render info message correctly')
 * - [ ] test('should auto-clear messages after timeout')
 * - [ ] test('should handle message dismissal')
 * - [ ] test('should limit displayed messages')
 * - [ ] test('should show clear all button when messages exceed limit')
 * 
 * PHASE 2.1: 3-tab structure integration
 * - [ ] test('should persist messages across tab changes')
 * - [ ] test('should handle message state in new structure')
 * - [ ] test('should integrate with dashboard message system')
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] test('should display correctly on mobile screens')
 * - [ ] test('should handle mobile message interactions')
 * - [ ] test('should maintain accessibility on mobile')
 * 
 * ACCESSIBILITY TESTING:
 * - [ ] test('should have proper ARIA live regions')
 * - [ ] test('should announce messages to screen readers')
 * - [ ] test('should have proper focus management')
 * - [ ] test('should support keyboard navigation')
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MessageBanner, { Message, MessageType } from '../../../src/components/MessageBanner';

// Mock timers for auto-clear testing
jest.useFakeTimers();

describe('MessageBanner', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      type: 'success',
      content: 'Operation completed successfully',
      autoClear: true,
      timeout: 5000,
    },
    {
      id: '2',
      type: 'error',
      content: 'An error occurred',
      autoClear: false,
    },
    {
      id: '3',
      type: 'warning',
      title: 'Warning',
      content: 'Please review your settings',
      autoClear: true,
      timeout: 3000,
    },
  ];

  const mockOnClear = jest.fn();
  const mockOnClearAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Message Rendering', () => {
    test('should render success message correctly', () => {
      const successMessage: Message = {
        id: '1',
        type: 'success',
        content: 'Success message',
      };

      render(
        <MessageBanner
          messages={[successMessage]}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-50', 'border-green-200');
    });

    test('should render error message correctly', () => {
      const errorMessage: Message = {
        id: '1',
        type: 'error',
        content: 'Error message',
      };

      render(
        <MessageBanner
          messages={[errorMessage]}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'border-red-200');
    });

    test('should render warning message correctly', () => {
      const warningMessage: Message = {
        id: '1',
        type: 'warning',
        title: 'Warning Title',
        content: 'Warning message',
      };

      render(
        <MessageBanner
          messages={[warningMessage]}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Warning Title')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    test('should render info message correctly', () => {
      const infoMessage: Message = {
        id: '1',
        type: 'info',
        content: 'Info message',
      };

      render(
        <MessageBanner
          messages={[infoMessage]}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-blue-50', 'border-blue-200');
    });
  });

  describe('Message Interaction', () => {
    test('should handle message dismissal', () => {
      render(
        <MessageBanner
          messages={mockMessages}
          onClear={mockOnClear}
        />
      );

      const dismissButtons = screen.getAllByLabelText('Dismiss message');
      fireEvent.click(dismissButtons[0]);

      expect(mockOnClear).toHaveBeenCalledWith('1');
    });

    test('should handle clear all functionality', () => {
      render(
        <MessageBanner
          messages={mockMessages}
          onClear={mockOnClear}
          onClearAll={mockOnClearAll}
          maxMessages={2}
        />
      );

      const clearAllButton = screen.getByText(/Clear all messages/);
      fireEvent.click(clearAllButton);

      expect(mockOnClearAll).toHaveBeenCalled();
    });
  });

  describe('Auto-clear Functionality', () => {
    test('should auto-clear messages after timeout', async () => {
      const autoClearMessage: Message = {
        id: '1',
        type: 'success',
        content: 'Auto-clear message',
        autoClear: true,
        timeout: 1000,
      };

      render(
        <MessageBanner
          messages={[autoClearMessage]}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Auto-clear message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockOnClear).toHaveBeenCalledWith('1');
      });
    });

    test('should not auto-clear messages without timeout', () => {
      const noAutoClearMessage: Message = {
        id: '1',
        type: 'error',
        content: 'No auto-clear message',
        autoClear: false,
      };

      render(
        <MessageBanner
          messages={[noAutoClearMessage]}
          onClear={mockOnClear}
        />
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText('No auto-clear message')).toBeInTheDocument();
      expect(mockOnClear).not.toHaveBeenCalled();
    });
  });

  describe('Message Limiting', () => {
    test('should limit displayed messages', () => {
      const manyMessages = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        type: 'info' as MessageType,
        content: `Message ${i + 1}`,
      }));

      render(
        <MessageBanner
          messages={manyMessages}
          onClear={mockOnClear}
          maxMessages={3}
        />
      );

      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 2')).toBeInTheDocument();
      expect(screen.getByText('Message 3')).toBeInTheDocument();
      expect(screen.queryByText('Message 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Message 5')).not.toBeInTheDocument();
    });

    test('should show clear all button when messages exceed limit', () => {
      const manyMessages = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        type: 'info' as MessageType,
        content: `Message ${i + 1}`,
      }));

      render(
        <MessageBanner
          messages={manyMessages}
          onClear={mockOnClear}
          onClearAll={mockOnClearAll}
          maxMessages={3}
        />
      );

      expect(screen.getByText(/Clear all messages \(2 more\)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA live regions', () => {
      render(
        <MessageBanner
          messages={mockMessages}
          onClear={mockOnClear}
        />
      );

      const liveRegion = screen.getByRole('region', { name: 'Messages' });
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      const alerts = screen.getAllByRole('alert');
      alerts.forEach(alert => {
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    test('should have proper focus management', () => {
      render(
        <MessageBanner
          messages={mockMessages}
          onClear={mockOnClear}
        />
      );

      const dismissButtons = screen.getAllByLabelText('Dismiss message');
      dismissButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label', 'Dismiss message');
      });
    });

    test('should support keyboard navigation', () => {
      render(
        <MessageBanner
          messages={mockMessages}
          onClear={mockOnClear}
        />
      );

      const dismissButtons = screen.getAllByLabelText('Dismiss message');
      dismissButtons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Empty State', () => {
    test('should not render when no messages', () => {
      const { container } = render(
        <MessageBanner
          messages={[]}
          onClear={mockOnClear}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
}); 