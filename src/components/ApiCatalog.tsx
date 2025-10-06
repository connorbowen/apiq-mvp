'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, ExternalLink, Plus, Star, Users, Zap } from 'lucide-react';

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
    tags: string[];
  }>;
  _count: {
    connections: number;
  };
}

interface CatalogCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  apiCount: number;
}

interface ApiCatalogProps {
  onConnect?: (api: CatalogApi) => void;
  onViewDetails?: (api: CatalogApi) => void;
}

export default function ApiCatalog({ onConnect, onViewDetails }: ApiCatalogProps) {
  const [apis, setApis] = useState<CatalogApi[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAuthType, setSelectedAuthType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'createdAt'>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const authTypeOptions = [
    { value: 'API_KEY', label: 'API Key' },
    { value: 'BEARER_TOKEN', label: 'Bearer Token' },
    { value: 'OAUTH2', label: 'OAuth 2.0' },
    { value: 'BASIC_AUTH', label: 'Basic Auth' },
    { value: 'NONE', label: 'No Auth' }
  ];

  // Fetch catalog data
  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        status: 'ACTIVE'
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedAuthType) params.append('authType', selectedAuthType);

      console.log('🔍 ApiCatalog: Fetching catalog data with params:', params.toString());
      const response = await fetch(`/api/catalog?${params}`);
      const data = await response.json();

      console.log('🔍 ApiCatalog: API response:', {
        success: data.success,
        dataKeys: data.data ? Object.keys(data.data) : 'no data',
        catalogEntriesCount: data.data?.catalogEntries?.length || 0,
        pagination: data.data?.pagination
      });

      if (!data.success) {
        console.error('❌ ApiCatalog: API error:', data.error);
        throw new Error(data.error || 'Failed to fetch catalog data');
      }

      setApis(data.data.catalogEntries);
      setTotalPages(data.pagination.pages);
      setTotalCount(data.pagination.total);
    } catch (err: any) {
      console.error('❌ ApiCatalog: Failed to fetch catalog data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/catalog/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCatalogData();
  }, [currentPage, searchQuery, selectedCategory, selectedAuthType, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCatalogData();
  };

  const handleConnect = async (api: CatalogApi) => {
    if (onConnect) {
      onConnect(api);
    } else {
      // Default connection flow
      const connectionName = prompt(`Enter a name for your ${api.name} connection:`);
      if (!connectionName) return;

      try {
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
      } catch (err) {
        console.error('Connection failed:', err);
        alert('Failed to connect to API');
      }
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedAuthType('');
    setCurrentPage(1);
  };

  if (loading && apis.length === 0) {
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
          onClick={fetchCatalogData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="api-catalog">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Catalog</h2>
          <p className="text-gray-600 mt-1">
            Discover and connect to {totalCount} popular APIs
          </p>
        </div>
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

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search APIs by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="api-search-input"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name} ({category.apiCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication
              </label>
              <select
                value={selectedAuthType}
                onChange={(e) => setSelectedAuthType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Auth Types</option>
                {authTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="popularity">Popularity</option>
                  <option value="name">Name</option>
                  <option value="createdAt">Date Added</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
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
      {(() => {
        console.log('🔍 ApiCatalog: Rendering results - apis.length:', apis.length, 'loading:', loading, 'error:', error);
        return null;
      })()}
      {apis.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No APIs found matching your criteria</div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* API Grid/List */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'} data-testid="search-results">
            {apis.map((api) => (
              <div
                key={api.id}
                data-testid={`api-card-${api.name}`}
                className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'p-6' : 'p-6'
                }`}
              >
                {viewMode === 'grid' ? (
                  <div className="space-y-4">
                    {/* API Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {api.logoUrl ? (
                          <img
                            src={api.logoUrl}
                            alt={`${api.name} logo`}
                            className="h-10 w-10 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Zap className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{api.name}</h3>
                          {api.isVerified && (
                            <div className="flex items-center text-xs text-green-600">
                              <Star className="h-3 w-3 mr-1" />
                              Verified
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        {api.popularity || 0}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {api.description || 'No description available'}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {api.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {api.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                          +{api.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Auth Types */}
                    <div className="flex flex-wrap gap-1">
                      {api.authTypes.map((authType) => (
                        <span
                          key={authType}
                          className="px-2 py-1 bg-blue-100 text-xs text-blue-600 rounded"
                        >
                          {authType}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleConnect(api)}
                        data-testid="primary-action connect-api-btn"
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Connect
                      </button>
                      <button
                        onClick={() => handleViewDetails(api)}
                        data-testid="primary-action view-endpoints-btn"
                        className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
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
                          <h3 className="font-semibold text-gray-900">{api.name}</h3>
                          {api.isVerified && (
                            <Star className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{api.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {api.endpointCount} endpoints
                          </span>
                          <span className="text-xs text-gray-500">
                            {api.popularity || 0} popularity
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleConnect(api)}
                        data-testid="primary-action connect-api-btn"
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Connect
                      </button>
                      <button
                        onClick={() => handleViewDetails(api)}
                        data-testid="primary-action view-endpoints-btn"
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2" data-testid="pagination-controls">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                data-testid="previous-page-button"
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                data-testid="next-page-button"
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
