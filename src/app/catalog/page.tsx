'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ApiCatalog from '../../components/ApiCatalog';
import ApiCatalogDetail from '../../components/ApiCatalogDetail';
import CreateConnectionModal from '../../components/dashboard/CreateConnectionModal';
import UserDropdown from '../../components/dashboard/UserDropdown';
import { useUser, UserProvider } from '../../contexts/UserContext';

function CatalogPageContent() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedApi, setSelectedApi] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [catalogApiForConnection, setCatalogApiForConnection] = useState<any>(null);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0);

  // Fetch total catalog count
  const fetchTotalCatalogCount = async () => {
    try {
      const response = await fetch('/api/catalog?page=1&limit=1&status=ACTIVE');
      const data = await response.json();
      if (data.success) {
        setTotalCatalogCount(data.pagination.total);
      }
    } catch (err) {
      console.error('❌ CatalogPage: Failed to fetch total catalog count:', err);
    }
  };

  // Fetch total count on mount
  useEffect(() => {
    fetchTotalCatalogCount();
  }, []);

  // Handle API details view
  const handleViewApiDetails = (api: any) => {
    setSelectedApi(api);
    // Update URL to include API ID
    router.push(`/catalog/${api.id}`);
  };

  // Handle back to catalog
  const handleBackToCatalog = () => {
    setSelectedApi(null);
    router.push('/catalog');
  };

  // Handle back to connections
  const handleBackToConnections = () => {
    router.push('/dashboard');
  };

  // Handle creating connection from catalog API
  const handleCreateConnectionFromCatalog = (api: any) => {
    setCatalogApiForConnection(api);
    setShowCreateForm(true);
  };

  // Handle adding new API
  const handleAddNewApi = () => {
    setShowCreateForm(true);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  // If viewing a specific API, show the detail page
  if (selectedApi) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ApiCatalogDetail
            apiId={selectedApi.id}
            onBack={handleBackToCatalog}
            onCreateConnection={handleCreateConnectionFromCatalog}
          />
        </div>
      </div>
    );
  }

  // Show the catalog page
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header role="banner" className="dashboard-header bg-white shadow relative z-50">
        <div className="w-full py-3 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Back to Dashboard link */}
              <Link
                href="/dashboard?tab=connections"
                className="flex items-center text-indigo-600 hover:text-indigo-500 transition-colors"
                data-testid="back-to-dashboard-link"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">Back to Dashboard</span>
              </Link>
              
              {/* Page Title */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">API Catalog</h1>
                  <p className="text-xs sm:text-sm text-gray-500">Discover and connect to {totalCatalogCount} popular APIs</p>
                </div>
              </div>
            </div>
            

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAddNewApi}
                data-testid="primary-action add-new-api-btn"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New API
              </button>
              {user && (
                <UserDropdown user={user} onLogout={handleLogout} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <ApiCatalog
          onViewDetails={handleViewApiDetails}
          onAddNewApi={handleAddNewApi}
          onBack={handleBackToConnections}
          onCreateConnection={handleCreateConnectionFromCatalog}
        />
      </div>
      
      {/* Create Connection Modal */}
      {showCreateForm && (
        <CreateConnectionModal
          onClose={() => {
            setShowCreateForm(false);
            setCatalogApiForConnection(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setCatalogApiForConnection(null);
            // Navigate back to connections tab to show the new connection
            router.push('/dashboard?tab=connections');
          }}
          onError={(error) => console.error("Connection creation error:", error)}
          catalogApi={catalogApiForConnection}
        />
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <UserProvider>
      <CatalogPageContent />
    </UserProvider>
  );
}
