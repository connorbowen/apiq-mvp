'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Users, Zap, ExternalLink, Plus } from 'lucide-react';

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
}

export default function ProviderDetail() {
  const params = useParams();
  const router = useRouter();
  const providerId = params?.id as string;
  
  const [provider, setProvider] = useState<any>(null);
  const [apis, setApis] = useState<CatalogApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providerId) {
      fetchProviderData();
    }
  }, [providerId]);

  const fetchProviderData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch provider details
      const providerResponse = await fetch(`/api/catalog/providers/${providerId}`);
      const providerData = await providerResponse.json();

      if (!providerData.success) {
        throw new Error(providerData.error || 'Failed to fetch provider');
      }

      setProvider(providerData.data.provider);

      // Fetch APIs for this provider
      const apisResponse = await fetch(`/api/catalog?providerId=${providerId}&limit=50`);
      const apisData = await apisResponse.json();

      if (!apisData.success) {
        throw new Error(apisData.error || 'Failed to fetch provider APIs');
      }

      setApis(apisData.data.catalogEntries);
    } catch (err: any) {
      console.error('Failed to fetch provider data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (api: CatalogApi) => {
    try {
      console.log('🔗 [ProviderDetail] handleConnect called for:', api.name);
      
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
    } catch (error) {
      console.error('❌ [ProviderDetail] Error in handleConnect:', error);
      alert('Failed to connect to API');
    }
  };

  const handleViewDetails = (api: CatalogApi) => {
    // Default details view
    window.open(`/api/catalog/${api.id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8" data-testid="provider-error-state">
        <div className="text-red-600 mb-4">Error loading provider: {error}</div>
        <button
          onClick={fetchProviderData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">Provider not found</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="provider-detail">
      {/* Header */}
      <header role="banner" className="dashboard-header bg-white shadow relative z-50">
        <div className="w-full py-3 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Back to Catalog link */}
              <button
                onClick={() => router.push('/catalog')}
                className="flex items-center text-indigo-600 hover:text-indigo-500 transition-colors"
                data-testid="back-to-catalog-link"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm font-medium">Back to Catalog</span>
              </button>
              
              {/* Provider Info */}
              <div className="flex items-center space-x-3">
                {provider.logoUrl ? (
                  <img
                    src={provider.logoUrl}
                    alt={`${provider.name} logo`}
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-contain"
                  />
                ) : (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{provider.name}</h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {provider.description || `${apis.length} APIs available`}
                    {provider.isVerified && (
                      <span className="ml-2 flex items-center text-green-600">
                        <Star className="h-3 w-3 mr-1" />
                        Verified
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Provider Actions */}
            <div className="flex items-center space-x-3">
              {provider.websiteUrl && (
                <a
                  href={provider.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* APIs Grid */}
      <div className="space-y-6 px-6 py-8">
        
        {apis.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No APIs found for this provider</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr">
            {apis.map((api) => (
              <div
                key={api.id}
                data-testid={`api-card-${api.name}`}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer p-6"
                onClick={() => handleViewDetails(api)}
              >
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
                          className="px-2 py-1 bg-indigo-100 text-xs text-indigo-600 rounded"
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
                      className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
