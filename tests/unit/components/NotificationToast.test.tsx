import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock NotificationToast component
const NotificationToast = ({ 
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  onAction
}: { 
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  onAction?: () => void;
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className={`notification-toast border rounded-md p-4 ${typeClasses[type]}`}>
      <div className="flex items-start">
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          {message && <p className="text-sm mt-1">{message}</p>}
        </div>
        <div className="flex items-center space-x-2">
          {onAction && (
            <button 
              onClick={onAction}
              className="text-sm font-medium hover:underline"
            >
              Action
            </button>
          )}
          <button 
            onClick={handleClose}
            className="text-sm opacity-70 hover:opacity-100"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

describe('NotificationToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with title and message', () => {
    render(
      <NotificationToast 
        title="Success!" 
        message="Operation completed successfully" 
      />
    );
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
  });

  it('renders with title only', () => {
    render(<NotificationToast title="Info" />);
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.queryByText('Operation completed successfully')).not.toBeInTheDocument();
  });

  it('applies correct type classes', () => {
    const { rerender } = render(<NotificationToast title="Test" type="success" />);
    expect(screen.getByText('Test').closest('.notification-toast')).toHaveClass('bg-green-50');
    
    rerender(<NotificationToast title="Test" type="error" />);
    expect(screen.getByText('Test').closest('.notification-toast')).toHaveClass('bg-red-50');
    
    rerender(<NotificationToast title="Test" type="warning" />);
    expect(screen.getByText('Test').closest('.notification-toast')).toHaveClass('bg-yellow-50');
    
    rerender(<NotificationToast title="Test" type="info" />);
    expect(screen.getByText('Test').closest('.notification-toast')).toHaveClass('bg-blue-50');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<NotificationToast title="Test" onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close notification/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onAction when action button is clicked', () => {
    const onAction = jest.fn();
    render(<NotificationToast title="Test" onAction={onAction} />);
    const actionBtn = screen.getByRole('button', { name: /action/i });
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalled();
  });

  it('auto-dismisses after duration', () => {
    const onClose = jest.fn();
    render(<NotificationToast title="Test" duration={1000} onClose={onClose} />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('does not auto-dismiss when duration is 0', () => {
    const onClose = jest.fn();
    render(<NotificationToast title="Test" duration={0} onClose={onClose} />);
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
}); 