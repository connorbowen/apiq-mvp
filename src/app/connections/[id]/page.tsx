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
}

export default function APIExplorerPage() {
  const params = useParams();
  const connectionId = params?.id as string;
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock endpoints for testing
    setEndpoints([
      {
        id: '1',
        path: '/pets',
        method: 'GET',
        summary: 'List all pets',
        description: 'Returns a list of all pets in the store'
      },
      {
        id: '2',
        path: '/pets',
        method: 'POST',
        summary: 'Create a pet',
        description: 'Creates a new pet in the store'
      },
      {
        id: '3',
        path: '/pets/{id}',
        method: 'GET',
        summary: 'Get pet by ID',
        description: 'Returns a single pet by ID'
      }
    ]);
    setIsLoading(false);
  }, [connectionId]);

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
          <p className="text-gray-600">Explore and test API endpoints</p>
        </div>

        <div data-testid="endpoint-list" className="space-y-4">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              data-testid="endpoint-item"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {/* TODO: Show endpoint details */}}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 