import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ForgotPasswordPage from '../../../../src/app/forgot-password/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    requestPasswordReset: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  test('renders forgot password form', () => {
    render(<ForgotPasswordPage />);
    
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(screen.getByText('Enter your email to receive a password reset link.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
  });

  test('validates email format', async () => {
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('validates required email field', async () => {
    render(<ForgotPasswordPage />);
    
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  test('clears validation errors when user starts typing', async () => {
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    // Trigger validation error
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(emailInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  test('validates email on blur', async () => {
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('handles successful password reset request with proper loading state management', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.requestPasswordReset.mockResolvedValue({ success: true });

    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    // Verify loading state is active during API call
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();

    // Wait for navigation to occur (which requires loading state to be reset)
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/forgot-password-success?email=test%40example.com');
    });
  });

  test('handles password reset request failure', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.requestPasswordReset.mockResolvedValue({ 
      success: false, 
      error: 'User not found' 
    });

    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  test('handles network error', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.requestPasswordReset.mockRejectedValue(new Error('Network error'));

    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.requestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });

  test('handles various email formats correctly', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.requestPasswordReset.mockRejectedValue(new Error('Network error'));

    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      '123@numbers.com'
    ];

    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'test@',
      'test.example.com',
      'test@.com'
    ];

    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const form = screen.getByRole('form');

    // Test valid emails
    for (const email of validEmails) {
      fireEvent.change(emailInput, { target: { value: email } });
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
      
      // Clear error for next test
      fireEvent.change(emailInput, { target: { value: '' } });
    }

    // Test invalid emails
    for (const email of invalidEmails) {
      fireEvent.change(emailInput, { target: { value: email } });
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
      
      // Clear error for next test
      fireEvent.change(emailInput, { target: { value: '' } });
    }
  });

  test('validates on Enter key press for empty field', async () => {
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');

    fireEvent.keyDown(emailInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  test('has proper accessibility attributes', () => {
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');

    expect(submitButton).toHaveAttribute('type', 'submit');
  });
}); 