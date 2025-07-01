import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OAuth2Manager from '../../../src/components/OAuth2Manager';

const mockConnection = {
  id: 'conn-1',
  name: 'Test API',
  baseUrl: 'https://api.example.com',
  authType: 'OAUTH2' as const,
  status: 'ACTIVE' as const,
  ingestionStatus: 'SUCCEEDED' as const,
  endpointCount: 5,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  authConfig: {
    provider: 'google',
    clientId: 'abc',
    clientSecret: 'def',
    redirectUri: 'https://localhost/callback',
    scope: 'profile email'
  }
};

describe('OAuth2Manager', () => {
  it('renders OAuth2 management UI', () => {
    render(<OAuth2Manager connection={mockConnection} />);
    expect(screen.getByText(/OAuth2 Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Authorize with google/i)).toBeInTheDocument();
    expect(screen.getByText(/Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
    expect(screen.getByText(/Client ID:/i)).toBeInTheDocument();
    expect(screen.getByText(/Redirect URI:/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope:/i)).toBeInTheDocument();
  });

  it('calls onError if config is incomplete', () => {
    const onError = jest.fn();
    const incompleteConnection = { ...mockConnection, authConfig: {} };
    render(<OAuth2Manager connection={incompleteConnection} onError={onError} />);
    const authorizeBtn = screen.getByRole('button', { name: /authorize with/i });
    fireEvent.click(authorizeBtn);
    expect(onError).toHaveBeenCalled();
  });

  it('shows warning if not an OAuth2 connection', () => {
    const nonOAuth2 = { ...mockConnection, authType: 'API_KEY' as const };
    render(<OAuth2Manager connection={nonOAuth2} />);
    expect(screen.getByText(/Not an OAuth2 Connection/i)).toBeInTheDocument();
  });

  it('renders refresh and get token buttons', () => {
    render(<OAuth2Manager connection={mockConnection} />);
    expect(screen.getByRole('button', { name: /refresh token/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get token/i })).toBeInTheDocument();
  });
}); 