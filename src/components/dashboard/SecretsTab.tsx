'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../lib/api/client';
import axios from 'axios';
import { AlertBanner } from '../ui/AlertBanner';
import { SecretTypeSelect } from '../ui/SecretTypeSelect';
import { flushSync } from 'react-dom';

interface SecretsTabProps {
  secrets: any[];
  onSecretCreated: () => void;
  onSecretError: (error: string) => void;
}

export default function SecretsTab({ 
  secrets, 
  onSecretCreated, 
  onSecretError 
}: SecretsTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secretList, setSecretList] = useState(secrets);
  const [activeSecretId, setActiveSecretId] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('SecretsTab rendered with secrets:', secrets);
    console.log('SecretsTab showCreateForm:', showCreateForm);
  }, [secrets, showCreateForm]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const getSecretTypeLabel = (type: string) => {
    const normalizedType = type.toUpperCase();
    switch (normalizedType) {
      case 'API_KEY':
        return 'API Key';
      case 'BEARER_TOKEN':
        return 'Bearer Token';
      case 'PASSWORD':
        return 'Password';
      case 'SSH_KEY':
        return 'SSH Key';
      case 'CERTIFICATE':
        return 'Certificate';
      case 'OAUTH2_TOKEN':
        return 'OAuth2 Token';
      case 'DATABASE_PASSWORD':
        return 'Database Password';
      default:
        return type;
    }
  };

  const getSecretTypeIcon = (type: string) => {
    const normalizedType = type.toUpperCase();
    switch (normalizedType) {
      case 'API_KEY':
        return (
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      case 'BEARER_TOKEN':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'PASSWORD':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'OAUTH2_TOKEN':
        return (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case 'DATABASE_PASSWORD':
        return (
          <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
    }
  };

  const handleDeleteSecret = async (secretId: string, secretName: string) => {
    if (confirm(`Are you sure you want to delete the secret "${secretName}"? This action cannot be undone.`)) {
      try {
        setIsLoading(true);
        // TODO: Implement delete secret API call
        onSecretCreated(); // Refresh the list
      } catch (error) {
        onSecretError('Failed to delete secret');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRotateSecret = async (secretId: string, secretName: string) => {
    if (confirm(`Are you sure you want to rotate the secret "${secretName}"? This will generate a new value.`)) {
      try {
        setIsLoading(true);
        // TODO: Implement rotate secret API call
        onSecretCreated(); // Refresh the list
      } catch (error) {
        onSecretError('Failed to rotate secret');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleViewSecret = (secretId: string, secretName: string) => {
    console.log(`Viewing secret: ${secretName} (ID: ${secretId})`);
    // Expand the secret to show details including rotation settings
    handleSecretToggle(secretId);
    // TODO: Implement proper secret viewing functionality
  };

  const filteredSecrets = secrets.filter(secret => {
    const matchesSearch = secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         secret.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || secret.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSecretCreated = () => {
    setSuccessMessage('Secret created successfully');
    setShowCreateForm(false);
    onSecretCreated();
    
    // Announce success to screen readers immediately
    setTimeout(() => {
      const announcementRegion = document.getElementById('aria-live-announcements');
      if (announcementRegion) {
        announcementRegion.textContent = 'Secret created successfully';
        setTimeout(() => {
          announcementRegion.textContent = '';
        }, 3000);
      }
    }, 100);
  };

  const handleSecretError = (error: string) => {
    setErrorMessage(error);
    onSecretError(error);
  };

  const handleSecretRotated = (updatedSecret: any) => {
    setSecretList((prev: any[]) => prev.map(s => s.id === updatedSecret.id ? updatedSecret : s));
  };

  const handleSecretToggle = async (secretId: string) => {
    const isExpanding = activeSecretId !== secretId;
    setActiveSecretId(id => (id === secretId ? null : secretId));
  };

  return (
    <div data-testid="secrets-management" role="region" aria-labelledby="secrets-heading">
      {/* Main heading for secrets management */}
      <div className="mb-6">
        <h2 id="secrets-heading" className="text-2xl font-semibold text-gray-900 mb-2">
          Secrets Management
        </h2>
        <p className="text-gray-600">Manage your encrypted API keys, tokens, and sensitive credentials</p>
      </div>

      {/* Success Banner lifted out of modal */}
      {successMessage && (
        <div 
          role="alert" 
          data-testid="success-message"
          className="mb-4 bg-green-50 border border-green-200 rounded-md p-4 text-green-800 font-medium flex items-center justify-between"
        >
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
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

      {/* Create Secret Button */}
      <div className="mb-6">
        <button
          data-testid="primary-action create-secret-btn"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Secret
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="secret-search-input" className="sr-only">Search secrets</label>
          <input
            id="secret-search-input"
            data-testid="search-input"
            type="text"
            placeholder="Search secrets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            aria-describedby="search-help"
          />
          <div id="search-help" className="sr-only">Search secrets by name or description</div>
        </div>
        <div className="sm:w-48">
          <label htmlFor="secret-filter-select" className="sr-only">Filter by type</label>
          <select
            id="secret-filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="API_KEY">API Key</option>
            <option value="BEARER_TOKEN">Bearer Token</option>
            <option value="PASSWORD">Password</option>
            <option value="SSH_KEY">SSH Key</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="OAUTH2_TOKEN">OAuth2 Token</option>
            <option value="DATABASE_PASSWORD">Database Password</option>
          </select>
        </div>

      </div>

      {/* Security Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Security Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>All secrets are encrypted at rest using AES-256 encryption. Access is logged and audited for security compliance.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secrets List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredSecrets.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No secrets</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'No secrets match your search criteria.'
                : 'Get started by adding your first secret to the vault.'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <div className="mt-6">
                <button
                  data-testid="primary-action create-secret-btn-empty-state"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Secret
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200" role="list">
            {filteredSecrets.map((secret) => (
              <li key={secret.id} data-testid="secret-card" className="p-4 border-b border-gray-200 last:border-b-0">
                <SecretCard 
                  secret={secret} 
                  onRotated={handleSecretRotated} 
                  handleDeleteSecret={handleDeleteSecret} 
                  isLoading={isLoading} 
                  activeSecretId={activeSecretId} 
                  handleSecretToggle={handleSecretToggle} 
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Secret Modal */}
      {showCreateForm && (
        <CreateSecretModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={msg => {
            setSuccessMessage(msg);
            onSecretCreated();
            // Add a small delay to ensure the success message is displayed before closing modal
            setTimeout(() => setShowCreateForm(false), 500);
          }}
          onError={handleSecretError}
        />
      )}
    </div>
  );
}

function SecretCard({ secret, onRotated, handleDeleteSecret, isLoading, activeSecretId, handleSecretToggle }: { 
  secret: any, 
  onRotated: (updated: any) => void, 
  handleDeleteSecret: (id: string, name: string) => void, 
  isLoading: boolean,
  activeSecretId: string | null,
  handleSecretToggle: (secretId: string) => void
}) {
  const getSecretTypeLabel = (type: string) => {
    const normalizedType = type.toUpperCase();
    switch (normalizedType) {
      case 'API_KEY':
        return 'API Key';
      case 'BEARER_TOKEN':
        return 'Bearer Token';
      case 'PASSWORD':
        return 'Password';
      case 'SSH_KEY':
        return 'SSH Key';
      case 'CERTIFICATE':
        return 'Certificate';
      case 'OAUTH2_TOKEN':
        return 'OAuth2 Token';
      case 'DATABASE_PASSWORD':
        return 'Database Password';
      default:
        return type;
    }
  };
  const [rotating, setRotating] = useState(false);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [rotationSuccess, setRotationSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rotationEnabled, setRotationEnabled] = useState(!!secret.rotationEnabled);
  const [rotationInterval, setRotationInterval] = useState<number>(secret.rotationInterval || 30);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isActive = activeSecretId === secret.id;

  const handleRotate = async () => {
    setRotating(true);
    setRotationError(null);
    setRotationSuccess(null);
    try {
      const res = await axios.post(`/api/secrets/${encodeURIComponent(secret.name)}/rotate`);
      if (res.data && res.data.success) {
        setRotationSuccess('API key rotated successfully');
        onRotated(res.data.data);
      } else {
        setRotationError(res.data?.error || 'Failed to rotate API key');
      }
    } catch (err: any) {
      setRotationError(err?.response?.data?.error || 'Failed to rotate API key');
    } finally {
      setRotating(false);
    }
  };

  const handleSaveRotationSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await axios.patch(`/api/secrets/${encodeURIComponent(secret.name)}`, {
        rotationEnabled,
        rotationInterval: rotationEnabled ? rotationInterval : null
      });
      if (res.data && res.data.success) {
        setSaveSuccess('Rotation settings updated');
        onRotated(res.data.data);
        setEditing(false);
      } else {
        setSaveError(res.data?.error || 'Failed to update rotation settings');
      }
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || 'Failed to update rotation settings');
    } finally {
      setSaving(false);
    }
  };

  const [viewingSecret, setViewingSecret] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [showSecretValue, setShowSecretValue] = useState(false);

  // Reset showSecretValue when secret is collapsed
  useEffect(() => {
    if (!isActive) {
      setShowSecretValue(false);
    }
  }, [isActive]);

  // Fetch secret value only when explicitly requested
  const fetchSecretValue = async () => {
    if (secretValue) {
      // Already fetched, just show it
      setShowSecretValue(true);
      return;
    }

    try {
      setViewingSecret(secret.id);
      setViewError(null);
      
      const response = await fetch(`/api/secrets/${secret.name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve secret: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setSecretValue(result.data.value);
        setShowSecretValue(true);
        console.log(`Secret value fetched for ${secret.name} - access logged`);
      } else {
        throw new Error(result.error || 'Failed to retrieve secret');
      }
    } catch (error) {
      console.error('Failed to fetch secret value:', error);
      setViewError(error instanceof Error ? error.message : 'Failed to retrieve secret');
    } finally {
      setViewingSecret(null);
    }
  };

  const handleViewSecret = async (secretId: string, secretName: string) => {
    console.log(`Viewing secret: ${secretName} (ID: ${secretId})`);
    // Expand the secret to show details including rotation settings
    handleSecretToggle(secretId);
    // Don't automatically fetch the secret value - keep it masked by default
  };

  return (
    <div data-testid={`secret-card-${secret.id}`} className="flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold" data-testid={`secret-name-${secret.id}`}>{secret.name}</div>
            <div className="text-xs text-gray-500" data-testid={`secret-type-${secret.id}`}>{getSecretTypeLabel(secret.type)}</div>
            {/* Show description if available */}
            {secret.description && (
              <div className="text-xs text-gray-600 mt-1" data-testid={`secret-description-${secret.id}`}>{secret.description}</div>
            )}
            {/* Show secret value or masked value */}
            {isActive && showSecretValue && secretValue ? (
              <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-1 rounded" data-testid={`secret-value-${secret.id}`}>
                {secretValue}
              </div>
            ) : isActive && viewingSecret === secret.id ? (
              <div className="text-xs text-gray-500 mt-1" data-testid={`secret-loading-${secret.id}`}>Loading secret value...</div>
            ) : (
              <div className="text-xs text-gray-400 mt-1" data-testid={`secret-masked-${secret.id}`}>••••••••••••••••</div>
            )}
            {viewError && isActive && (
              <div className="text-xs text-red-600 mt-1" role="alert" data-testid={`secret-error-${secret.id}`}>{viewError}</div>
            )}
          </div>
          <button
            data-testid={`secret-toggle-${secret.id}`}
            onClick={() => handleSecretToggle(secret.id)}
            className="text-gray-500 hover:text-gray-700 p-2"
            aria-label={isActive ? "Collapse secret details" : "Expand secret details"}
          >
            <svg 
              className={`h-4 w-4 transform transition-transform ${isActive ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Rotation Controls for API Keys - only show when active */}
        {isActive && secret.type === 'api_key' && (
          <div className="mt-2 space-y-1" data-testid={`rotation-controls-${secret.id}`}>
            <div className="flex items-center gap-2">
              <label htmlFor={`rotation-enabled-${secret.id}`} className="text-xs mr-2">Rotation:</label>
              <input
                id={`rotation-enabled-${secret.id}`}
                data-testid="rotation-enabled-toggle"
                type="checkbox"
                checked={rotationEnabled}
                onChange={e => { setRotationEnabled(e.target.checked); setEditing(true); }}
                aria-checked={rotationEnabled}
                aria-label="Enable automatic rotation"
                disabled={saving}
              />
              <span data-testid="rotation-enabled" className={rotationEnabled ? 'text-green-700' : 'text-gray-400'}>{rotationEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {rotationEnabled && (
              <div className="flex items-center gap-2 mt-1">
                <label htmlFor={`rotation-interval-${secret.id}`} className="text-xs">Interval:</label>
                <input
                  id={`rotation-interval-${secret.id}`}
                  data-testid="rotation-interval-input"
                  type="number"
                  min={1}
                  value={rotationInterval}
                  onChange={e => { setRotationInterval(Number(e.target.value)); setEditing(true); }}
                  className="w-16 px-1 py-0.5 border rounded text-xs"
                  aria-label="Rotation interval in days"
                  disabled={saving}
                />
                <span className="text-xs">days</span>
              </div>
            )}
            <div data-testid="rotation-interval" className="text-xs">
              Interval: {secret.rotationInterval ? `${secret.rotationInterval} days` : 'N/A'}
            </div>
            <div data-testid="next-rotation" className="text-xs">
              Next Rotation: {secret.nextRotationAt ? new Date(secret.nextRotationAt).toLocaleDateString() : 'N/A'}
            </div>
            {editing && (
              <button
                data-testid="save-rotation-settings-btn"
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 min-h-[36px]"
                onClick={handleSaveRotationSettings}
                disabled={saving}
                aria-busy={saving}
                aria-label="Save rotation settings"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            {saveSuccess && (
              <div className="mt-2 text-xs text-green-700" role="status">{saveSuccess}</div>
            )}
            {saveError && (
              <div className="mt-2 text-xs text-red-700" role="alert">{saveError}</div>
            )}
            <button
              data-testid="rotate-now-btn"
              aria-label="Rotate now"
              className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[36px]"
              onClick={handleRotate}
              disabled={rotating || !rotationEnabled}
            >
              {rotating ? 'Rotating...' : 'Rotate Now'}
            </button>
            {rotating && (
              <div data-testid="rotation-progress" className="mt-2 text-xs text-blue-600" aria-live="polite">
                Rotating API key...
              </div>
            )}
            {rotationSuccess && (
              <div className="mt-2 text-xs text-green-700" role="status">{rotationSuccess}</div>
            )}
            {rotationError && (
              <div className="mt-2 text-xs text-red-700" role="alert">{rotationError}</div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <button
          data-testid={`secret-details-${secret.id}`}
          onClick={() => handleViewSecret(secret.id, secret.name)}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium min-h-[44px] px-3"
          aria-label={`View details for ${secret.name}`}
        >
          View
        </button>
        {isActive && !showSecretValue && (
          <button
            data-testid={`show-secret-value-${secret.id}`}
            onClick={() => fetchSecretValue()}
            className="text-green-600 hover:text-green-900 text-sm font-medium min-h-[44px] px-3"
            aria-label={`Show value for ${secret.name}`}
            disabled={viewingSecret === secret.id}
          >
            {viewingSecret === secret.id ? 'Loading...' : 'Show Value'}
          </button>
        )}
        {isActive && showSecretValue && (
          <button
            data-testid={`hide-secret-value-${secret.id}`}
            onClick={() => setShowSecretValue(false)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium min-h-[44px] px-3"
            aria-label={`Hide value for ${secret.name}`}
          >
            Hide Value
          </button>
        )}
        <button
          onClick={() => handleDeleteSecret(secret.id, secret.name)}
          className="text-red-600 hover:text-red-900 text-sm font-medium min-h-[44px] px-3"
          disabled={isLoading}
          aria-label={`Delete secret ${secret.name}`}
          aria-busy={isLoading}
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// Create Secret Modal Component
function CreateSecretModal({ 
  onClose, 
  onSuccess, 
  onError 
}: { 
  onClose: () => void; 
  onSuccess: (msg: string) => void; 
  onError: (error: string) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'all',
    value: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Focus management
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  const validateForm = (data = formData) => {
    const errors: {[key: string]: string} = {};
    if (!data.name.trim()) {
      errors.name = 'Name is required';
    } else if (!/^[a-zA-Z0-9\s_-]+$/.test(data.name)) {
      errors.name = 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    if (!data.value.trim()) {
      errors.value = 'Value is required';
    }
    if (!data.type || data.type === 'all') {
      errors.type = 'Please select a secret type';
    }
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length) {
      flushSync(() => setValidationErrors(errors));
      return;
    }
    setValidationErrors({});
    createSecret(formData);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({ ...formData, name: newName });
    
    // Clear name error if field becomes valid
    if (validationErrors.name && newName.trim() && /^[a-zA-Z0-9\s_-]+$/.test(newName)) {
      setValidationErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFormData({ ...formData, value: newValue });
    
    // Clear value error if field becomes valid
    if (validationErrors.value && newValue.trim()) {
      setValidationErrors(prev => ({ ...prev, value: '' }));
    }
  };

  const createSecret = async (data: typeof formData) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.createSecret({
        name: data.name,
        value: data.value,
        description: data.description,
        type: data.type.toLowerCase()
      });
      if (response.success) {
        onSuccess(response.data.message || 'Secret created successfully');
      } else {
        setErrorMsg(response.error || 'Failed to create secret');
        onError(response.error || 'Failed to create secret');
      }
    } catch (error: any) {
      if (error?.response?.status === 429 || error?.message?.toLowerCase().includes('rate limit')) {
        setErrorMsg('Rate limit exceeded. Please wait and try again.');
      } else {
        setErrorMsg(error?.message || 'Failed to create secret');
      }
      onError(error?.message || 'Failed to create secret');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 id="modal-title" className="text-lg font-medium text-gray-900 mb-4">Add New Secret</h3>
          {errorMsg && <AlertBanner>{errorMsg}</AlertBanner>}
          <form onSubmit={handleSubmit} aria-describedby="form-help" noValidate>
            <div id="form-help" className="sr-only">Form to create a new secret with name, description, type, and value</div>
            
            {/* Error summary block for all validation errors */}
            {Object.keys(validationErrors).length > 0 && (
              <div
                role="alert"
                aria-labelledby="error-summary-heading"
                className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"
                data-testid="validation-errors"
              >
                <h2 id="error-summary-heading" className="text-red-800 font-semibold">
                  Please fix the following errors:
                </h2>
                <ul className="list-disc list-inside mt-2 text-red-800">
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="secret-name" className="block text-sm font-medium text-gray-700" aria-required="true">
                  Name *
                </label>
                <input
                  id="secret-name"
                  data-testid="secret-name-input"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={validationErrors.name ? "true" : "false"}
                  aria-describedby={validationErrors.name ? "name-error" : undefined}
                  value={formData.name}
                  onChange={handleNameChange}
                  className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="e.g., GitHub API Key"
                  ref={nameInputRef}
                />
                {validationErrors.name && (
                  <div id="name-error" className="mt-1 text-sm">
                    {validationErrors.name}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="secret-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="secret-description"
                  data-testid="secret-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="secret-type" className="block text-sm font-medium text-gray-700" aria-required="true">
                  Type *
                </label>
                <SecretTypeSelect
                  options={[
                    { value: 'API_KEY', label: 'API Key' },
                    { value: 'BEARER_TOKEN', label: 'Bearer Token' },
                    { value: 'PASSWORD', label: 'Password' },
                    { value: 'SSH_KEY', label: 'SSH Key' },
                    { value: 'CERTIFICATE', label: 'Certificate' },
                    { value: 'OAUTH2_TOKEN', label: 'OAuth2 Token' },
                    { value: 'DATABASE_PASSWORD', label: 'Database Password' }
                  ]}
                  selected={formData.type === 'all' ? 'API_KEY' : formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value })}
                />
                {validationErrors.type && (
                  <div id="type-error" className="mt-1 text-sm">
                    {validationErrors.type}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="secret-value" className="block text-sm font-medium text-gray-700" aria-required="true">
                  Value *
                </label>
                <input
                  id="secret-value"
                  data-testid="secret-value-input"
                  type="password"
                  required
                  aria-required="true"
                  aria-invalid={validationErrors.value ? "true" : "false"}
                  aria-describedby={validationErrors.value ? "value-error" : undefined}
                  value={formData.value}
                  onChange={handleValueChange}
                  className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    validationErrors.value ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter the secret value"
                />
                {validationErrors.value && (
                  <div id="value-error" className="mt-1 text-sm">
                    {validationErrors.value}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                data-testid="submit-secret-btn"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  aria-describedby={isSubmitting ? "loading-description" : undefined}
                  className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg 
                        data-testid="loading-spinner"
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    <span data-testid="loading-text">Creating</span>
                    </>
                  ) : (
                    'Create Secret'
                  )}
                </button>
                {isSubmitting && (
                <div id="loading-description" className="sr-only">
                    Creating secret, please wait
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 