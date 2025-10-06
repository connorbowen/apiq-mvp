'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Plus, Star, Users, Zap, Code, Shield, Clock } from 'lucide-react';

interface CatalogApi {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  documentationUrl?: string;
  logoUrl?: string;
  category?: string;
  tags: string[];
  authTypes: string[];
  status: string;
  isVerified: boolean;
  popularity: number;
  endpointCount: number;
  endpoints: Array<{
    id: string;
    path: string;
    method: string;
    summary?: string;
    description?: string;
    tags: string[];
    parameters?: any;
    requestBody?: any;
    responses?: any;
  }>;
  _count: {
    connections: number;
  };
}

interface ApiCatalogDetailProps {
  apiId: string;
  onBack?: () => void;
  onConnect?: (api: CatalogApi) => void;
}

export default function ApiCatalogDetail({ apiId, onBack, onConnect }: ApiCatalogDetailProps) {
  const [api, setApi] = useState<CatalogApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    fetchApiDetails();
  }, [apiId]);

  const fetchApiDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/catalog/${apiId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch API details');
      }

      setApi(data.data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch API details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!api) return;

    const connectionName = prompt(`Enter a name for your ${api.name} connection:`);
    if (!connectionName) return;

    try {
      setConnecting(true);
      const response = await fetch(`/api/catalog/${api.id}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionName,
          authType: api.authTypes[0] || 'API_KEY',
          authConfig: {},
          description: `Connected to ${api.name} via API Catalog`
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully connected to ${api.name}!`);
        if (onConnect) {
          onConnect(api);
        }
      } else {
        alert(`Failed to connect: ${data.error}`);
      }
    } catch (err) {
      console.error('Connection failed:', err);
      alert('Failed to connect to API');
    } finally {
      setConnecting(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !api) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          {error || 'API not found'}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="api-detail">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-4">
          {api.logoUrl ? (
            <img
              src={api.logoUrl}
              alt={`${api.name} logo`}
              className="h-12 w-12 rounded-lg object-contain"
            />
          ) : (
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{api.name}</h1>
              {api.isVerified && (
                <div className="flex items-center text-green-600">
                  <Star className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="text-gray-600">{api.description}</p>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">API Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Base URL</label>
              <p className="text-sm text-gray-900 font-mono">{api.baseUrl}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="text-sm text-gray-900">{api.category || 'Uncategorized'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                api.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {api.status}
              </span>
            </div>
            {api.documentationUrl && (
              <div>
                <a
                  href={api.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Documentation
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Popularity</span>
              <span className="text-sm font-medium text-gray-900">{api.popularity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Endpoints</span>
              <span className="text-sm font-medium text-gray-900">{api.endpointCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Connections</span>
              <span className="text-sm font-medium text-gray-900">{api._count.connections}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {connecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {connecting ? 'Connecting...' : 'Connect to API'}
            </button>
            {api.documentationUrl && (
              <a
                href={api.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Documentation
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tags and Auth Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {api.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-sm text-gray-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Authentication Types</h3>
          <div className="flex flex-wrap gap-2">
            {api.authTypes.map((authType) => (
              <span
                key={authType}
                className="px-3 py-1 bg-blue-100 text-sm text-blue-700 rounded-full"
              >
                {authType}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border" data-testid="api-endpoints-section">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-900">API Endpoints</h3>
          <p className="text-sm text-gray-600 mt-1">
            {api.endpointCount} endpoints available
          </p>
        </div>
        <div className="divide-y">
          {api.endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className={`p-6 hover:bg-gray-50 cursor-pointer ${
                selectedEndpoint === endpoint.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedEndpoint(
                selectedEndpoint === endpoint.id ? null : endpoint.id
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(endpoint.method)}`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono text-gray-900">
                    {endpoint.path}
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  {endpoint.tags.length > 0 && (
                    <div className="flex space-x-1">
                      {endpoint.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {endpoint.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                          +{endpoint.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-gray-400">
                    {selectedEndpoint === endpoint.id ? '▼' : '▶'}
                  </div>
                </div>
              </div>
              {endpoint.summary && (
                <p className="text-sm text-gray-600 mt-2">{endpoint.summary}</p>
              )}
              
              {/* Expanded endpoint details */}
              {selectedEndpoint === endpoint.id && (
                <div className="mt-4 space-y-4">
                  {endpoint.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    </div>
                  )}
                  
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Parameters</h4>
                      <div className="space-y-2">
                        {endpoint.parameters.map((param: any, index: number) => (
                          <div key={index} className="text-sm">
                            <code className="font-mono text-gray-900">{param.name}</code>
                            <span className="text-gray-500 ml-2">({param.in})</span>
                            {param.required && (
                              <span className="ml-2 px-1 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                                required
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {endpoint.requestBody && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Request Body</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono text-gray-700">
                        {JSON.stringify(endpoint.requestBody, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
