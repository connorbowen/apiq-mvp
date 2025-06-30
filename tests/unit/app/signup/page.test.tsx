import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import SignupPage from '../../../../src/app/signup/page';

describe('SignupPage', () => {
  it('renders email, password, and confirm password fields', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders OAuth2/SSO signup buttons', () => {
    render(<SignupPage />);
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with github/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with slack/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with okta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with azure ad/i })).toBeInTheDocument();
  });

  it('allows user to type email and passwords', () => {
    render(<SignupPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    expect(emailInput).toHaveValue('user@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(confirmInput).toHaveValue('password123');
  });

  it('OAuth2/SSO signup buttons are clickable', () => {
    render(<SignupPage />);
    const googleBtn = screen.getByRole('button', { name: /sign up with google/i });
    fireEvent.click(googleBtn);
    // You can add more assertions here if you mock the handler
  });
}); 