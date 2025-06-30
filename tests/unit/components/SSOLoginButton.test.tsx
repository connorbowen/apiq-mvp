import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

// Mock the SSO login button component
const SSOLoginButton = ({ provider, onLogin }: { provider: string; onLogin: (provider: string) => void }) => (
  <button onClick={() => onLogin(provider)} className="sso-login-btn">
    Sign in with {provider}
  </button>
);

describe('SSOLoginButton', () => {
  it('renders SSO login button with provider name', () => {
    const onLogin = jest.fn();
    render(<SSOLoginButton provider="Google" onLogin={onLogin} />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  it('calls onLogin when clicked', () => {
    const onLogin = jest.fn();
    render(<SSOLoginButton provider="GitHub" onLogin={onLogin} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onLogin).toHaveBeenCalledWith('GitHub');
  });

  it('renders different providers correctly', () => {
    const onLogin = jest.fn();
    const { rerender } = render(<SSOLoginButton provider="Okta" onLogin={onLogin} />);
    expect(screen.getByText(/sign in with okta/i)).toBeInTheDocument();
    
    rerender(<SSOLoginButton provider="Azure AD" onLogin={onLogin} />);
    expect(screen.getByText(/sign in with azure ad/i)).toBeInTheDocument();
  });
}); 