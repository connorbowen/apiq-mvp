import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PasswordChangeForm from '../../../../src/components/dashboard/PasswordChangeForm';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('PasswordChangeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders password change form correctly', () => {
    render(<PasswordChangeForm />);

    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Change your account password.')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('shows form when change password button is clicked', () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByText('Password Requirements')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
      expect(screen.getByText('New password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your new password')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('validates password complexity', async () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } }); // No uppercase
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByText('Password must contain at least one lowercase letter, one uppercase letter, and one number')).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPass123' } });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('handles successful password change', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Password changed successfully',
      }),
    } as Response);

    const onPasswordChanged = jest.fn();
    render(<PasswordChangeForm onPasswordChanged={onPasswordChanged} />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'currentpass',
          newPassword: 'NewPass123',
        }),
      });
    });

    await waitFor(() => {
      expect(onPasswordChanged).toHaveBeenCalled();
    });
  });

  it('handles password change error', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Current password is incorrect' }),
    } as Response);

    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('cancels form when cancel button is clicked', () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('shows loading state during form submission', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });

    fireEvent.click(screen.getByText('Change Password'));

    expect(screen.getByText('Changing Password...')).toBeInTheDocument();
  });

  it('displays password requirements correctly', () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));

    expect(screen.getByText('At least 8 characters long')).toBeInTheDocument();
    expect(screen.getByText('Contains at least one uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains at least one lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains at least one number')).toBeInTheDocument();
  });

  it('validates password maximum length', async () => {
    render(<PasswordChangeForm />);

    fireEvent.click(screen.getByText('Change Password'));
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'a'.repeat(129) } }); // Too long
    fireEvent.change(confirmPasswordInput, { target: { value: 'a'.repeat(129) } });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByText('Password must be less than 128 characters')).toBeInTheDocument();
    });
  });
}); 