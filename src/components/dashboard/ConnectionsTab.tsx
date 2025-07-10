'use client';

import { useState } from 'react';
import { apiClient, ApiConnection } from '../../lib/api/client';
import CreateConnectionModal from './CreateConnectionModal';
import EditConnectionModal from './EditConnectionModal';

interface ConnectionsTabProps {
  connections: ApiConnection[];
  onConnectionCreated: () => void;
  onConnectionError: (error: string) => void;
}

export default function ConnectionsTab({ 
  connections, 
  onConnectionCreated, 
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'TESTING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'ERROR':
        return 'Error';
      case 'TESTING':
        return 'Testing';
      default:
        return status;
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
    setEditingConnection(null);
    onConnectionCreated(); // Refresh the list
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
        onConnectionCreated(); // Refresh the list
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
    const matchesSearch = connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || connection.authType === filterType;
    return matchesSearch && matchesFilter;
  });

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
              <li key={connection.id} data-testid="connection-card">
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
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}
                          >
                            {getStatusDisplayText(connection.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{connection.description}</p>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="mr-4">Type: {getAuthTypeLabel(connection.authType)}</span>
                          <span>Base URL: {connection.baseUrl}</span>
                        </div>
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
                            onClick={() => {/* TODO: Implement OAuth2 authorization */}}
                            className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                            disabled={isLoading}
                          >
                            {isLoading ? 'Authorizing...' : 'Authorize'}
                          </button>
                          <button
                            data-testid="refresh-token-btn"
                            onClick={() => {/* TODO: Implement token refresh */}}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50"
                            disabled={isLoading}
                          >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                          </button>
                        </>
                      )}
                      <button
                        data-testid="test-connection-list-btn"
                        onClick={() => {/* TODO: Implement test connection */}}
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
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleConnectionSuccess}
          onError={handleConnectionError}
        />
      )}

      {/* Edit Connection Modal */}
      {editingConnection && (
        <EditConnectionModal
          connection={editingConnection}
          onClose={() => setEditingConnection(null)}
          onSuccess={handleEditSuccess}
          onError={handleEditError}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete the connection "{deleteConfirmDialog.connectionName}"?
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
    </div>
  );
} 