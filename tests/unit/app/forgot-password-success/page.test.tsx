import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import ForgotPasswordSuccessPage from '../../../../src/app/forgot-password-success/page';

// Mock Next.js search params
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

const mockSearchParams = {
  get: jest.fn(),
};

describe('ForgotPasswordSuccessPage', () => {
  beforeEach(() => {
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    jest.clearAllMocks();
  });

  it('should render success message with user email', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    expect(screen.getByText('Reset Link Sent!')).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
    expect(screen.getByText('We\'ve sent a password reset link to:')).toBeInTheDocument();
  });

  it('should render security note', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    expect(screen.getByText('Security Note')).toBeInTheDocument();
    expect(screen.getByText('For security reasons, we don\'t reveal whether an email address exists in our system. If you don\'t receive an email, check your spam folder or try again.')).toBeInTheDocument();
  });

  it('should render step-by-step instructions', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    expect(screen.getByText('What happens next?')).toBeInTheDocument();
    expect(screen.getByText(/Check your email/)).toBeInTheDocument();
    expect(screen.getByText(/Click the reset link/)).toBeInTheDocument();
    expect(screen.getByText(/Sign in/)).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
    expect(screen.getByText('Try Different Email')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    const signinLink = screen.getByText('Back to Sign In');
    const emailLink = screen.getByText('Try Different Email');
    
    expect(signinLink.closest('a')).toHaveAttribute('href', '/login');
    expect(emailLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('should handle missing email parameter gracefully', () => {
    mockSearchParams.get.mockReturnValue(null);
    
    render(<ForgotPasswordSuccessPage />);
    
    expect(screen.getByText('Reset Link Sent!')).toBeInTheDocument();
    expect(screen.getByText('We\'ve sent a password reset link to:')).toBeInTheDocument();
  });

  it('should render success icon', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    // Check for the success icon (email icon)
    const successIcon = document.querySelector('svg');
    expect(successIcon).toBeInTheDocument();
  });

  it('should render all required elements', () => {
    mockSearchParams.get.mockReturnValue('test@example.com');
    
    render(<ForgotPasswordSuccessPage />);
    
    // Check for all main sections
    expect(screen.getByText('Reset Link Sent!')).toBeInTheDocument();
    expect(screen.getByText('Security Note')).toBeInTheDocument();
    expect(screen.getByText('What happens next?')).toBeInTheDocument();
    expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
    expect(screen.getByText('Try Different Email')).toBeInTheDocument();
  });
}); 