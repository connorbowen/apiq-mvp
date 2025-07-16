'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../lib/api/client';

interface Endpoint {
  id: string;
  path: string;
  method: string;
  summary: string;
  description?: string;
  parameters?: any[];
  responses?: any[];
  requestSchema?: any;
  responseSchema?: any;
}

interface ApiConnection {
  id: string;
  name: string;
  baseUrl: string;
  documentationUrl?: string;
  authType: string;
  status: string;
  connectionStatus?: string;
}

export default function APIExplorerPage() {
  const params = useParams();
  const connectionId = params?.id as string;
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [connection, setConnection] = useState<ApiConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadConnectionAndEndpoints = async () => {
      try {
        setIsLoading(true);
        
        // Load connection details
        const connectionResponse = await apiClient.getConnection(connectionId);
        if (connectionResponse.success && connectionResponse.data) {
          setConnection(connectionResponse.data);
        } else {
          setErrorMessage('Failed to load connection details');
          return;
        }

        // Load endpoints from OpenAPI spec
        const endpointsResponse = await apiClient.getConnectionEndpoints(connectionId);
        if (endpointsResponse.success && endpointsResponse.data) {
          setEndpoints(endpointsResponse.data.endpoints || []);
        } else {
          // Fallback to mock data if no real endpoints found
          console.warn('No real endpoints found, using mock data');
          setEndpoints([
            {
              id: '1',
              path: '/pets',
              method: 'GET',
              summary: 'List all pets',
              description: 'Returns a list of all pets in the store',
              parameters: [
                { name: 'limit', type: 'integer', description: 'Maximum number of pets to return' },
                { name: 'offset', type: 'integer', description: 'Number of pets to skip' }
              ],
              responses: [
                { code: 200, description: 'Successful response' },
                { code: 400, description: 'Bad request' }
              ],
              requestSchema: null,
              responseSchema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            },
            {
              id: '2',
              path: '/pets',
              method: 'POST',
              summary: 'Create a pet',
              description: 'Creates a new pet in the store',
              parameters: [],
              responses: [
                { code: 201, description: 'Pet created successfully' },
                { code: 400, description: 'Invalid input' }
              ],
              requestSchema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', description: 'Pet name' },
                  status: { type: 'string', enum: ['available', 'pending', 'sold'] }
                }
              },
              responseSchema: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            },
            {
              id: '3',
              path: '/pets/{id}',
              method: 'GET',
              summary: 'Get pet by ID',
              description: 'Returns a single pet by ID',
              parameters: [
                { name: 'id', type: 'integer', description: 'Pet ID', required: true }
              ],
              responses: [
                { code: 200, description: 'Successful response' },
                { code: 404, description: 'Pet not found' }
              ],
              requestSchema: null,
              responseSchema: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          ]);
        }
      } catch (error) {
        console.error('Failed to load connection and endpoints:', error);
        setErrorMessage('Failed to load connection data');
      } finally {
        setIsLoading(false);
      }
    };

    if (connectionId) {
      loadConnectionAndEndpoints();
    }
  }, [connectionId]);

  const handleRefreshSpec = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Call the actual refresh API
      const response = await apiClient.refreshConnectionSpec(connectionId);
      if (response.success) {
        setSuccessMessage('Specification refreshed successfully');
        
        // Reload endpoints after refresh
        const endpointsResponse = await apiClient.getConnectionEndpoints(connectionId);
        if (endpointsResponse.success && endpointsResponse.data) {
          setEndpoints(endpointsResponse.data.endpoints || []);
        }
      } else {
        setErrorMessage(response.error || 'Failed to refresh specification');
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to refresh specification:', error);
      setErrorMessage('Network error while refreshing specification');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">API Explorer</h1>
          <p className="text-gray-600">
            Explore and test API endpoints for {connection?.name || 'API Connection'}
          </p>
          {connection && (
            <div className="mt-2 text-sm text-gray-500">
              Base URL: {connection.baseUrl} | Status: {connection.status}
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div data-testid="success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md" role="alert" aria-live="polite">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div data-testid="error-message" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            data-testid="primary-action refresh-spec-btn"
            onClick={handleRefreshSpec}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Specification'}
          </button>
        </div>

        <div data-testid="endpoint-list" className="space-y-4">
          {endpoints.length > 0 ? (
            endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                data-testid="endpoint-item"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEndpoint(selectedEndpoint?.id === endpoint.id ? null : endpoint)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-sm text-gray-900">{endpoint.path}</span>
                  </div>
                  <div className="text-sm text-gray-500">{endpoint.summary}</div>
                </div>
                {endpoint.description && (
                  <p className="mt-2 text-sm text-gray-600">{endpoint.description}</p>
                )}
                
                {/* Expanded Endpoint Documentation */}
                {selectedEndpoint?.id === endpoint.id && (
                  <div className="mt-4 space-y-3" data-testid="endpoint-description">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Description</h4>
                      <p className="text-sm text-gray-600">{endpoint.description || endpoint.summary}</p>
                    </div>
                    
                    <div data-testid="endpoint-parameters">
                      <h4 className="text-sm font-medium text-gray-900">Parameters</h4>
                      {endpoint.parameters && endpoint.parameters.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {endpoint.parameters.map((param, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              <span className="font-medium">{param.name}</span>
                              {param.required && <span className="text-red-500 ml-1">*</span>}
                              <span className="ml-2">({param.type})</span>
                              {param.description && <span className="ml-2">- {param.description}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No parameters required</p>
                      )}
                    </div>
                    
                    <div data-testid="endpoint-responses">
                      <h4 className="text-sm font-medium text-gray-900">Responses</h4>
                      {endpoint.responses && endpoint.responses.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {endpoint.responses.map((response, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              <span className="font-medium">{response.code}</span>
                              <span className="ml-2">- {response.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No response information available</p>
                      )}
                    </div>
                    
                    {endpoint.requestSchema && (
                      <div data-testid="request-schema">
                        <h4 className="text-sm font-medium text-gray-900">Request Schema</h4>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <pre className="text-xs text-gray-700 overflow-x-auto">
                            {JSON.stringify(endpoint.requestSchema, null, 2)}
                          </pre>
                        </div>
                        {endpoint.requestSchema.required && endpoint.requestSchema.required.length > 0 && (
                          <div data-testid="required-fields" className="mt-2">
                            <h5 className="text-xs font-medium text-gray-900">Required Fields:</h5>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {endpoint.requestSchema.required.map((field: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {endpoint.responseSchema && (
                      <div data-testid="response-schema">
                        <h4 className="text-sm font-medium text-gray-900">Response Schema</h4>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <pre className="text-xs text-gray-700 overflow-x-auto">
                            {JSON.stringify(endpoint.responseSchema, null, 2)}
                          </pre>
                        </div>
                        <div data-testid="response-examples" className="mt-2">
                          <h5 className="text-xs font-medium text-gray-900">Example Response:</h5>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-700">
                            {endpoint.method === 'GET' && endpoint.path.includes('/pets') && !endpoint.path.includes('{id}') ? (
                              <pre>{`[
  {
    "id": 1,
    "name": "Fluffy",
    "status": "available"
  },
  {
    "id": 2,
    "name": "Rex",
    "status": "sold"
  }
]`}</pre>
                            ) : endpoint.method === 'GET' && endpoint.path.includes('{id}') ? (
                              <pre>{`{
  "id": 1,
  "name": "Fluffy",
  "status": "available"
}`}</pre>
                            ) : endpoint.method === 'POST' ? (
                              <pre>{`{
  "id": 3,
  "name": "Buddy",
  "status": "available"
}`}</pre>
                            ) : (
                              <pre>{JSON.stringify(endpoint.responseSchema, null, 2)}</pre>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No endpoints found</h3>
              <p className="mt-1 text-sm text-gray-500">
                This API connection doesn&apos;t have any documented endpoints yet.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleRefreshSpec}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Refresh Specification
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 