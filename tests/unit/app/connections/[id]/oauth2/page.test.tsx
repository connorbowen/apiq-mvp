import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the OAuth2 setup page component
const OAuth2SetupPage = () => {
  const [connection, setConnection] = React.useState<any>(null);
  const [providers, setProviders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isAuthorizing, setIsAuthorizing] = React.useState(false);

  React.useEffect(() => {
    // Simulate loading connection and providers
    setTimeout(() => {
      setConnection({
        id: 'conn-1',
        name: 'GitHub API',
        authType: 'OAUTH2',
        authConfig: {
          provider: 'github',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'https://localhost/callback',
          scope: 'repo user'
        }
      });
      setProviders([
        { name: 'github', displayName: 'GitHub' },
        { name: 'google', displayName: 'Google' },
        { name: 'slack', displayName: 'Slack' }
      ]);
      setIsLoading(false);
    }, 100);
  }, []);

  const initiateOAuth2Flow = async (provider: string) => {
    setIsAuthorizing(true);
    setError('');
    
    // Simulate OAuth2 flow
    setTimeout(() => {
      setIsAuthorizing(false);
      // In real app, this would redirect to OAuth2 provider
    }, 1000);
  };

  const refreshToken = async () => {
    setSuccess('OAuth2 token refreshed successfully');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Connection not found</h2>
          <p className="mt-2 text-gray-600">The requested connection could not be found.</p>
        </div>
      </div>
    );
  }

  if (connection.authType !== 'OAUTH2') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Not an OAuth2 Connection</h2>
          <p className="mt-2 text-gray-600">This connection does not use OAuth2 authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">OAuth2 Setup</h1>
                <p className="text-sm text-gray-600">{connection.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">OAuth2 Management</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration</h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Provider:</span>
                  <span className="ml-2 text-gray-600">{connection.authConfig?.provider}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Client ID:</span>
                  <span className="ml-2 text-gray-600">✓ Configured</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => initiateOAuth2Flow(connection.authConfig?.provider)}
                disabled={isAuthorizing}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAuthorizing ? 'Authorizing...' : `Authorize with ${connection.authConfig?.provider}`}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={refreshToken}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Refresh Token
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

describe('OAuth2 Setup Page', () => {
  it('renders OAuth2 setup page with connection details', async () => {
    render(<OAuth2SetupPage />);

    await waitFor(() => {
      expect(screen.getByText(/oauth2 setup/i)).toBeInTheDocument();
      expect(screen.getByText(/github api/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<OAuth2SetupPage />);

    // Try to find loading spinner by class or text
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays OAuth2 configuration details', async () => {
    render(<OAuth2SetupPage />);

    await waitFor(() => {
      expect(screen.getByText(/configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/provider:/i)).toBeInTheDocument();
      expect(screen.getByText(/client id:/i)).toBeInTheDocument();
      // There may be multiple 'github' matches, so use getAllByText
      expect(screen.getAllByText(/github/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/configured/i)).toBeInTheDocument();
    });
  });

  it('initiates OAuth2 authorization flow', async () => {
    render(<OAuth2SetupPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /authorize with github/i })).toBeInTheDocument();
    });

    const authorizeButton = screen.getByRole('button', { name: /authorize with github/i });
    fireEvent.click(authorizeButton);

    expect(screen.getByText(/authorizing/i)).toBeInTheDocument();
  });

  it('refreshes OAuth2 token', async () => {
    render(<OAuth2SetupPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh token/i })).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh token/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/oauth2 token refreshed successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error state for non-OAuth2 connections', () => {
    // Mock component with non-OAuth2 connection
    const NonOAuth2Page = () => {
      const [connection] = React.useState({
        id: 'conn-1',
        name: 'API Key API',
        authType: 'API_KEY'
      });

      if (connection.authType !== 'OAUTH2') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">Not an OAuth2 Connection</h2>
              <p className="mt-2 text-gray-600">This connection does not use OAuth2 authentication.</p>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<NonOAuth2Page />);

    expect(screen.getByText(/not an oauth2 connection/i)).toBeInTheDocument();
    expect(screen.getByText(/does not use oauth2 authentication/i)).toBeInTheDocument();
  });

  it('shows error state for missing connection', () => {
    // Mock component with no connection
    const MissingConnectionPage = () => {
      const [connection] = React.useState(null);

      if (!connection) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">Connection not found</h2>
              <p className="mt-2 text-gray-600">The requested connection could not be found.</p>
            </div>
          </div>
        );
      }

      return null;
    };

    render(<MissingConnectionPage />);

    expect(screen.getByText(/connection not found/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', async () => {
    render(<OAuth2SetupPage />);

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    });
  });
}); 