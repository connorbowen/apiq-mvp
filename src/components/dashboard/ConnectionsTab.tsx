/**
 * ConnectionsTab Component
 * 
 * Provides comprehensive API connection management functionality.
 * Features:
 * - Connection creation, editing, and deletion
 * - OAuth2 authorization and token refresh
 * - Connection testing with response time tracking
 * - Secret management integration
 * - Search and filtering capabilities
 * - Mobile responsive design
 * 
 * Note: This component is now integrated within the SettingsTab as a section
 * as part of the UX simplification plan (Phase 2.1).
 * 
 * Usage:
 * <ConnectionsTab
 *   connections={connections}
 *   onConnectionCreated={handleConnectionCreated}
 *   onConnectionEdited={handleConnectionEdited}
 *   onConnectionDeleted={handleConnectionDeleted}
 *   onConnectionTested={handleConnectionTested}
 *   onConnectionError={handleConnectionError}
 * />
 */

'use client';

import { useState, useEffect, memo } from 'react';
import { apiClient, ApiConnection, Secret } from '../../lib/api/client';
import CreateConnectionModal from './CreateConnectionModal';
import EditConnectionModal from './EditConnectionModal';

interface ConnectionsTabProps {
  connections: ApiConnection[];
  onConnectionCreated: () => void;
  onConnectionEdited: () => void;
  onConnectionDeleted: () => void;
  onConnectionTested: () => void;
  onConnectionError: (error: string) => void;
}

