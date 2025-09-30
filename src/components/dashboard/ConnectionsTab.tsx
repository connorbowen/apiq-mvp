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

import { useState, useEffect, memo, useRef } from 'react';
import { apiClient, ApiConnection, Secret } from '../../lib/api/client';
import CreateConnectionModal from './CreateConnectionModal';
import EditConnectionModal from './EditConnectionModal';
import { useUser } from '../../contexts/UserContext';

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
  const { user } = useUser();
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
  
  // Connection health testing state
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<Record<string, {
    status: 'healthy' | 'unhealthy' | 'testing' | 'unknown';
    lastChecked: Date | null;
    responseTime: number | null;
    error: string | null;
  }>>({});
  
  // Ref to prevent duplicate API calls for the same connection set
  const lastFetchedConnectionIds = useRef<string>('');

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
    
    // Only fetch if we have connections and haven't fetched recently
    if (connections.length > 0) {
      // Use a ref to prevent multiple simultaneous fetches
      const connectionIds = connections.map(c => c.id).sort().join(',');
      if (connectionIds !== lastFetchedConnectionIds.current) {
        lastFetchedConnectionIds.current = connectionIds;
        fetchAllSecrets();
      }
    }
  }, [connections.length]); // Only depend on connections.length, not the entire array

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
    console.log('🔍 Edit button clicked for connection:', connection.id, connection.name);
    console.log('🔍 Setting editingConnection to:', connection);
    setEditingConnection(connection);
    console.log('🔍 editingConnection state should now be set');
  };

  // Test individual connection
  const testConnection = async (connectionId: string) => {
    setTestingConnection(connectionId);
    setConnectionHealth(prev => ({
      ...prev,
      [connectionId]: {
        ...prev[connectionId],
        status: 'testing',
        lastChecked: new Date(),
        responseTime: null,
        error: null
      }
    }));

    try {
      const startTime = Date.now();
      const response = await apiClient.testConnection(connectionId);
      const responseTime = Date.now() - startTime;

      if (response.success) {
        setConnectionHealth(prev => ({
          ...prev,
          [connectionId]: {
            status: 'healthy',
            lastChecked: new Date(),
            responseTime,
            error: null
          }
        }));
        onConnectionTested();
      } else {
        setConnectionHealth(prev => ({
          ...prev,
          [connectionId]: {
            status: 'unhealthy',
            lastChecked: new Date(),
            responseTime,
            error: response.error || 'Connection test failed'
          }
        }));
        onConnectionError(response.error || 'Connection test failed');
      }
    } catch (error) {
      setConnectionHealth(prev => ({
        ...prev,
        [connectionId]: {
          status: 'unhealthy',
          lastChecked: new Date(),
          responseTime: null,
          error: error instanceof Error ? error.message : 'Connection test failed'
        }
      }));
      onConnectionError('Connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  // Test all connections
  const testAllConnections = async () => {
    const connectionIds = connections.map(c => c.id);
    await Promise.all(connectionIds.map(id => testConnection(id)));
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
    <div data-testid="connections-management" className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Manage your API integrations and connections</h2>
      </div>

      {/* Connection Health Overview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Connection Health</h3>
          <button
            data-testid="test-all-connections-btn"
            onClick={() => testAllConnections()}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Test All Connections
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(connectionHealth).filter(h => h.status === 'healthy').length}
            </div>
            <div className="text-sm text-gray-600">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {Object.values(connectionHealth).filter(h => h.status === 'unhealthy').length}
            </div>
            <div className="text-sm text-gray-600">Unhealthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {Object.values(connectionHealth).filter(h => h.status === 'unknown').length}
            </div>
            <div className="text-sm text-gray-600">Unknown</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="search-input" className="sr-only">Search connections</label>
          <input
            id="search-input"
            data-testid="search-connections"
            type="text"
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
          />
        </div>
        <div className="sm:w-48 min-w-[200px]">
          <label htmlFor="filter-select" className="sr-only">Filter by type</label>
          <select
            id="filter-select"
            data-testid="filter-dropdown"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
          >
            <option value="all">All Types</option>
            <option value="API_KEY">API Key</option>
            <option value="BEARER_TOKEN">Bearer Token</option>
            <option value="BASIC_AUTH">Basic Auth</option>
            <option value="OAUTH2">OAuth2</option>
          </select>
        </div>
        <div className="sm:w-48">
          <button
            data-testid="primary-action create-connection-header-btn"
            onClick={() => setShowCreateForm(true)}
            className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
          >
            Add Connection
          </button>
        </div>
      </div>

      {/* Connections List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md flex-1 min-h-0">
        {filteredConnections.length === 0 ? (
          <div className="text-center py-16 px-8">
            <svg
              className="mx-auto h-20 w-20 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="mt-6 text-2xl font-semibold text-gray-900">No connections</h3>
            <p className="mt-3 text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
              {searchTerm || filterType !== 'all' 
                ? 'No connections match your search criteria.'
                : 'Get started by creating your first API connection to integrate with external services.'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <div className="mt-8">
                <button
                  data-testid="primary-action create-connection-empty-btn"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="-ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Connection
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 overflow-y-auto max-h-full connections-list overflow-container">
            {filteredConnections.map((connection) => (
              <li key={connection.id} data-testid={`connection-card-${connection.id}`} data-connection-id={connection.id}>
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
                          <p className="text-sm font-medium text-gray-900" data-testid="connection-name">{connection.name}</p>
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
                      {/* Primary Actions - Connection Management Focus */}
                      <button
                        data-testid={`test-connection-${connection.id}`}
                        onClick={() => testConnection(connection.id)}
                        disabled={testingConnection === connection.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 min-h-[44px] disabled:opacity-50"
                      >
                        {testingConnection === connection.id ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        data-testid="edit-connection-btn"
                        onClick={() => handleEditClick(connection)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                      >
                        Edit
                      </button>
                      <button
                        data-testid={`delete-connection-${connection.id}`}
                        onClick={() => handleDeleteClick(connection.id, connection.name)}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Connection Health Details */}
                {connectionHealth[connection.id] && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                    <div data-testid="connection-health-details" className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Health</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              connectionHealth[connection.id].status === 'healthy' ? 'bg-green-500' :
                              connectionHealth[connection.id].status === 'unhealthy' ? 'bg-red-500' :
                              connectionHealth[connection.id].status === 'testing' ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`} />
                            <span className="text-sm font-medium capitalize">
                              {connectionHealth[connection.id].status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Response Time</h4>
                          <div className="text-sm">
                            {connectionHealth[connection.id]?.responseTime ? 
                              `${connectionHealth[connection.id].responseTime}ms` : 
                              'Not tested'
                            }
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Last Checked</h4>
                          <div className="text-sm">
                            {(() => {
                              const health = connectionHealth[connection.id];
                              return health?.lastChecked ? health.lastChecked.toLocaleString() : 'Never';
                            })()}
                          </div>
                        </div>
                        
                        {connectionHealth[connection.id]?.error && (
                          <div className="bg-white p-4 rounded-lg border border-red-200">
                            <h4 className="text-sm font-medium text-red-700 mb-2">Error</h4>
                            <div className="text-sm text-red-600">
                              {connectionHealth[connection.id].error}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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