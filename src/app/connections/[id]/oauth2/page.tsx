'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient, OAuth2Provider, ApiConnection } from '../../../../lib/api/client';

export default function OAuth2SetupPage() {
  const [connection, setConnection] = useState<ApiConnection | null>(null);
  const [providers, setProviders] = useState<OAuth2Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const connectionId = params?.id as string;

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const loadConnection = useCallback(async () => {
    try {
      const response = await apiClient.getConnection(connectionId);
      if (response.success && response.data) {
        setConnection(response.data);
      } else {
        setError(response.error || 'Failed to load connection');
      }
    } catch (error) {
      setError('Network error');
    }
  }, [connectionId]);

  const loadProviders = useCallback(async () => {
    try {
      const response = await apiClient.getOAuth2Providers();
      if (response.success && response.data) {
        setProviders(response.data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load OAuth2 providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    loadConnection();
    loadProviders();
  }, [connectionId, checkAuth, loadConnection, loadProviders]);

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const successParam = urlParams.get('success');
    const detailsParam = urlParams.get('details');
    const providerParam = urlParams.get('provider');

    if (errorParam) {
      let errorMessage = 'An error occurred during OAuth2 authorization';
      
      switch (errorParam) {
        case 'oauth2_provider_error':
          errorMessage = `OAuth2 provider error: ${detailsParam || 'Unknown error'}`;
          break;
        case 'missing_code_or_state':
          errorMessage = 'Missing authorization code or state parameter';
          break;
        case 'token_exchange_failed':
          errorMessage = `Token exchange failed: ${detailsParam || 'Unknown error'}`;
          break;
        case 'oauth2_failed':
          errorMessage = `OAuth2 authorization failed: ${detailsParam || 'Unknown error'}`;
          break;
        case 'oauth2_callback_error':
          errorMessage = 'OAuth2 callback processing error';
          break;
        default:
          errorMessage = detailsParam || errorMessage;
      }
      
      setError(errorMessage);
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('details');
      window.history.replaceState({}, '', newUrl.toString());
    }

    if (successParam === 'oauth2_authorized') {
      const providerName = providerParam || 'OAuth2 provider';
      setSuccess(`Successfully authorized with ${providerName}! Your connection is now ready to use.`);
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('success');
      newUrl.searchParams.delete('provider');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  const initiateOAuth2Flow = async (provider: string) => {
    setIsAuthorizing(true);
    setError('');
    setSuccess('');

    if (!connection) return;

    try {
      // Get the OAuth2 configuration from the connection
      const authConfig = connection.authConfig;
      if (!authConfig || !authConfig.clientId || !authConfig.clientSecret) {
        setError('OAuth2 configuration is incomplete. Please update the connection settings.');
        return;
      }

      // Use the API client to generate the authorization URL
      const authUrl = await apiClient.initiateOAuth2Flow(
        connectionId,
        provider,
        authConfig.clientId,
        authConfig.clientSecret,
        authConfig.redirectUri || `${window.location.origin}/api/oauth/callback`,
        authConfig.scope
      );

      // Redirect to the authorization endpoint
      window.location.href = authUrl;
    } catch (error) {
      setError('Failed to initiate OAuth2 flow');
      setIsAuthorizing(false);
    }
  };

  const refreshToken = async () => {
    if (!connection) return;

    try {
      const response = await apiClient.refreshOAuth2Token(
        connectionId,
        connection.authConfig?.provider || 'google'
      );

      if (response.success) {
        setSuccess('OAuth2 token refreshed successfully');
      } else {
        setError(response.error || 'Failed to refresh token');
      }
    } catch (error) {
      setError('Network error');
    }
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'google':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
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
          <Link href="/dashboard" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            Back to Dashboard
          </Link>
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
          <Link href="/dashboard" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500 mr-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">OAuth2 Setup</h1>
                <p className="text-sm text-gray-600">{connection.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Status Messages */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{success}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Connection Info */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Connection Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{connection.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Base URL</label>
                <p className="mt-1 text-sm text-gray-900">{connection.baseUrl}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  connection.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  connection.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {connection.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Endpoints</label>
                <p className="mt-1 text-sm text-gray-900">{connection.endpointCount}</p>
              </div>
            </div>
          </div>

          {/* OAuth2 Configuration */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">OAuth2 Configuration</h2>
            {connection.authConfig ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <p className="mt-1 text-sm text-gray-900">{connection.authConfig.provider || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {connection.authConfig.clientId ? 
                      `${connection.authConfig.clientId.substring(0, 8)}...` : 
                      'Not configured'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Redirect URI</label>
                  <p className="mt-1 text-sm text-gray-900">{connection.authConfig.redirectUri || 'Not configured'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scope</label>
                  <p className="mt-1 text-sm text-gray-900">{connection.authConfig.scope || 'Default scope'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No OAuth2 configuration found.</p>
            )}
          </div>

          {/* OAuth2 Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">OAuth2 Actions</h2>
            
            {/* Available Providers */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Available Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {providers.map((provider) => (
                  <div key={provider.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="flex-shrink-0 mr-3">
                        {getProviderIcon(provider.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{provider.displayName}</h4>
                        <p className="text-xs text-gray-500">{provider.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => initiateOAuth2Flow(provider.name)}
                      disabled={isAuthorizing}
                      className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isAuthorizing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Authorizing...
                        </>
                      ) : (
                        `Authorize with ${provider.displayName}`
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Management */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Token Management</h3>
              <div className="flex space-x-4">
                <button
                  onClick={refreshToken}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Token
                </button>
                <Link
                  href={`/connections/${connectionId}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Connection Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