function ConnectionsTab({ 
  connections, 
  onConnectionCreated, 
  onConnectionEdited, 
  onConnectionDeleted, 
  onConnectionTested,
  onConnectionError 
}: ConnectionsTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    show: boolean;
    connectionId: string;
    connectionName: string;
  }>({ show: false, connectionId: '', connectionName: '' });
  // Add state for test results and response times
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  // Add state for secrets per connection
  const [connectionSecrets, setConnectionSecrets] = useState<Record<string, Secret[]>>({});
  const [secretsLoading, setSecretsLoading] = useState<Record<string, boolean>>({});
  const [secretsError, setSecretsError] = useState<Record<string, string>>({});
  // Add state for secret management actions
  const [rotatingSecretId, setRotatingSecretId] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<Record<string, string>>({});
  const [rotateSuccess, setRotateSuccess] = useState<Record<string, string>>({});
  const [viewingSecret, setViewingSecret] = useState<Secret | null>(null);

  // Add debugging for connections prop
  console.info('[connections-tab] ConnectionsTab rendered with connections:', {
    count: connections.length,
    connections: connections.map(c => ({ id: c.id, name: c.name, authType: c.authType }))
  });

  // Add useEffect to monitor connections prop changes
  useEffect(() => {
    console.info('[connections-tab] Connections prop changed:', {
      count: connections.length,
      connections: connections.map(c => ({ id: c.id, name: c.name, authType: c.authType }))
    });
  }, [connections]);

  // Add debugging to see when component re-renders
  console.info('[connections-tab] ConnectionsTab re-rendered with connections:', {
    count: connections.length,
    connections: connections.map(c => ({ id: c.id, name: c.name, authType: c.authType }))
  });

  // Fetch secrets for all connections on mount or when connections change
  useEffect(() => {
    const fetchAllSecrets = async () => {
      const newSecrets: Record<string, Secret[]> = {};
      const newLoading: Record<string, boolean> = {};
      const newError: Record<string, string> = {};
      await Promise.all(
        connections.map(async (connection) => {
          newLoading[connection.id] = true;
          try {
            const response = await apiClient.getSecretsForConnection(connection.id);
            if (response.success && response.data) {
              newSecrets[connection.id] = response.data.secrets || [];
              newError[connection.id] = '';
            } else {
              newSecrets[connection.id] = [];
              newError[connection.id] = response.error || 'Failed to fetch secrets';
            }
          } catch (e) {
            newSecrets[connection.id] = [];
            newError[connection.id] = 'Failed to fetch secrets';
          } finally {
            newLoading[connection.id] = false;
          }
        })
      );
      setConnectionSecrets(newSecrets);
      setSecretsLoading(newLoading);
      setSecretsError(newError);
    };
    if (connections.length > 0) {
      fetchAllSecrets();
    }
  }, [connections]);

  const getStatusColor = (connection: ApiConnection) => {
    // For OAuth2 connections, use connectionStatus instead of status
    if (connection.authType === 'OAUTH2' && connection.connectionStatus) {
      switch (connection.connectionStatus) {
        case 'connected':
          return 'bg-green-100 text-green-800';
        case 'disconnected':
          return 'bg-yellow-100 text-yellow-800';
        case 'connecting':
          return 'bg-blue-100 text-blue-800';
        case 'error':
          return 'bg-red-100 text-red-800';
        case 'revoked':
          return 'bg-red-100 text-red-800';
        case 'draft':
          return 'bg-gray-100 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } else {
      // For non-OAuth2 connections, use the status field
      switch (connection.status) {
        case 'ACTIVE':
          return 'bg-green-100 text-green-800';
        case 'INACTIVE':
          return 'bg-red-100 text-red-800';
        case 'ERROR':
          return 'bg-red-100 text-red-800';
        case 'PENDING':
          return 'bg-yellow-100 text-yellow-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getStatusDisplayText = (connection: ApiConnection) => {
    // For OAuth2 connections, use connectionStatus instead of status
    if (connection.authType === 'OAUTH2' && connection.connectionStatus) {
      switch (connection.connectionStatus) {
        case 'connected':
          return 'Connected';
        case 'disconnected':
          return 'Disconnected';
        case 'connecting':
          return 'Connecting...';
        case 'error':
          return 'Error';
        case 'revoked':
          return 'Revoked';
        case 'draft':
          return 'Draft';
        default:
          return connection.connectionStatus;
      }
    } else {
      // For non-OAuth2 connections, use the status field
      switch (connection.status) {
        case 'ACTIVE':
          return 'Active';
        case 'INACTIVE':
          return 'Inactive';
        case 'ERROR':
          return 'Error';
        case 'PENDING':
          return 'Pending';
        default:
          return connection.status;
      }
    }
  };

  const getAuthTypeLabel = (authType: string) => {
    switch (authType) {
      case 'API_KEY':
        return 'API Key';
      case 'BEARER_TOKEN':
        return 'Bearer Token';
      case 'BASIC_AUTH':
        return 'Basic Auth';
      case 'OAUTH2':
        return 'OAuth2';
      default:
        return authType;
    }
  };

  const handleConnectionSuccess = () => {
    console.log('🔍 DEBUG: Connection success callback triggered');
    console.log('🔍 DEBUG: Current showCreateForm state:', showCreateForm);
    console.log('🔍 DEBUG: Closing modal and calling onConnectionCreated');
    setShowCreateForm(false);
    onConnectionCreated();
  };

  const handleConnectionError = (error: string) => {
    onConnectionError(error);
  };

  const handleEditClick = (connection: ApiConnection) => {
    setEditingConnection(connection);
  };

  const handleEditSuccess = () => {
    console.log('🔄 Edit success callback triggered, closing modal');
    setEditingConnection(null);
    onConnectionEdited(); // Call the new callback for edit
  };

  const handleEditError = (error: string) => {
    onConnectionError(error);
  };

  const handleDeleteClick = (connectionId: string, connectionName: string) => {
    setDeleteConfirmDialog({ show: true, connectionId, connectionName });
  };

  const handleDeleteConfirm = async (connectionId: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.deleteConnection(connectionId);
      if (response.success) {
        onConnectionDeleted(); // Call the new callback for delete
      } else {
        onConnectionError(response.error || 'Failed to delete connection');
      }
    } catch (error) {
      onConnectionError('Network error while deleting connection');
    } finally {
      setIsLoading(false);
      setDeleteConfirmDialog({ show: false, connectionId: '', connectionName: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmDialog({ show: false, connectionId: '', connectionName: '' });
  };

  const filteredConnections = connections.filter(connection => {
    console.info('[connections] Filtering connection:', {
      id: connection.id,
      name: connection.name,
      authType: connection.authType,
      searchTerm,
      filterType,
      matchesSearch: connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     connection.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      matchesFilter: filterType === 'all' || connection.authType === filterType
    });
    
    const matchesSearch = connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || connection.authType === filterType;
    const result = matchesSearch && matchesFilter;
    
    console.info('[connections] Connection filter result:', {
      name: connection.name,
      matchesSearch,
      matchesFilter,
      result
    });
    
    return result;
  });

  console.info('[connections] Total connections:', connections.length);
  console.info('[connections] Filtered connections:', filteredConnections.length);
  console.info('[connections] Search term:', searchTerm);
  console.info('[connections] Filter type:', filterType);

  // Helper to get secret health/rotation status
  const getSecretHealth = (secret: Secret) => {
    if (!secret.isActive) return 'Inactive';
    if (secret.expiresAt && new Date(secret.expiresAt) < new Date()) return 'Expired';
    if (secret.nextRotationAt && new Date(secret.nextRotationAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) return 'Expiring Soon';
    return 'Healthy';
  };

  // Helper to get secret-connection relationship
  const getSecretRelationship = (secret: Secret, connectionId: string) => {
    if (!secret.connectionId) return 'Shared';
    if (secret.connectionId === connectionId) return 'Unique';
    return 'Shared';
  };

  // Handler for rotating a secret
  const handleRotateSecret = async (secret: Secret, connectionId: string) => {
    setRotatingSecretId(secret.id);
    setRotateError(prev => ({ ...prev, [secret.id]: '' }));
    setRotateSuccess(prev => ({ ...prev, [secret.id]: '' }));
    try {
      const response = await apiClient.rotateSecret(secret.id);
      if (response.success && response.data) {
        setRotateSuccess(prev => ({ ...prev, [secret.id]: 'Rotated!' }));
        // Refresh secrets for this connection
        const secretsResp = await apiClient.getSecretsForConnection(connectionId);
        setConnectionSecrets(prev => ({ ...prev, [connectionId]: secretsResp.data?.secrets || [] }));
      } else {
        setRotateError(prev => ({ ...prev, [secret.id]: response.error || 'Failed to rotate secret' }));
      }
    } catch (e) {
      setRotateError(prev => ({ ...prev, [secret.id]: 'Failed to rotate secret' }));
    } finally {
      setRotatingSecretId(null);
      setTimeout(() => {
        setRotateSuccess(prev => ({ ...prev, [secret.id]: '' }));
        setRotateError(prev => ({ ...prev, [secret.id]: '' }));
      }, 2000);
    }
  };

  // Handler for viewing a secret (metadata only)
  const handleViewSecret = (secret: Secret) => {
    setViewingSecret(secret);
  };

  // Handler to close view modal
  const handleCloseViewSecret = () => {
    setViewingSecret(null);
  };

  return (
    <div data-testid="connections-management">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">API Connections</h2>
        <p className="text-gray-600">Manage your API integrations and connections</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search-input" className="sr-only">Search connections</label>
          <input
            id="search-input"
            data-testid="search-connections"
            type="text"
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="sm:w-48 min-w-[200px]">
          <label htmlFor="filter-select" className="sr-only">Filter by type</label>
          <select
            id="filter-select"
            data-testid="filter-dropdown"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="API_KEY">API Key</option>
            <option value="BEARER_TOKEN">Bearer Token</option>
            <option value="BASIC_AUTH">Basic Auth</option>
            <option value="OAUTH2">OAuth2</option>
          </select>
        </div>
        <button
          data-testid="primary-action create-connection-header-btn"
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
        >
          Add Connection
        </button>
      </div>

      {/* Connections List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredConnections.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No connections</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'No connections match your search criteria.'
                : 'Get started by creating your first API connection.'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <div className="mt-6">
                <button
                  data-testid="primary-action create-connection-empty-btn"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Connection
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredConnections.map((connection) => (
              <li key={connection.id} data-testid="connection-card" data-connection-id={connection.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{connection.name}</p>
                          <span 
                            data-testid="connection-status"
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connection)}`}
                          >
                            {getStatusDisplayText(connection)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{connection.description}</p>
                        {/* Secrets summary */}
                        <div className="mt-2">
                          <span className="font-semibold text-xs text-gray-700">Secrets:</span>
                          {secretsLoading[connection.id] ? (
                            <span className="ml-2 text-xs text-gray-400">Loading...</span>
                          ) : secretsError[connection.id] ? (
                            <span className="ml-2 text-xs text-red-500">{secretsError[connection.id]}</span>
                          ) : (connectionSecrets[connection.id] && connectionSecrets[connection.id].length > 0 ? (
                            <ul className="ml-2 inline">
                              {connectionSecrets[connection.id].map(secret => (
                                <li key={secret.id} className="inline-block mr-2">
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-mono">
                                    {secret.type}
                                  </span>
                                  <span className={`ml-1 text-xs ${getSecretHealth(secret) === 'Healthy' ? 'text-green-600' : getSecretHealth(secret) === 'Expiring Soon' ? 'text-yellow-600' : getSecretHealth(secret) === 'Expired' ? 'text-red-600' : 'text-gray-500'}`}>({getSecretHealth(secret)})</span>
                                  {secret.nextRotationAt && (
                                    <span className="ml-1 text-xs text-blue-500">rotates {new Date(secret.nextRotationAt).toLocaleDateString()}</span>
                                  )}
                                  {/* Secret-connection relationship badge */}
                                  <span className={`ml-1 text-xs ${getSecretRelationship(secret, connection.id) === 'Unique' ? 'text-indigo-600' : 'text-gray-500'}`}
                                        title={getSecretRelationship(secret, connection.id) === 'Unique' ? 'Unique to this connection' : 'Shared with other connections'}>
                                    {getSecretRelationship(secret, connection.id) === 'Unique' ? 'Unique' : 'Shared'}
                                  </span>
                                  {/* Secret management actions */}
                                  <button
                                    className="ml-2 text-xs text-blue-600 hover:underline focus:outline-none"
                                    onClick={() => handleViewSecret(secret)}
                                    title="View secret metadata"
                                  >
                                    View
                                  </button>
                                  <button
                                    className="ml-2 text-xs text-green-600 hover:underline focus:outline-none disabled:opacity-50"
                                    onClick={() => handleRotateSecret(secret, connection.id)}
                                    disabled={rotatingSecretId === secret.id}
                                    title="Rotate secret"
                                  >
                                    {rotatingSecretId === secret.id ? 'Rotating...' : 'Rotate'}
                                  </button>
                                  {rotateSuccess[secret.id] && (
                                    <span className="ml-1 text-xs text-green-600">{rotateSuccess[secret.id]}</span>
                                  )}
                                  {rotateError[secret.id] && (
                                    <span className="ml-1 text-xs text-red-600">{rotateError[secret.id]}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="ml-2 text-xs text-gray-400">No secrets linked</span>
                          ))}
                        </div>
                        {/* Performance metric */}
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="mr-4">Type: {getAuthTypeLabel(connection.authType)}</span>
                          <span>Base URL: {connection.baseUrl}</span>
                          {/* Response time UI */}
                          <span data-testid="response-time" className="ml-4">
                            {responseTimes[connection.id] !== undefined ? `Response: ${responseTimes[connection.id]}ms` : ''}
                          </span>
                        </div>
                        {/* Test result UI */}
                        {testResults[connection.id] && (
                          <div data-testid="test-result" className={`mt-2 text-sm ${testResults[connection.id].success ? 'text-green-700' : 'text-red-700'}`}>{testResults[connection.id].message}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        data-testid={`explore-api-${connection.id}`}
                        onClick={() => window.location.href = `/connections/${connection.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Explore
                      </button>
                      <button
                        data-testid={`connection-details-${connection.id}`}
                        onClick={() => window.location.href = `/connections/${connection.id}`}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        Details
                      </button>
                      {connection.authType === 'OAUTH2' && (
                        <>
                          <button
                            data-testid="authorize-oauth2-btn"
                            onClick={async () => {
                              try {
                                setIsLoading(true);
                                console.log('🔍 OAuth2 Authorization Debug - Starting flow');
                                
                                // Get OAuth2 configuration from connection
                                const authConfig = (connection as any).authConfig || {};
                                const provider = authConfig.provider || 'test';
                                const clientId = authConfig.clientId || 'test-client-id';
                                const clientSecret = authConfig.clientSecret || 'test-client-secret';
                                const redirectUri = authConfig.redirectUri || 'http://localhost:3000/api/connections/oauth2/callback';
                                const scope = authConfig.scope || 'read write';
                                
                                console.log('🔍 OAuth2 Authorization Debug - Config:', {
                                  connectionId: connection.id,
                                  provider,
                                  clientId: clientId ? '***' : undefined,
                                  redirectUri,
                                  scope
                                });
                                
                                // Use the API client to initiate OAuth2 flow (handles authentication)
                                const { apiClient } = await import('../../lib/api/client');
                                console.log('🔍 OAuth2 Authorization Debug - About to call initiateOAuth2Flow');
                                
                                let authUrl: string | undefined;
                                try {
                                  console.log('🔍 OAuth2 Authorization Debug - About to call initiateOAuth2Flow');
                                  
                                  // Add timeout to prevent hanging
                                  const timeoutPromise = new Promise<never>((_, reject) => {
                                    setTimeout(() => reject(new Error('initiateOAuth2Flow timeout after 10s')), 10000);
                                  });
                                  
                                  const authUrlPromise = apiClient.initiateOAuth2Flow(
                                    connection.id,
                                    provider,
                                    clientId,
                                    clientSecret,
                                    redirectUri,
                                    scope
                                  );
                                  
                                  authUrl = await Promise.race([authUrlPromise, timeoutPromise]);
                                  console.log('🔍 OAuth2 Authorization Debug - Got auth URL:', authUrl);
                                  console.log('🔍 OAuth2 Authorization Debug - authUrl type:', typeof authUrl);
                                  console.log('🔍 OAuth2 Authorization Debug - authUrl length:', authUrl?.length);
                                  
                                } catch (err) {
                                  console.error('❌ OAuth2 Authorization Debug - Error in initiateOAuth2Flow:', err);
                                  console.error('❌ OAuth2 Authorization Debug - Error message:', err instanceof Error ? err.message : String(err));
                                  console.error('❌ OAuth2 Authorization Debug - Error stack:', err instanceof Error ? err.stack : 'No stack trace');
                                  authUrl = undefined;
                                }
                                
                                // Fallback for test provider if API client fails
                                if (!authUrl && provider === 'test') {
                                  console.log('🔧 OAuth2 Authorization Debug - Using fallback URL for test provider');
                                  
                                  // Get the actual user ID from localStorage
                                  const userData = localStorage.getItem('user');
                                  let userId = 'test-user-id'; // fallback
                                  if (userData) {
                                    try {
                                      const user = JSON.parse(userData);
                                      userId = user.id;
                                    } catch (e) {
                                      console.error('Failed to parse user data:', e);
                                    }
                                  }
                                  
                                  // Create proper state like the backend does
                                  const state = btoa(JSON.stringify({
                                    userId: userId,
                                    apiConnectionId: connection.id,
                                    provider: 'test',
                                    timestamp: Date.now(),
                                    nonce: Math.random().toString(36).substring(2)
                                  }));
                                  
                                  authUrl = `/api/test-oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
                                }
                                
                                console.log('🔍 OAuth2 Authorization Debug - Final authUrl:', authUrl);
                                console.log('🔍 OAuth2 Authorization Debug - Navigating to:', authUrl || '/dashboard?tab=connections');
                                
                                // Navigate to the OAuth2 provider
                                window.location.href = authUrl || '/dashboard?tab=connections';
                              } catch (error) {
                                console.error('❌ OAuth2 Authorization Error (outer catch):', error);
                                onConnectionError('Failed to initiate OAuth2 authorization');
                                setIsLoading(false);
                              }
                            }}
                            className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                            disabled={isLoading}
                          >
                            {isLoading ? 'Authorizing...' : 'Authorize'}
                          </button>
                          <button
                            data-testid="refresh-token-btn"
                            onClick={async () => {
                              try {
                                setIsLoading(true);
                                // Get OAuth2 configuration from connection
                                const authConfig = (connection as any).authConfig || {};
                                const provider = authConfig.provider || 'test';
                                
                                // Call the OAuth2 refresh token endpoint
                                const response = await fetch(`/api/connections/oauth2/refresh`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  },
                                  body: JSON.stringify({
                                    apiConnectionId: connection.id,
                                    provider
                                  })
                                });
                                
                                if (response.ok) {
                                  onConnectionCreated(); // Refresh the list
                                } else {
                                  throw new Error('Failed to refresh token');
                                }
                              } catch (error) {
                                onConnectionError('Failed to refresh token');
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50"
                            disabled={isLoading}
                          >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                          </button>
                        </>
                      )}
                      <button
                        data-testid="primary-action test-connection-btn"
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            const start = Date.now();
                            
                            // Call the actual test connection API
                            const response = await fetch(`/api/connections/${connection.id}/test`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                              }
                            });
                            
                            const responseTime = Date.now() - start;
                            setResponseTimes(prev => ({ ...prev, [connection.id]: responseTime }));
                            
                            if (response.ok) {
                              const result = await response.json();
                              setTestResults(prev => ({
                                ...prev,
                                [connection.id]: { 
                                  success: true, 
                                  message: result.data?.message || 'Connection test successful' 
                                }
                              }));
                              onConnectionTested(); // Set global success message
                            } else {
                              const errorData = await response.json();
                              setTestResults(prev => ({
                                ...prev,
                                [connection.id]: { 
                                  success: false, 
                                  message: errorData.error || 'Connection test failed' 
                                }
                              }));
                              onConnectionError(errorData.error || 'Connection test failed');
                            }
                          } catch (error) {
                            console.error('Connection test error:', error);
                            setTestResults(prev => ({
                              ...prev,
                              [connection.id]: { 
                                success: false, 
                                message: 'Connection test failed' 
                              }
                            }));
                            onConnectionError('Connection test failed');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        data-testid="edit-connection-btn"
                        onClick={() => handleEditClick(connection)}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        data-testid="delete-connection-btn"
                        onClick={() => handleDeleteClick(connection.id, connection.name)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Connection Modal */}
      {showCreateForm && (
        <CreateConnectionModal
          onClose={() => {
            console.log('🔄 Create modal onClose called, setting showCreateForm to false');
            setShowCreateForm(false);
          }}
          onSuccess={() => {
            console.log('🔄 Connection success callback triggered, closing modal');
            console.log('🔄 Current showCreateForm state before setting to false:', showCreateForm);
            setShowCreateForm(false);
            console.log('🔄 Called onConnectionCreated callback');
            onConnectionCreated();
          }}
          onError={handleConnectionError}
        />
      )}

      {/* Edit Connection Modal */}
      {editingConnection && (
        <EditConnectionModal
          connection={editingConnection}
          onClose={() => {
            console.log('🔄 Edit modal onClose called, setting editingConnection to null');
            setEditingConnection(null);
          }}
          onSuccess={() => {
            console.log('🔄 Edit success callback triggered, closing modal');
            console.log('🔄 Current editingConnection state before setting to null:', editingConnection?.id);
            setEditingConnection(null);
            console.log('🔄 Called onConnectionEdited callback');
            onConnectionEdited(); // Call the new callback for edit
          }}
          onError={handleEditError}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete the connection &quot;{deleteConfirmDialog.connectionName}&quot;?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  data-testid="cancel-delete-btn"
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  data-testid="primary-action confirm-delete-btn"
                  onClick={() => handleDeleteConfirm(deleteConfirmDialog.connectionId)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secret view modal */}
      {viewingSecret && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[70]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Secret Metadata</h3>
              <div className="text-sm text-gray-700 mb-4 text-left">
                <div><strong>Name:</strong> {viewingSecret.name}</div>
                <div><strong>Type:</strong> {viewingSecret.type}</div>
                <div><strong>Description:</strong> {viewingSecret.description || '—'}</div>
                <div><strong>Created:</strong> {new Date(viewingSecret.createdAt).toLocaleString()}</div>
                <div><strong>Updated:</strong> {new Date(viewingSecret.updatedAt).toLocaleString()}</div>
                <div><strong>Rotation Enabled:</strong> {viewingSecret.rotationEnabled ? 'Yes' : 'No'}</div>
                <div><strong>Next Rotation:</strong> {viewingSecret.nextRotationAt ? new Date(viewingSecret.nextRotationAt).toLocaleString() : '—'}</div>
                <div><strong>Expires At:</strong> {viewingSecret.expiresAt ? new Date(viewingSecret.expiresAt).toLocaleString() : '—'}</div>
                <div><strong>Relationship:</strong> {getSecretRelationship(viewingSecret, viewingSecret.connectionId || '')}</div>
              </div>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleCloseViewSecret}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ConnectionsTab); 