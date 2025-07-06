import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ResetPasswordPage from '../../../../src/app/reset-password/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    resetPassword: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue('valid-token');
  });

  test('renders reset password form', () => {
    render(<ResetPasswordPage />);
    
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<ResetPasswordPage />);
    
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('validates password length', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  test('validates password confirmation', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  test('clears validation errors when user starts typing', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const form = screen.getByRole('form');

    // Trigger validation error
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
    });
  });

  test('validates password on blur', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');

    // Fill password but leave confirm empty
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.blur(confirmPasswordInput);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  test('handles successful password reset', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resetPassword.mockResolvedValue({ success: true });

    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password reset successful! You can now log in.')).toBeInTheDocument();
    });

    // Should redirect to login after success
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    }, { timeout: 3000 });
  });

  test('handles password reset failure', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resetPassword.mockResolvedValue({ 
      success: false, 
      error: 'Invalid or expired token' 
    });

    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired token')).toBeInTheDocument();
    });
  });

  test('handles network error', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resetPassword.mockRejectedValue(new Error('Network error'));

    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resetPassword.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.submit(form);

    expect(screen.getByRole('button', { name: 'Resetting...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resetting...' })).toBeDisabled();
  });

  test('shows error for missing token', () => {
    mockSearchParams.get.mockReturnValue('');

    render(<ResetPasswordPage />);
    
    expect(screen.getByText('Missing or invalid reset token.')).toBeInTheDocument();
  });

  test('shows error for invalid token', () => {
    mockSearchParams.get.mockReturnValue('invalid_token');

    render(<ResetPasswordPage />);
    
    expect(screen.getByText('Missing or invalid reset token.')).toBeInTheDocument();
  });

  test('provides link to request new reset', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resetPassword.mockResolvedValue({ 
      success: false, 
      error: 'Invalid or expired token' 
    });

    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    const form = screen.getByRole('form');

    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Request a new password reset')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Request a new password reset' })).toHaveAttribute('href', '/forgot-password');
    });
  });
}); 