'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SecretPageProps {
  params: {
    id: string;
  };
}

export default function SecretPage({ params }: SecretPageProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status
    if (status === 'loading') {
      return; // Still loading
    }

    if (status === 'unauthenticated' || !session) {
      // Redirect to login with proper message
      router.push('/login?reason=auth');
      return;
    }

    // User is authenticated, try to fetch the secret
    const fetchSecret = async () => {
      try {
        const response = await fetch(`/api/secrets/${params.id}`);
        
        if (response.status === 401) {
          // Handle unauthorized - redirect to login
          router.push('/login?reason=auth');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch secret');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch secret');
        }

        // Secret fetched successfully
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load secret');
        setIsLoading(false);
      }
    };

    fetchSecret();
  }, [status, session, router, params.id]);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading secret...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push('/dashboard?tab=secrets')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Back to Secrets
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached if authentication redirects work properly
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
} 