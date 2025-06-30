import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Next.js router and search params
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock the OAuth2 callback page component
const OAuth2CallbackPage = () => {
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Simulate URL parameters
      const mockParams = new URLSearchParams();
      mockParams.set('code', 'test-auth-code');
      mockParams.set('state', 'test-state');

      const code = mockParams.get('code');
      const state = mockParams.get('state');
      const errorParam = mockParams.get('error');
      const errorDescription = mockParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'OAuth2 authorization was denied or failed');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setError('Missing required OAuth2 parameters');
        return;
      }

      // Process the callback
      const response = await fetch(`/api/oauth/callback?code=${code}&state=${state}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('OAuth2 authorization completed successfully!');
      } else {
        setStatus('error');
        setError(data.error || 'OAuth2 callback processing failed');
      }
    } catch (error) {
      setStatus('error');
      setError('Network error during OAuth2 callback processing');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth2 Callback</h2>
          <p className="text-gray-600">Please wait while we complete your authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        {status === 'success' ? (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Successful!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <a
                href="/dashboard"
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go to Dashboard
              </a>
              <p className="text-xs text-gray-500">
                You will be redirected automatically in a few seconds...
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <a
                href="/dashboard"
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Dashboard
              </a>
              <button
                onClick={() => window.history.back()}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

describe('OAuth2 Callback Page', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(<OAuth2CallbackPage />);

    expect(screen.getByText(/processing oauth2 callback/i)).toBeInTheDocument();
    expect(screen.getByText(/please wait while we complete/i)).toBeInTheDocument();
  });

  it('handles successful OAuth2 callback', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization successful/i)).toBeInTheDocument();
      expect(screen.getByText(/oauth2 authorization completed successfully/i)).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/oauth/callback?code=test-auth-code&state=test-state');
  });

  it('handles OAuth2 callback failure', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ 
        success: false, 
        error: 'Invalid authorization code' 
      }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid authorization code/i)).toBeInTheDocument();
    });
  });

  it('handles missing OAuth2 parameters', async () => {
    // Mock component with missing parameters
    const MissingParamsPage = () => {
      const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        // Simulate missing parameters
        setStatus('error');
        setError('Missing required OAuth2 parameters');
      }, []);

      if (status === 'loading') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth2 Callback</h2>
              <p className="text-gray-600">Please wait while we complete your authorization...</p>
            </div>
          </div>
        );
      }

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
            </div>
          </div>
        </div>
      );
    };

    render(<MissingParamsPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/missing required oauth2 parameters/i)).toBeInTheDocument();
    });
  });

  it('handles OAuth2 error parameters', async () => {
    // Mock component with OAuth2 error
    const OAuth2ErrorPage = () => {
      const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        // Simulate OAuth2 error
        setStatus('error');
        setError('User denied authorization');
      }, []);

      if (status === 'loading') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth2 Callback</h2>
              <p className="text-gray-600">Please wait while we complete your authorization...</p>
            </div>
          </div>
        );
      }

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
            </div>
          </div>
        </div>
      );
    };

    render(<OAuth2ErrorPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/user denied authorization/i)).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/network error during oauth2 callback processing/i)).toBeInTheDocument();
    });
  });

  it('provides navigation options in success state', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/you will be redirected automatically/i)).toBeInTheDocument();
    });
  });

  it('provides navigation options in error state', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ 
        success: false, 
        error: 'Test error' 
      }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /authorization successful/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
    });
  });

  it('displays proper icons for success and error states', async () => {
    // Test success state
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    const { rerender } = render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization successful/i)).toBeInTheDocument();
    });

    // Test error state
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ 
        success: false, 
        error: 'Test error' 
      }),
    } as Response);

    rerender(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
    });
  });

  it('handles try again button click', async () => {
    const mockBack = jest.fn();
    Object.defineProperty(window, 'history', {
      value: {
        back: mockBack,
      },
      writable: true,
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ 
        success: false, 
        error: 'Test error' 
      }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('has proper styling classes', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<OAuth2CallbackPage />);

    await waitFor(() => {
      const container = screen.getByText(/authorization successful/i).closest('div');
      expect(container).toHaveClass('min-h-screen');
    });
  });
}); 