'use client';

import { useState, useEffect } from 'react';
import { apiClient, OAuth2Provider, ApiConnection } from '../lib/api/client';

interface OAuth2ManagerProps {
  connection: ApiConnection;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function OAuth2Manager({ connection, onSuccess, onError }: OAuth2ManagerProps) {
  const [providers, setProviders] = useState<OAuth2Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await apiClient.getOAuth2Providers();
      if (response.success && response.data) {
        setProviders(response.data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load OAuth2 providers:', error);
    }
  };

  const initiateOAuth2Flow = async (provider: string) => {
    setIsAuthorizing(true);
    setError('');
    setSuccess('');

    try {
      // Get the OAuth2 configuration from the connection
      const authConfig = connection.authConfig;
      if (!authConfig || !authConfig.clientId || !authConfig.clientSecret) {
        const errorMsg = 'OAuth2 configuration is incomplete. Please update the connection settings.';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Use the API client to generate the authorization URL
      const authUrl = await apiClient.initiateOAuth2Flow(
        connection.id,
        provider,
        authConfig.clientId,
        authConfig.clientSecret,
        authConfig.redirectUri || `${window.location.origin}/api/oauth/callback`,
        authConfig.scope
      );

      // Redirect to the authorization endpoint
      window.location.href = authUrl;
    } catch (error) {
      const errorMsg = 'Failed to initiate OAuth2 flow';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsAuthorizing(false);
    }
  };

  const refreshToken = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.refreshOAuth2Token(
        connection.id,
        connection.authConfig?.provider || 'github'
      );

      if (response.success) {
        const successMsg = 'OAuth2 token refreshed successfully';
        setSuccess(successMsg);
        onSuccess?.();
      } else {
        const errorMsg = response.error || 'Failed to refresh token';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Network error';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.getOAuth2Token(connection.id);

      if (response.success && response.data) {
        const successMsg = 'OAuth2 access token retrieved successfully';
        setSuccess(successMsg);
        onSuccess?.();
        // You could display the token or use it for API calls
        console.log('Access token retrieved:', response.data.accessToken);
      } else {
        const errorMsg = response.error || 'Failed to get access token';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Network error';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
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

  if (connection.authType !== 'OAUTH2') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Not an OAuth2 Connection</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>This connection does not use OAuth2 authentication.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">OAuth2 Management</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {connection.authConfig?.provider || 'Unknown Provider'}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* OAuth2 Configuration */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration</h4>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Provider:</span>
              <span className="ml-2 text-gray-600">{connection.authConfig?.provider || 'Not set'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Client ID:</span>
              <span className="ml-2 text-gray-600">
                {connection.authConfig?.clientId ? '✓ Configured' : '✗ Not configured'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Redirect URI:</span>
              <span className="ml-2 text-gray-600">{connection.authConfig?.redirectUri || 'Not set'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Scope:</span>
              <span className="ml-2 text-gray-600">{connection.authConfig?.scope || 'Default'}</span>
            </div>
          </div>
        </div>

        {/* OAuth2 Actions */}
        <div className="space-y-3">
          <button
            onClick={() => initiateOAuth2Flow(connection.authConfig?.provider || 'google')}
            disabled={isAuthorizing}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isAuthorizing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authorizing...
              </>
            ) : (
              <>
                {getProviderIcon(connection.authConfig?.provider || 'google')}
                <span className="ml-2">Authorize with {connection.authConfig?.provider || 'Provider'}</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={refreshToken}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Token
                </>
              )}
            </button>

            <button
              onClick={getAccessToken}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Get Token
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 