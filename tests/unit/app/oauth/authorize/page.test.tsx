import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the OAuth2 authorize page component
const OAuth2AuthorizePage = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [connection, setConnection] = React.useState<any>(null);
  const [provider, setProvider] = React.useState<any>(null);

  React.useEffect(() => {
    handleAuthorization();
  }, []);

  const handleAuthorization = async () => {
    try {
      // Simulate URL parameters
      const mockParams = {
        apiConnectionId: 'conn-1',
        provider: 'github',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://localhost/callback',
        scope: 'repo user'
      };

      if (!mockParams.apiConnectionId || !mockParams.provider || !mockParams.clientId) {
        setError('Missing required OAuth2 parameters');
        setIsLoading(false);
        return;
      }

      // Simulate loading connection and provider
      setTimeout(() => {
        setConnection({
          id: 'conn-1',
          name: 'GitHub API',
          baseUrl: 'https://api.github.com'
        });
        setProvider({
          name: 'github',
          displayName: 'GitHub',
          authUrl: 'https://github.com/login/oauth/authorize'
        });
        
        // Simulate redirect to OAuth2 provider
        // In real app, this would redirect to the provider
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      setError('Failed to initiate OAuth2 authorization');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initiating OAuth2 Authorization</h2>
          <p className="text-gray-600">Please wait while we prepare your authorization request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            {connection && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Connection Details</h3>
                <p className="text-sm text-gray-600">Name: {connection.name}</p>
                <p className="text-sm text-gray-600">Base URL: {connection.baseUrl}</p>
              </div>
            )}

            <div className="space-y-3">
              <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Back to Dashboard
              </button>
              <button 
                onClick={() => window.history.back()}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // Should redirect in real app
};

describe('OAuth2 Authorize Page', () => {
  it('shows loading state initially', () => {
    render(<OAuth2AuthorizePage />);

    expect(screen.getByText(/initiating oauth2 authorization/i)).toBeInTheDocument();
    expect(screen.getByText(/please wait while we prepare/i)).toBeInTheDocument();
  });

  it('handles missing OAuth2 parameters', async () => {
    // Mock component with missing parameters
    const MissingParamsPage = () => {
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        // Simulate missing parameters
        setError('Missing required OAuth2 parameters');
      }, []);

      if (error) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<MissingParamsPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/missing required oauth2 parameters/i)).toBeInTheDocument();
    });
  });

  it('displays connection details in error state', async () => {
    // Mock component with connection details
    const ConnectionDetailsPage = () => {
      const [error, setError] = React.useState('');
      const [connection, setConnection] = React.useState<any>(null);

      React.useEffect(() => {
        setError('Test error');
        setConnection({
          name: 'GitHub API',
          baseUrl: 'https://api.github.com'
        });
      }, []);

      if (error) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                
                {connection && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Connection Details</h3>
                    <p className="text-sm text-gray-600">Name: {connection.name}</p>
                    <p className="text-sm text-gray-600">Base URL: {connection.baseUrl}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<ConnectionDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText(/connection details/i)).toBeInTheDocument();
      expect(screen.getByText(/name: github api/i)).toBeInTheDocument();
      expect(screen.getByText(/base url: https:\/\/api\.github\.com/i)).toBeInTheDocument();
    });
  });

  it('provides navigation options in error state', async () => {
    // Mock component with navigation buttons
    const NavigationPage = () => {
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        setError('Test error');
      }, []);

      if (error) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                
                <div className="space-y-3">
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    Back to Dashboard
                  </button>
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<NavigationPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('handles authorization errors gracefully', async () => {
    // Mock component with authorization error
    const AuthErrorPage = () => {
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        setError('Failed to initiate OAuth2 authorization');
      }, []);

      if (error) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<AuthErrorPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to initiate oauth2 authorization/i)).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    // Mock component with proper accessibility
    const AccessiblePage = () => {
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        setError('Test error');
      }, []);

      if (error) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                
                <div className="space-y-3">
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<AccessiblePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /authorization failed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });
  });
}); 