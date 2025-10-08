'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, ExternalLink, Plus, Star, Users, Zap, ChevronDown, ChevronRight } from 'lucide-react';

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
  _count: {
    connections: number;
  };
}

interface ApiProvider {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  category?: string;
  isVerified: boolean;
  isActive: boolean;
  apis: CatalogApi[];
}

interface ProviderCatalogProps {
  onConnect?: (api: CatalogApi) => void;
  onViewDetails?: (api: CatalogApi) => void;
  onAddNewApi?: () => void;
  onBack?: () => void;
  onCreateConnection?: (api: CatalogApi) => void;
}

export default function ProviderCatalog({ onConnect, onViewDetails, onAddNewApi, onBack, onCreateConnection }: ProviderCatalogProps) {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch providers data
  const fetchProvidersData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        isActive: 'true'
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);

      console.log('🔍 ProviderCatalog: Fetching providers data with params:', params.toString());
      const response = await fetch(`/api/catalog/providers?${params}`);
      const data = await response.json();

      console.log('🔍 ProviderCatalog: API response:', {
        success: data.success,
        providersCount: data.data?.providers?.length || 0
      });

      if (!data.success) {
        console.error('❌ ProviderCatalog: API error:', data.error);
        throw new Error(data.error || 'Failed to fetch providers data');
      }

      setProviders(data.data.providers);
    } catch (err: any) {
      console.error('❌ ProviderCatalog: Failed to fetch providers data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvidersData();
  }, [searchQuery, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProvidersData();
  };

  const handleConnect = async (api: CatalogApi) => {
    try {
      console.log('🔗 [ProviderCatalog] handleConnect called for:', api.name);
      console.log('🔗 [ProviderCatalog] onCreateConnection available:', !!onCreateConnection);
      console.log('🔗 [ProviderCatalog] onConnect available:', !!onConnect);
      
      if (onCreateConnection) {
        console.log('🔗 [ProviderCatalog] Calling onCreateConnection');
        onCreateConnection(api);
      } else if (onConnect) {
        console.log('🔗 [ProviderCatalog] Calling onConnect');
        onConnect(api);
      } else {
        console.log('🔗 [ProviderCatalog] Using default connection flow');
        // Default connection flow
        const connectionName = prompt(`Enter a name for your ${api.name} connection:`);
        if (!connectionName) return;

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
          // Refresh the page or update UI
          window.location.reload();
        } else {
          alert(`Failed to connect: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('❌ [ProviderCatalog] Error in handleConnect:', error);
      alert('Failed to connect to API');
    }
  };

  const handleViewDetails = (api: CatalogApi) => {
    if (onViewDetails) {
      onViewDetails(api);
    } else {
      // Default details view
      window.open(`/api/catalog/${api.id}`, '_blank');
    }
  };

  const toggleProvider = (providerId: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  if (loading && providers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8" data-testid="catalog-error-state">
        <div className="text-red-600 mb-4">Error loading catalog: {error}</div>
        <button
          onClick={fetchProvidersData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="provider-catalog">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Providers</h2>
            <p className="text-gray-600 mt-1">
              Connect to {providers.length} service provider suites
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {onAddNewApi && (
            <button
              onClick={onAddNewApi}
              data-testid="primary-action add-new-api-btn"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New API
            </button>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              data-testid="grid-view-button"
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              data-testid="list-view-button"
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search providers by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="provider-search-input"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="Productivity">Productivity</option>
                <option value="Business">Business</option>
                <option value="Cloud">Cloud</option>
                <option value="Communication">Communication</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {providers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No providers found matching your criteria</div>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
            {onAddNewApi && (
              <button
                onClick={onAddNewApi}
                data-testid="empty-state add-new-api-btn"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Add New API
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="provider-results">
          {providers.map((provider) => (
            <div
              key={provider.id}
              data-testid={`provider-card-${provider.name}`}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              {/* Provider Header */}
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleProvider(provider.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {provider.logoUrl ? (
                      <img
                        src={provider.logoUrl}
                        alt={`${provider.name} logo`}
                        className="h-12 w-12 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.description}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {provider.apis.length} APIs available
                        </span>
                        {provider.isVerified && (
                          <div className="flex items-center text-xs text-green-600">
                            <Star className="h-3 w-3 mr-1" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {expandedProviders.has(provider.id) ? 'Hide' : 'Show'} APIs
                    </span>
                    {expandedProviders.has(provider.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Provider APIs (Expandable) */}
              {expandedProviders.has(provider.id) && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Available APIs:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {provider.apis.map((api) => (
                        <div
                          key={api.id}
                          data-testid={`api-card-${api.name}`}
                          className="bg-white rounded-lg p-4 border hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleViewDetails(api)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {api.logoUrl ? (
                                <img
                                  src={api.logoUrl}
                                  alt={`${api.name} logo`}
                                  className="h-8 w-8 rounded object-contain"
                                />
                              ) : (
                                <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                                  <Zap className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <h5 className="font-medium text-gray-900">{api.name}</h5>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {api.description || 'No description available'}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {api.endpointCount} endpoints
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {api.popularity || 0} popularity
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* API Actions */}
                          <div className="mt-3 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleConnect(api)}
                              data-testid="primary-action connect-api-btn"
                              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4 inline mr-1" />
                              Connect
                            </button>
                            <button
                              onClick={() => handleViewDetails(api)}
                              className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
