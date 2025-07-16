import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserDropdown from '../../../../src/components/dashboard/UserDropdown';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  firstName: 'Test',
  lastName: 'User',
};

const mockOnLogout = jest.fn();

describe('UserDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user name in dropdown toggle', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByTestId('user-dropdown-toggle')).toBeInTheDocument();
  });

  it('displays full name when firstName and lastName are available', () => {
    const userWithFullName = {
      ...mockUser,
      firstName: 'John',
      lastName: 'Doe',
    };

    render(<UserDropdown user={userWithFullName} onLogout={mockOnLogout} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('falls back to name when firstName/lastName are not available', () => {
    const userWithoutFullName = {
      ...mockUser,
      firstName: undefined,
      lastName: undefined,
    };

    render(<UserDropdown user={userWithoutFullName} onLogout={mockOnLogout} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('opens dropdown when toggle is clicked', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

    expect(screen.getByText('Profile & Settings')).toBeInTheDocument();
    expect(screen.getByText('All Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('displays user information in dropdown', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

    // Check for user info in the dropdown (not the toggle button)
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument(); // role lowercase
  });

  it('navigates to profile when Profile & Settings is clicked', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
    fireEvent.click(screen.getByTestId('user-dropdown-profile'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=settings&section=account');
  });

  it('navigates to settings when All Settings is clicked', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
    fireEvent.click(screen.getByTestId('user-dropdown-settings'));

    // The Link component doesn't call router.push, it navigates naturally
    // So we just check that the link exists with the correct href
    expect(screen.getByTestId('user-dropdown-settings')).toHaveAttribute('href', '/dashboard?tab=settings');
  });

  it('calls onLogout when Sign Out is clicked', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
    fireEvent.click(screen.getByTestId('user-dropdown-logout'));

    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('closes dropdown when clicking outside', async () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
    expect(screen.getByText('Profile & Settings')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Profile & Settings')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when pressing Escape key', async () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
    expect(screen.getByText('Profile & Settings')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Profile & Settings')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

    const toggle = screen.getByTestId('user-dropdown-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-haspopup', 'true');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('truncates long names appropriately', () => {
    const userWithLongName = {
      ...mockUser,
      name: 'This is a very long name that should be truncated',
    };

    render(<UserDropdown user={userWithLongName} onLogout={mockOnLogout} />);

    // The truncate class is on the span inside the button, not the button itself
    const nameSpan = screen.getByText('This is a very long name that should be truncated');
    expect(nameSpan).toHaveClass('truncate');
    expect(nameSpan).toHaveClass('max-w-[120px]');
  });

  it('handles admin role display correctly', () => {
    const adminUser = {
      ...mockUser,
      role: 'ADMIN',
    };

    render(<UserDropdown user={adminUser} onLogout={mockOnLogout} />);

    fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

    expect(screen.getByText('admin')).toBeInTheDocument(); // role lowercase
  });
}); 