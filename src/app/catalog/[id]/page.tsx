'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ApiCatalogDetail from '../../../components/ApiCatalogDetail';
import CreateConnectionModal from '../../../components/dashboard/CreateConnectionModal';
import { UserProvider } from '../../../contexts/UserContext';

function ApiDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const apiId = params?.id as string;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [catalogApiForConnection, setCatalogApiForConnection] = useState<any>(null);

  // Handle back to catalog
  const handleBackToCatalog = () => {
    router.push('/catalog');
  };

  // Handle creating connection from catalog API
  const handleCreateConnectionFromCatalog = (api: any) => {
    setCatalogApiForConnection(api);
    setShowCreateForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ApiCatalogDetail
          apiId={apiId}
          onBack={handleBackToCatalog}
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

export default function ApiDetailPage() {
  return (
    <UserProvider>
      <ApiDetailPageContent />
    </UserProvider>
  );
}
