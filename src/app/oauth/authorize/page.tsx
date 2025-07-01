'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../lib/api/client';

export default function OAuth2AuthorizePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAuthorization = useCallback(async () => {
    try {
      if (!searchParams) {
        setError('Unable to read URL parameters');
        setIsLoading(false);
        return;
      }
      const apiConnectionId = searchParams.get('apiConnectionId');
      const providerName = searchParams.get('provider');
      const clientId = searchParams.get('clientId');
      const clientSecret = searchParams.get('clientSecret');
      const redirectUri = searchParams.get('redirectUri');
      const scope = searchParams.get('scope');
      if (!apiConnectionId || !providerName || !clientId || !clientSecret || !redirectUri) {
        setError('Missing required OAuth2 parameters');
        setIsLoading(false);
        return;
      }
      const connectionResponse = await apiClient.getConnection(apiConnectionId);
      if (!connectionResponse.success || !connectionResponse.data) {
        setError('Failed to load connection details');
        setIsLoading(false);
        return;
      }
      setConnection(connectionResponse.data);
      const providersResponse = await apiClient.getOAuth2Providers();
      if (!providersResponse.success || !providersResponse.data) {
        setError('Failed to load OAuth2 providers');
        setIsLoading(false);
        return;
      }
      const providerConfig = providersResponse.data.providers.find((p: any) => p.name === providerName);
      if (!providerConfig) {
        setError(`OAuth2 provider ${providerName} is not supported`);
        setIsLoading(false);
        return;
      }
      setProvider(providerConfig);
      const authUrl = await apiClient.initiateOAuth2Flow(
        apiConnectionId,
        providerName,
        clientId,
        clientSecret,
        redirectUri,
        scope || undefined
      );
      window.location.href = authUrl;
    } catch (error) {
      setError('Failed to initiate OAuth2 authorization');
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    handleAuthorization();
  }, [handleAuthorization]);

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
            <Link
              href="/dashboard"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 