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
  providerId?: string;
  provider?: {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
    category?: string;
    isVerified: boolean;
  };
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
  onAddNewApi?: () => void;
  onBack?: () => void;
  onCreateConnection?: (api: CatalogApi) => void;
}

export default function ApiCatalog({ onConnect, onViewDetails, onAddNewApi, onBack, onCreateConnection }: ApiCatalogProps) {
  const [apis, setApis] = useState<CatalogApi[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAuthType, setSelectedAuthType] = useState<string>('');
  // Fixed sorting: popularity first, then alphabetically
  // No need for user controls since we have a standard sort order
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0); // Total APIs in catalog (unfiltered)
  const [perPage, setPerPage] = useState(12);

  const authTypeOptions = [
    { value: 'API_KEY', label: 'API Key' },
    { value: 'BEARER_TOKEN', label: 'Bearer Token' },
    { value: 'OAUTH2', label: 'OAuth 2.0' },
    { value: 'BASIC_AUTH', label: 'Basic Auth' },
    { value: 'NONE', label: 'No Auth' }
  ];

  const perPageOptions = [
    { value: 12, label: '12 per page' },
    { value: 24, label: '24 per page' },
    { value: 48, label: '48 per page' }
  ];

  // Fetch total catalog count (unfiltered)
  const fetchTotalCatalogCount = async () => {
    try {
      const response = await fetch('/api/catalog?page=1&limit=1&status=ACTIVE');
      const data = await response.json();
      if (data.success) {
        setTotalCatalogCount(data.pagination.total);
      }
    } catch (err) {
      console.error('❌ ApiCatalog: Failed to fetch total catalog count:', err);
    }
  };

  // Fetch catalog data
  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: perPage.toString(),
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
    fetchCatalogData();
  }, []);

  // Reset to first page when perPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [perPage]);

  // Fetch total catalog count on mount
  useEffect(() => {
    fetchTotalCatalogCount();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCatalogData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedAuthType, perPage]);

  // Separate effect for pagination (no debounce needed)
  useEffect(() => {
    fetchCatalogData();
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    // fetchCatalogData will be called by the debounced useEffect
  };

  const handleConnect = async (api: CatalogApi) => {
    try {
      console.log('🔗 [ApiCatalog] handleConnect called for:', api.name);
      console.log('🔗 [ApiCatalog] onCreateConnection available:', !!onCreateConnection);
      console.log('🔗 [ApiCatalog] onConnect available:', !!onConnect);
      
      if (onCreateConnection) {
        console.log('🔗 [ApiCatalog] Calling onCreateConnection');
        onCreateConnection(api);
      } else if (onConnect) {
        console.log('🔗 [ApiCatalog] Calling onConnect');
        onConnect(api);
      } else {
        console.log('🔗 [ApiCatalog] Using default connection flow');
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
      console.error('❌ [ApiCatalog] Error in handleConnect:', error);
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

      {/* Search and Filters - Full Width */}
      <div className="bg-white p-6 border-b">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search APIs by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
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
                Sort Order
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                Popularity → Alphabetical
              </div>
            </div>

          </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">View:</span>
                  <div className="flex border border-gray-300 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 text-sm rounded-l-lg ${
                        viewMode === 'grid'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 text-sm rounded-r-lg ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
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
      {(() => {
        if (apis.length === 0) {
          return (
            <div className="text-center py-12 px-6">
              <div className="text-gray-500 mb-4">No APIs found matching your criteria</div>
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
          );
        }

        return (
          <div className="space-y-6 px-6">
            {/* Unified API List */}
            <div 
              className={viewMode === 'grid' ? 'grid gap-6 auto-rows-fr' : 'space-y-4'} 
              style={viewMode === 'grid' ? { 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gridAutoRows: '1fr',
                gridAutoFlow: 'row',
                display: 'grid'
              } : {}}
            >
              {apis.map((api) => (
                <div
                  key={api.id}
                  data-testid={`api-card-${api.name}`}
                  className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${
                    viewMode === 'list' ? 'p-6' : 'p-6 h-full flex flex-col'
                  }`}
                  onClick={() => handleViewDetails(api)}
                >
                  {viewMode === 'grid' ? (
                    <div className="flex flex-col h-full">
                      {/* Content Area - grows to fill space */}
                      <div className="flex-1 space-y-3">
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

                        {/* Provider Context */}
                        {api.provider && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Part of</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/catalog/provider/${api.provider?.id}`;
                              }}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {api.provider.name}
                            </button>
                            {api.provider.isVerified && (
                              <Star className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        )}

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
                      </div>

                      {/* Actions - fixed at bottom */}
                      <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleConnect(api)}
                          data-testid="primary-action connect-api-btn"
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 inline mr-1" />
                          Connect
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
                          {api.provider && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Part of</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/catalog/provider/${api.provider?.id}`;
                                }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {api.provider.name}
                              </button>
                            </div>
                          )}
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
                      <div onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleConnect(api)}
                          data-testid="primary-action connect-api-btn"
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-900 font-medium">
                {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalCount)} of {totalCount}
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(parseInt(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                >
                  {perPageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* First and Previous buttons */}
              {currentPage > 1 && (
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-900 hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              
              {/* First button - only show if not on first or second page */}
              {currentPage > 2 && (
                <button
                  onClick={() => setCurrentPage(1)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-900 hover:bg-gray-50"
                >
                  First
                </button>
              )}
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              {/* Next and Last buttons */}
              {currentPage < totalPages && (
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-900 hover:bg-gray-50"
                >
                  Next
                </button>
              )}
              
              {/* Last button - only show if not on last or second-to-last page */}
              {currentPage < totalPages - 1 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-900 hover:bg-gray-50"
                >
                  Last
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
