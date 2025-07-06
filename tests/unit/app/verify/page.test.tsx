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
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('valid-token'),
    });

    render(<VerifyPage />);

    expect(screen.getByText('Verifying your email')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we verify your email address...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument(); // Loading spinner
  });

  it('should show error when no token is provided', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    expect(screen.getByText('No verification token provided')).toBeInTheDocument();
    expect(screen.getByText('The verification link may be invalid or expired.')).toBeInTheDocument();
  });

  it('should handle successful email verification with automatic sign-in', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockResolvedValue({
      success: true,
      data: { 
        message: 'Email verified successfully!',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER'
        }
      }
    });

    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Email verified successfully! Welcome to APIQ!')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
    
    // Test redirect after 2 seconds
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
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
      expect(screen.getByText('Email verification failed')).toBeInTheDocument();
    });
    
    expect(screen.getByText('The verification link may be invalid or expired.')).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.verifyEmail.mockRejectedValue(new Error('Network error'));

    mockSearchParams.get.mockReturnValue('valid-token');
    
    render(<VerifyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Email verification failed')).toBeInTheDocument();
    });
  });

  it('should show resend verification option', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });

    render(<VerifyPage />);

    expect(screen.getByText("Didn't receive the verification email?")).toBeInTheDocument();
    expect(screen.getAllByText('Resend verification email')).toHaveLength(2);
  });

  it('should handle resend verification click', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    
    render(<VerifyPage />);
    
    const resendButtons = screen.getAllByText('Resend verification email');
    const resendButton = resendButtons[0]; // Use the first one
    // Verify the link has the correct href
    expect(resendButton).toHaveAttribute('href', '/resend-verification');
  });

  it('should show navigation links', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    expect(screen.getByText('Back to sign in')).toBeInTheDocument();
    expect(screen.getByText('Create a new account')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<VerifyPage />);
    
    const loginLink = screen.getByText('Back to sign in');
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
      expect(screen.getByText('Email verified successfully! Welcome to APIQ!')).toBeInTheDocument();
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
      expect(screen.getByText('Email verified successfully! Welcome to APIQ!')).toBeInTheDocument();
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
      expect(screen.getByText('Email verification failed')).toBeInTheDocument();
    });
  });
}); 