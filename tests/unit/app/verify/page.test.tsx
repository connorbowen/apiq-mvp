import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import VerifyPage from '../../../../src/app/verify/page';

// Mock Next.js router and search params
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock the API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    verifyEmail: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
};

describe('VerifyPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state when verifying email', () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    expect(screen.getByText('Verifying your email')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we verify your email address...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should show error when no token is provided', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    expect(screen.getByText('No verification token provided')).toBeInTheDocument();
    expect(screen.getByText('The verification link may be invalid or expired.')).toBeInTheDocument();
  });

  it('should handle successful email verification', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: true,
      data: { message: 'Email verified successfully!' }
    });

    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Email verified successfully!')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Redirecting to login page...')).toBeInTheDocument();
    
    // Test redirect after 3 seconds
    jest.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('should handle verification failure', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: false,
      error: 'Invalid verification token'
    });

    mockSearchParams.get.mockReturnValue('invalid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid verification token')).toBeInTheDocument();
    });
    
    expect(screen.getByText('The verification link may be invalid or expired.')).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockRejectedValue(new Error('Network error'));

    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('should show resend verification option', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    expect(screen.getByText("Didn't receive the verification email?")).toBeInTheDocument();
    expect(screen.getByText('Resend verification email')).toBeInTheDocument();
  });

  it('should handle resend verification click', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);
    
    expect(screen.getByText('Please use the resend verification link from your email or contact support.')).toBeInTheDocument();
  });

  it('should show navigation links', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    expect(screen.getByText('Back to login')).toBeInTheDocument();
    expect(screen.getByText('Create a new account')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    const loginLink = screen.getByText('Back to login');
    const signupLink = screen.getByText('Create a new account');
    
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
  });

  it('should show success message with default text when no message provided', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: true,
      data: {}
    });

    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Email verified successfully!')).toBeInTheDocument();
    });
  });

  it('should show error message with default text when no error provided', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: false,
      error: null
    });

    mockSearchParams.get.mockReturnValue('invalid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Email verification failed')).toBeInTheDocument();
    });
  });

  it('should handle verification with custom success message', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: true,
      data: { message: 'Custom success message' }
    });

    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Custom success message')).toBeInTheDocument();
    });
  });

  it('should handle verification with custom error message', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: false,
      error: 'Custom error message'
    });

    mockSearchParams.get.mockReturnValue('invalid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });
}); 