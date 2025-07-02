'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiConnection, CreateConnectionRequest } from '../../lib/api/client';
import ChatInterface from '../../components/ChatInterface';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'connections'>('chat');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    const loadUser = async () => {
      try {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success) {
          setUser(userResponse.data);
        } else {
          setErrorMessage('Failed to load user data');
          router.push('/login');
        }
      } catch (error) {
        setErrorMessage('Failed to load user data');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, [router]);

  const loadConnections = useCallback(async () => {
    try {
      const response = await apiClient.getConnections();
      if (response.success && response.data) {
        setConnections(response.data.connections || []);
      } else {
        setErrorMessage(response.error || 'Failed to load connections');
      }
    } catch (error) {
      setErrorMessage('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOAuth2Callback = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauth2Success = urlParams.get('oauth2_success');
    if (oauth2Success === 'true') {
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');
      const userData = urlParams.get('user');
      if (accessToken && refreshToken && userData) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', userData);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('oauth2_success');
        newUrl.searchParams.delete('accessToken');
        newUrl.searchParams.delete('refreshToken');
        newUrl.searchParams.delete('user');
        window.history.replaceState({}, '', newUrl.toString());
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadConnections();
    handleOAuth2Callback();
  }, [loadConnections, handleOAuth2Callback]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleWorkflowGenerated = (workflow: any, steps: any[]) => {
    // Handle workflow generation - could save to database or show success message
    console.log('Workflow generated:', workflow, steps);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <main role="main" className="min-h-screen bg-gray-50">
      <header role="banner" className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            {user && <span className="text-gray-700">Welcome, {user.name}</span>}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <section className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button
              data-testid="tab-chat"
              className={`px-3 py-2 font-medium text-sm rounded-md ${activeTab === 'chat' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              data-testid="tab-connections"
              className={`px-3 py-2 font-medium text-sm rounded-md ${activeTab === 'connections' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('connections')}
            >
              Connections
            </button>
          </nav>
        </div>
        {errorMessage && <div className="mb-4 text-red-600">{errorMessage}</div>}
        {activeTab === 'chat' ? (
          <ChatInterface onWorkflowGenerated={handleWorkflowGenerated} />
        ) : (
          <ConnectionsTab
            connections={connections}
            onConnectionCreated={() => {
              loadConnections();
            }}
            showCreateForm={showCreateForm}
            setShowCreateForm={setShowCreateForm}
          />
        )}
      </section>
    </main>
  );
}

// Connections Tab Component
function ConnectionsTab({ 
  connections, 
  onConnectionCreated, 
  showCreateForm, 
  setShowCreateForm 
}: { 
  connections: ApiConnection[];
  onConnectionCreated: () => void;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
}) {
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      case 'NONE':
        return 'None';
      default:
        return authType;
    }
  };

  const handleConnectionSuccess = () => {
    setSuccessMessage('Connection created successfully');
    onConnectionCreated();
    setShowCreateForm(false);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleConnectionError = (error: string) => {
    setErrorMessage(error);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">API Connections</h2>
        <button
          data-testid="create-connection-btn"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add Connection
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div data-testid="success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div data-testid="error-message" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No API Connections</h3>
          <p className="text-gray-500 mb-4">
            Connect your first API to start creating workflows with AI.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Your First API
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((connection) => (
            <div
              key={connection.id}
              data-testid="connection-card"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{connection.name}</h3>
                  <p className="text-sm text-gray-500">{connection.description}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                  {connection.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Base URL:</span> {connection.baseUrl}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Auth:</span> {getAuthTypeLabel(connection.authType)}
                </div>
                {connection.endpointCount > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Endpoints:</span> {connection.endpointCount}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  data-testid={`explore-api-${connection.id}`}
                  onClick={() => {/* TODO: Navigate to API explorer */}}
                  className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Explore API
                </button>
                <button
                  data-testid={`connection-details-${connection.id}`}
                  onClick={() => {/* TODO: Show connection details */}}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  Details
                </button>
                <button
                  data-testid={`test-connection-${connection.id}`}
                  onClick={() => {/* TODO: Test connection */}}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Test
                </button>
                {connection.authType === 'OAUTH2' && (
                  <button
                    data-testid={`refresh-token-${connection.id}`}
                    onClick={() => {/* TODO: Refresh OAuth2 token */}}
                    className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-700"
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <CreateConnectionModal 
          onClose={() => setShowCreateForm(false)} 
          onSuccess={handleConnectionSuccess} 
          onError={handleConnectionError} 
        />
      )}
    </div>
  );
}

// Create Connection Modal Component
function CreateConnectionModal({ onClose, onSuccess, onError }: { onClose: () => void; onSuccess: () => void; onError: (error: string) => void }) {
  const [formData, setFormData] = useState<CreateConnectionRequest>({
    name: '',
    description: '',
    baseUrl: '',
    authType: 'API_KEY',
    authConfig: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOpenApiImport, setShowOpenApiImport] = useState(false);
  const [showOAuth2Setup, setShowOAuth2Setup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiClient.createConnection(formData);
      if (response.success) {
        onSuccess();
      } else {
        console.error('Failed to create connection:', response.error);
        onError(response.error || 'Failed to create connection');
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      onError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If showing OpenAPI import, render that form
  if (showOpenApiImport) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import from OpenAPI</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">OpenAPI URL</label>
                <input
                  type="url"
                  name="openApiUrl"
                  data-testid="openapi-url-input"
                  required
                  placeholder="https://api.example.com/swagger.json"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  data-testid="connection-name-input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {!formData.name && (
                  <div data-testid="name-error" className="mt-1 text-sm text-red-600">
                    Name is required
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  name="description"
                  data-testid="connection-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOpenApiImport(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Import API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // If showing OAuth2 setup, render that form
  if (showOAuth2Setup) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">OAuth2 Setup</h3>
            <div className="space-y-4">
              <div data-testid="oauth2-config">
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    data-testid="github-provider-btn"
                    onClick={() => setFormData({ ...formData, authType: 'OAUTH2', authConfig: { ...formData.authConfig, provider: 'github' } })}
                    className="p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
                  >
                    <div className="font-medium">GitHub</div>
                    <div className="text-sm text-gray-500">Connect to GitHub API</div>
                  </button>
                  <button
                    type="button"
                    data-testid="google-provider-btn"
                    onClick={() => setFormData({ ...formData, authType: 'OAUTH2', authConfig: { ...formData.authConfig, provider: 'google' } })}
                    className="p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
                  >
                    <div className="font-medium">Google</div>
                    <div className="text-sm text-gray-500">Connect to Google APIs</div>
                  </button>
                  <button
                    type="button"
                    data-testid="slack-provider-btn"
                    onClick={() => setFormData({ ...formData, authType: 'OAUTH2', authConfig: { ...formData.authConfig, provider: 'slack' } })}
                    className="p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
                  >
                    <div className="font-medium">Slack</div>
                    <div className="text-sm text-gray-500">Connect to Slack API</div>
                  </button>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOAuth2Setup(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add API Connection</h3>
          
          {/* Connection Type Selection */}
          <div className="mb-4 space-y-2">
            <button
              type="button"
              data-testid="import-openapi-btn"
              onClick={() => setShowOpenApiImport(true)}
              className="w-full p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
            >
              <div className="font-medium">Import from OpenAPI/Swagger</div>
              <div className="text-sm text-gray-500">Import API from OpenAPI specification</div>
            </button>
            <button
              type="button"
              data-testid="oauth2-auth-btn"
              onClick={() => setShowOAuth2Setup(true)}
              className="w-full p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
            >
              <div className="font-medium">OAuth2 Authentication</div>
              <div className="text-sm text-gray-500">Connect using OAuth2 providers</div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                data-testid="connection-name-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {!formData.name && (
                <div data-testid="name-error" className="mt-1 text-sm text-red-600">
                  Name is required
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                name="description"
                data-testid="connection-description-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="url"
                name="baseUrl"
                data-testid="connection-baseurl-input"
                required
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {!formData.baseUrl && (
                <div data-testid="baseUrl-error" className="mt-1 text-sm text-red-600">
                  Base URL is required
                </div>
              )}
              {formData.baseUrl && !formData.baseUrl.match(/^https?:\/\/.+/) && (
                <div data-testid="baseUrl-error" className="mt-1 text-sm text-red-600">
                  Invalid URL format
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Authentication Type</label>
              <select
                name="authType"
                data-testid="connection-authtype-select"
                value={formData.authType}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="API_KEY">API Key</option>
                <option value="BEARER_TOKEN">Bearer Token</option>
                <option value="BASIC_AUTH">Basic Auth</option>
                <option value="OAUTH2">OAuth2</option>
                <option value="NONE">None</option>
              </select>
            </div>

            {/* Conditional fields based on auth type */}
            {formData.authType === 'API_KEY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  name="apiKey"
                  data-testid="connection-apikey-input"
                  required
                  value={formData.authConfig?.apiKey || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    authConfig: { ...formData.authConfig, apiKey: e.target.value }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {formData.authType === 'BEARER_TOKEN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Bearer Token</label>
                <input
                  type="password"
                  name="bearerToken"
                  data-testid="connection-bearertoken-input"
                  required
                  value={formData.authConfig?.bearerToken || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    authConfig: { ...formData.authConfig, bearerToken: e.target.value }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {formData.authType === 'BASIC_AUTH' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    name="username"
                    data-testid="connection-username-input"
                    required
                    value={formData.authConfig?.username || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, username: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    data-testid="connection-password-input"
                    required
                    value={formData.authConfig?.password || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, password: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {formData.authType === 'OAUTH2' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select
                    name="provider"
                    data-testid="connection-provider-select"
                    value={formData.authConfig?.provider || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, provider: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Provider</option>
                    <option value="github">GitHub</option>
                    <option value="google">Google</option>
                    <option value="slack">Slack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <input
                    type="text"
                    name="clientId"
                    data-testid="connection-clientid-input"
                    required
                    value={formData.authConfig?.clientId || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, clientId: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formData.authType === 'OAUTH2' && !formData.authConfig?.clientId && (
                    <div data-testid="clientId-error" className="mt-1 text-sm text-red-600">
                      Client ID is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <input
                    type="password"
                    name="clientSecret"
                    data-testid="connection-clientsecret-input"
                    required
                    value={formData.authConfig?.clientSecret || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, clientSecret: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formData.authType === 'OAUTH2' && !formData.authConfig?.clientSecret && (
                    <div data-testid="clientSecret-error" className="mt-1 text-sm text-red-600">
                      Client Secret is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Redirect URI</label>
                  <input
                    type="url"
                    name="redirectUri"
                    data-testid="connection-redirecturi-input"
                    required
                    value={formData.authConfig?.redirectUri || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, redirectUri: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="http://localhost:3000/api/oauth/callback"
                  />
                  {formData.authType === 'OAUTH2' && !formData.authConfig?.redirectUri && (
                    <div data-testid="redirectUri-error" className="mt-1 text-sm text-red-600">
                      Redirect URI is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scope</label>
                  <input
                    type="text"
                    name="scope"
                    data-testid="connection-scope-input"
                    value={formData.authConfig?.scope || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, scope: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="repo user"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                data-testid="cancel-connection-btn"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-connection-btn"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
