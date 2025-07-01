import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import SignupSuccessPage from '../../../../src/app/signup-success/page';

// Mock Next.js search params
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock the API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    resendVerification: jest.fn(),
  },
}));

const mockSearchParams = {
  get: jest.fn(),
};

describe('SignupSuccessPage', () => {
  beforeEach(() => {
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    jest.clearAllMocks();
  });

  it('should render success message with user email', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
    expect(screen.getByText('Welcome to APIQ! We\'ve sent a verification email to:')).toBeInTheDocument();
  });

  it('should render step-by-step instructions', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    // Check for numbered steps
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Check for step content
    expect(screen.getByText(/Check your email/)).toBeInTheDocument();
    expect(screen.getByText(/Click the verification link/)).toBeInTheDocument();
    expect(screen.getByText(/You'll be automatically signed in/)).toBeInTheDocument();
  });

  it('should render resend verification button', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('should handle successful resend verification', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resendVerification.mockResolvedValue({
      success: true,
      data: { message: 'Verification email sent successfully' }
    });

    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    await waitFor(() => {
      expect(apiClient.resendVerification).toHaveBeenCalledWith('test@example.com');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Verification email sent! Please check your inbox.')).toBeInTheDocument();
    });
  });

  it('should handle resend verification failure', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resendVerification.mockResolvedValue({
      success: false,
      error: 'Failed to send verification email'
    });

    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send verification email')).toBeInTheDocument();
    });
  });

  it('should handle resend verification when no email provided', async () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<SignupSuccessPage />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email address not found. Please try signing up again.')).toBeInTheDocument();
    });
  });

  it('should handle network errors during resend', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resendVerification.mockRejectedValue(new Error('Network error'));

    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('should show loading state during resend', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resendVerification.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
    expect(resendButton).toBeDisabled();
  });

  it('should render navigation links', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    expect(screen.getByText('Go to Sign In')).toBeInTheDocument();
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    const signinLink = screen.getByText('Go to Sign In');
    const homeLink = screen.getByText('Back to Home');
    
    expect(signinLink.closest('a')).toHaveAttribute('href', '/login');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should handle missing email parameter gracefully', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<SignupSuccessPage />);
    
    expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
    expect(screen.getByText('Welcome to APIQ! We\'ve sent a verification email to:')).toBeInTheDocument();
  });

  it('should clear resend message when resending again', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.resendVerification
      .mockResolvedValueOnce({
        success: true,
        data: { message: 'First email sent' }
      })
      .mockResolvedValueOnce({
        success: true,
        data: { message: 'Second email sent' }
      });

    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<SignupSuccessPage />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    
    // First resend
    fireEvent.click(resendButton);
    await waitFor(() => {
      expect(screen.getByText('Verification email sent! Please check your inbox.')).toBeInTheDocument();
    });
    
    // Second resend - should clear previous message and show new one
    fireEvent.click(resendButton);
    await waitFor(() => {
      expect(screen.getByText('Verification email sent! Please check your inbox.')).toBeInTheDocument();
    });
  });
}); 