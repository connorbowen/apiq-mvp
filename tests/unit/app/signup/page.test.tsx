import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SignupPage from '../../../../src/app/signup/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    register: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

describe('SignupPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('should render signup form with all required fields', () => {
    render(<SignupPage />);
    
    expect(screen.getByText('Create your APIQ account')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\s*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render OAuth2 signup buttons', () => {
    render(<SignupPage />);
    
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });

  it('should show validation errors for invalid email', async () => {
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const form = document.querySelector('form');
    
    if (!form) {
      throw new Error('Form element not found');
    }
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);
    
    // Wait for the email validation error message to appear
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should show validation errors for weak password', async () => {
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password\s*\*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      // Look for the error message in the error container specifically
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveTextContent(/password must be at least 8 characters/i);
    });
  });

  it('should show validation errors for missing required fields', async () => {
    render(<SignupPage />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('name is required')).toBeInTheDocument();
    });
  });

  it('should handle successful form submission and redirect to success page', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.register.mockResolvedValue({
      success: true,
      data: { message: 'Registration successful' }
    });

    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password\s*\*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(apiClient.register).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'Password123'
      );
    });
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/signup-success?email=test%40example.com');
    });
  });

  it('should handle registration failure', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.register.mockResolvedValue({
      success: false,
      error: 'User with this email already exists'
    });

    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password\s*\*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/a user with this email already exists/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.register.mockRejectedValue(new Error('Network error'));

    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password\s*\*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/network error. please check your connection/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const { apiClient } = require('../../../../src/lib/api/client');
    apiClient.register.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password\s*\*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should show login link', () => {
    render(<SignupPage />);
    
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('should show back to home link', () => {
    render(<SignupPage />);
    
    expect(screen.getByText(/back to home/i)).toBeInTheDocument();
  });
}); 