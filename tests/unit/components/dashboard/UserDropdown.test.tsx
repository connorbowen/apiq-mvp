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

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  firstName: 'Admin',
  lastName: 'User',
};

const mockOnLogout = jest.fn();
const mockOnHelp = jest.fn();

describe('UserDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
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

    it('truncates long names appropriately', () => {
      const userWithLongName = {
        ...mockUser,
        firstName: undefined,
        lastName: undefined,
        name: 'This is a very long name that should be truncated',
      };

      render(<UserDropdown user={userWithLongName} onLogout={mockOnLogout} />);

      const nameSpan = screen.getByText('This is a very long name that should be truncated');
      expect(nameSpan).toHaveClass('truncate');
      expect(nameSpan).toHaveClass('max-w-[120px]');
    });
  });

  describe('Dropdown Functionality', () => {
    it('opens dropdown when toggle is clicked', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Help')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('displays user information in dropdown', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument(); // role lowercase
    });

    it('closes dropdown when clicking outside', async () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      expect(screen.getByText('Profile')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown when pressing Escape key', async () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      expect(screen.getByText('Profile')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to profile when Profile is clicked', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      fireEvent.click(screen.getByTestId('user-dropdown-profile'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=settings&section=account');
    });

    it('calls onLogout when Sign Out is clicked', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      fireEvent.click(screen.getByTestId('user-dropdown-logout'));

      expect(mockOnLogout).toHaveBeenCalled();
    });

    it('calls onHelp when Help is clicked', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} onHelp={mockOnHelp} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      fireEvent.click(screen.getByTestId('user-dropdown-help'));

      expect(mockOnHelp).toHaveBeenCalled();
    });

    it('shows alert when Help is clicked without onHelp prop', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      fireEvent.click(screen.getByTestId('user-dropdown-help'));

      expect(alertSpy).toHaveBeenCalledWith('Support ticket modal would open here.');
      
      alertSpy.mockRestore();
    });
  });

  describe('Admin Access', () => {
    it('shows admin functions for admin users', () => {
      render(<UserDropdown user={mockAdminUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
      expect(screen.getByTestId('user-dropdown-admin')).toBeInTheDocument();
      expect(screen.getByTestId('user-dropdown-audit')).toBeInTheDocument();
    });

    it('does not show admin functions for regular users', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-dropdown-admin')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-dropdown-audit')).not.toBeInTheDocument();
    });

    it('navigates to admin panel when Admin is clicked', () => {
      render(<UserDropdown user={mockAdminUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      fireEvent.click(screen.getByTestId('user-dropdown-admin'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=admin');
    });

    it('navigates to audit logs when Audit Logs is clicked', () => {
      render(<UserDropdown user={mockAdminUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));
      fireEvent.click(screen.getByTestId('user-dropdown-audit'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=audit');
    });

    it('shows admin role correctly in dropdown', () => {
      render(<UserDropdown user={mockAdminUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      expect(screen.getByText('admin')).toBeInTheDocument(); // role lowercase
    });

    it('supports SUPER_ADMIN role', () => {
      const superAdminUser = {
        ...mockAdminUser,
        role: 'SUPER_ADMIN',
      };

      render(<UserDropdown user={superAdminUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility attributes', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      const toggle = screen.getByTestId('user-dropdown-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveAttribute('aria-haspopup', 'true');

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper ARIA roles for dropdown menu', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
      expect(menu).toHaveAttribute('aria-labelledby', 'user-dropdown-toggle');
    });

    it('has proper ARIA roles for menu items', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3); // Profile, Help, Sign Out for regular users
    });

    it('has proper ARIA roles for admin menu items', () => {
      render(<UserDropdown user={mockAdminUser} onLogout={mockOnLogout} />);

      fireEvent.click(screen.getByTestId('user-dropdown-toggle'));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(5); // Profile, Admin, Audit Logs, Help, Sign Out
    });
  });

  describe('Mobile Optimization', () => {
    it('has minimum touch target size', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      const toggle = screen.getByTestId('user-dropdown-toggle');
      expect(toggle).toHaveClass('min-h-[44px]');
    });

    it('has proper focus states', () => {
      render(<UserDropdown user={mockUser} onLogout={mockOnLogout} />);

      const toggle = screen.getByTestId('user-dropdown-toggle');
      expect(toggle).toHaveClass('focus:outline-none');
      expect(toggle).toHaveClass('focus:ring-2');
      expect(toggle).toHaveClass('focus:ring-offset-2');
      expect(toggle).toHaveClass('focus:ring-indigo-500');
    });
  });
}); 