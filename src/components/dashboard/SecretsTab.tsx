/**
 * TODO: UX SIMPLIFICATION - SECRETS TAB PHASE 2.1 CHANGES - @connorbowen 2024-12-19
 * 
 * PHASE 2.1: Redesign dashboard layout with 3-tab structure
 * - [ ] MIGRATE: Move SecretsTab to Settings tab as a section
 * - [ ] Integrate with new SettingsTab component
 * - [ ] Maintain all existing functionality in new location
 * - [ ] Update navigation and routing for new structure
 * - [ ] Add tests: tests/unit/components/dashboard/SettingsTab.test.tsx
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test secrets in settings
 * 
 * PHASE 2.2: Progressive disclosure
 * - [ ] Hide secrets management for new users
 * - [ ] Progressive reveal based on user needs
 * - [ ] Show secrets only when workflows require them
 * - [ ] Add tests: tests/unit/components/ProgressiveDisclosure.test.tsx
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize secrets management for mobile screens
 * - [ ] Improve mobile form interactions for sensitive data
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile secrets
 * 
 * MIGRATION PLAN:
 * - Integrate into SettingsTab component
 * - Maintain existing security and encryption
 * - Update all navigation references
 * - Preserve audit logging functionality
 */

// TODO: [SECRETS-FIRST-REFACTOR] Phase 9: Secrets Tab Updates
// - Update secrets tab to show connection relationships
// - Add connection-specific secret management
// - Display secret rotation status for connections
// - Add secret creation during connection setup
// - Update secret testing to use connections
// - Add connection-secret relationship display

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [secretList, setSecretList] = useState(secrets || []);
  const [activeSecretId, setActiveSecretId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [focusedSecretId, setFocusedSecretId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const mainContentRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

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

  // Clear announcements after 3 seconds
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  // Sync local state with props - add defensive check
  useEffect(() => {
    setSecretList(secrets || []);
  }, [secrets]);

  // Load audit logs for secrets
  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      // Fetch SECRET_CREATED and SECRET_ACCESSED logs separately since the API doesn't support multiple actions
      const response = await fetch('/api/audit-logs?action=SECRET_CREATED&limit=3', {
        credentials: 'include' // Include cookies for authentication
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const createdLogs = result.data.auditLogs || [];
          
          // Also fetch SECRET_ACCESSED logs
          const accessResponse = await fetch('/api/audit-logs?action=SECRET_ACCESSED&limit=3', {
            credentials: 'include' // Include cookies for authentication
          });
          if (accessResponse.ok) {
            const accessResult = await accessResponse.json();
            if (accessResult.success) {
              const accessLogs = accessResult.data.auditLogs || [];
              // Combine and sort by date
              const allLogs = [...createdLogs, ...accessLogs].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              setAuditLogs(allLogs.slice(0, 5));
            } else {
              setAuditLogs(createdLogs);
            }
          } else {
            setAuditLogs(createdLogs);
          }
        } else {
          // Ensure audit log section is always visible even if API fails
          setAuditLogs([]);
        }
      } else {
        // Ensure audit log section is always visible even if API fails
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      // Ensure audit log section is always visible even if API fails
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Load audit logs on mount and when secrets change
  useEffect(() => {
    loadAuditLogs();
  }, []);

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
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="API Key icon" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      case 'BEARER_TOKEN':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Bearer Token icon" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'PASSWORD':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Password icon" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'OAUTH2_TOKEN':
        return (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="OAuth2 Token icon" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case 'DATABASE_PASSWORD':
        return (
          <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Database Password icon" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Default secret icon" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
    }
  };

  const handleDeleteSecret = async (secretId: string, secretName: string) => {
    if (!secretId || !secretName) {
      console.error('Cannot delete secret: missing id or name', { secretId, secretName });
      onSecretError('Invalid secret data for deletion');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the secret "${secretName}"? This action cannot be undone.`)) {
      try {
        setIsLoading(true);
        setAnnouncement('Deleting secret...');
        
        const response = await axios.delete(`/api/secrets/${encodeURIComponent(secretName)}`);
        
        if (response.data && response.data.success) {
          setAnnouncement(`Secret "${secretName}" deleted successfully`);
          setSecretList(prev => prev.filter(s => s.id !== secretId));
          onSecretCreated(); // Refresh the list
          loadAuditLogs(); // Refresh audit logs
        } else {
          throw new Error(response.data?.error || 'Failed to delete secret');
        }
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error || 'Failed to delete secret';
        setAnnouncement(`Error: ${errorMsg}`);
        onSecretError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRotateSecret = async (secretId: string, secretName: string) => {
    if (!secretId || !secretName) {
      console.error('Cannot rotate secret: missing id or name', { secretId, secretName });
      onSecretError('Invalid secret data for rotation');
      return;
    }
    
    if (confirm(`Are you sure you want to rotate the secret "${secretName}"? This will generate a new value.`)) {
      try {
        setIsLoading(true);
        setAnnouncement('Rotating secret...');
        
        const response = await axios.post(`/api/secrets/${encodeURIComponent(secretName)}/rotate`);
        
        if (response.data && response.data.success) {
          setAnnouncement(`Secret "${secretName}" rotated successfully`);
          onSecretCreated(); // Refresh the list
          loadAuditLogs(); // Refresh audit logs
        } else {
          throw new Error(response.data?.error || 'Failed to rotate secret');
        }
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error || 'Failed to rotate secret';
        setAnnouncement(`Error: ${errorMsg}`);
        onSecretError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleViewSecret = (secretId: string, secretName: string) => {
    if (!secretId || !secretName) {
      console.error('Cannot view secret: missing id or name', { secretId, secretName });
      onSecretError('Invalid secret data for viewing');
      return;
    }
    
    console.log(`Viewing secret: ${secretName} (ID: ${secretId})`);
    // Expand the secret to show details including rotation settings
    handleSecretToggle(secretId);
    setAnnouncement(`Viewing details for secret "${secretName}"`);
  };

  const filteredSecrets = (secretList || []).filter(secret => {
    // Defensive check: ensure secret has required properties
    if (!secret?.id || !secret?.name) {
      console.warn('Filtering out secret with missing id or name:', secret);
      return false;
    }
    
    const matchesSearch = secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         secret.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || secret.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSecretCreated = (message?: string, newSecret?: any) => {
    console.log('handleSecretCreated called with:', { message, newSecret });
    
    // Use flushSync to ensure immediate UI updates
    flushSync(() => {
      setSuccessMessage(message || 'Secret created successfully');
      
      // If we have the new secret data, add it to the local state immediately
      if (newSecret && newSecret.id) {
        console.log('Adding new secret to local state:', newSecret);
        
        // Ensure the secret has the correct type format for display
        const formattedSecret = {
          ...newSecret,
          type: newSecret.type?.toUpperCase() || 'API_KEY' // Normalize type to uppercase
        };

        setSecretList(prev => [formattedSecret, ...prev]);
        
        // Announce the new secret to screen readers
        setAnnouncement(`New secret "${formattedSecret.name}" created successfully`);
        
        // Focus the new secret card for better UX
        setFocusedSecretId(formattedSecret.id);
      }
    });
    
    // Ensure success message persists for at least 8 seconds to give tests time to see it
    setTimeout(() => {
      setSuccessMessage(null);
    }, 8000);
    
    // Call the parent callback to notify that a secret was created
    onSecretCreated();
    
    // Refresh audit logs to show the new secret creation
    loadAuditLogs();
    
    // Note: Modal will close automatically after 4 seconds via setTimeout in CreateSecretModal
  };

  const handleSecretError = (error: string) => {
    setErrorMessage(error);
    onSecretError(error);
    setAnnouncement(`Error: ${error}`);
  };

  const handleSecretRotated = (updatedSecret: any) => {
    if (!updatedSecret?.id) {
      console.error('Cannot update secret: missing id', updatedSecret);
      return;
    }
    
    setSecretList((prev: any[]) => prev.map(s => s.id === updatedSecret.id ? updatedSecret : s));
    setAnnouncement(`Secret "${updatedSecret.name}" updated successfully`);
  };

  const handleSecretToggle = async (secretId: string) => {
    if (!secretId) {
      console.error('Cannot toggle secret: missing id', secretId);
      return;
    }
    
    const isExpanding = activeSecretId !== secretId;
    setActiveSecretId(id => (id === secretId ? null : secretId));
    
    // Announce the action to screen readers
    const secret = secretList.find(s => s.id === secretId);
    if (secret) {
      setAnnouncement(isExpanding ? `Expanded details for ${secret.name}` : `Collapsed details for ${secret.name}`);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowCreateForm(false);
      setActiveSecretId(null);
      setAnnouncement('Modal closed');
    }
  }, []);

  return (
    <div 
      data-testid="secrets-management" 
      role="region" 
      aria-labelledby="secrets-heading"
      onKeyDown={handleKeyDown}
      className="focus:outline-none"
    >
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        data-testid="skip-link"
      >
        Skip to main content
      </a>
      
      {/* ARIA live region for announcements */}
      <div 
        id="aria-live-announcements" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
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
          data-testid="success-message"
          role="alert" 
          aria-live="polite"
          className="mb-4 bg-green-50 border border-green-200 rounded-md p-4"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div 
          data-testid="error-message"
          role="alert" 
          aria-live="assertive"
          className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="mb-6 space-y-4">
        {/* Primary Action Button */}
        <div className="flex justify-between items-center">
          <button
            ref={createButtonRef}
            data-testid="primary-action create-secret-btn"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] focus:visible focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
            aria-describedby="create-secret-help"
            aria-label="Create a new secret"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Secret
          </button>
          <div id="create-secret-help" className="sr-only">Create a new encrypted secret for storing sensitive credentials</div>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="secret-search-input" className="block text-sm font-medium text-gray-700 mb-1">
              Search secrets
            </label>
            <input
              id="secret-search-input"
              data-testid="secret-search-input"
              type="text"
              placeholder="Search secrets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:border-indigo-500 min-h-[44px] min-w-[200px] transition-colors duration-200"
              aria-describedby="search-help"
              aria-label="Search secrets by name or description"
              style={{ outline: 'none' }}
            />
            <div id="search-help" className="sr-only">Search through your secrets by name or description</div>
          </div>
          
          <div>
            <label htmlFor="secret-filter-select" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by type
            </label>
            <select
              id="secret-filter-select"
              data-testid="secret-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:border-indigo-500 min-h-[44px] min-w-[200px] transition-colors duration-200"
              aria-describedby="filter-help"
              aria-label="Filter secrets by type"
              style={{ outline: 'none' }}
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
            <div id="filter-help" className="sr-only">Filter secrets by their type</div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md" role="region" aria-label="Security information">
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

      {/* Audit Log Section - Always visible */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
        <div 
          data-testid="audit-log"
          className="bg-white border border-gray-200 rounded-md p-4"
          role="region"
          aria-label="Recent secret activity"
        >
          {auditLoading ? (
            <div className="text-sm text-gray-600" aria-live="polite">
              <p>Loading recent activity...</p>
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="space-y-2">
              {auditLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="text-sm text-gray-600 border-b border-gray-100 pb-2 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-800">
                      {log.action === 'SECRET_CREATED' ? 'Secret created' : 
                       log.action === 'SECRET_ACCESSED' ? 'Secret accessed' : 
                       log.action === 'SECRET_DELETED' ? 'Secret deleted' : 
                       log.action === 'SECRET_ROTATED' ? 'Secret rotated' : log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {log.details?.secretName && (
                    <div className="text-xs text-gray-600 mt-1">
                      {log.details.secretName}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-2">
                <a href="/dashboard?tab=audit" className="text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded">
                  View all audit logs →
                </a>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              <p>No recent activity. Secret operations will appear here.</p>
              <p className="mt-1">View detailed audit logs in the Audit tab.</p>
            </div>
          )}
        </div>
      </div>

      {/* Secrets List */}
      <div 
        ref={mainContentRef}
        id="main-content" 
        role="main"
        tabIndex={0}
        className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md focus:visible transition-all duration-200"
        style={{ outline: 'none' }}
        onFocus={(e) => {
          // Ensure focus is visible
          e.currentTarget.style.outline = '2px solid #6366f1';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          // Remove focus outline when not focused
          e.currentTarget.style.outline = 'none';
        }}
      >
        {filteredSecrets.length === 0 ? (
          <div className="text-center py-12" role="status" aria-live="polite">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] transition-colors duration-200"
                  aria-label="Create your first secret"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Secret
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4" role="list" aria-label="Secrets list">
            {filteredSecrets.map((secret) => (
              secret && secret.id ? (
                <div key={secret.id} role="listitem">
                  <SecretCard
                    secret={secret}
                    onRotated={handleSecretRotated}
                    handleDeleteSecret={handleDeleteSecret}
                    handleRotateSecret={handleRotateSecret}
                    isLoading={isLoading}
                    activeSecretId={activeSecretId}
                    handleSecretToggle={handleSecretToggle}
                    isFocused={focusedSecretId === secret.id}
                    onFocus={() => setFocusedSecretId(secret.id)}
                    onBlur={() => setFocusedSecretId(null)}
                  />
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>

      {/* Create Secret Modal */}
      {showCreateForm && (
        <CreateSecretModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleSecretCreated}
          onError={handleSecretError}
        />
      )}
    </div>
  );
}

function SecretCard({ secret, onRotated, handleDeleteSecret, handleRotateSecret, isLoading, activeSecretId, handleSecretToggle, isFocused, onFocus, onBlur }: { 
  secret: { id: string; name: string; type: string; description?: string; rotationEnabled?: boolean; rotationInterval?: number; nextRotationAt?: string; [key: string]: any },
  onRotated: (updated: any) => void, 
  handleDeleteSecret: (id: string, name: string) => void, 
  handleRotateSecret: (id: string, name: string) => void,
  isLoading: boolean,
  activeSecretId: string | null,
  handleSecretToggle: (secretId: string) => void,
  isFocused: boolean,
  onFocus: () => void,
  onBlur: () => void
}) {
  // 1️⃣ constants derived from props
  const secretId = secret.id;
  const isActive = activeSecretId === secretId;

  // 2️⃣ hooks -- always run, no conditionals above
  const [rotating, setRotating] = useState(false);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [rotationSuccess, setRotationSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rotationEnabled, setRotationEnabled] = useState(!!secret.rotationEnabled);
  const [rotationInterval, setRotationInterval] = useState<number>(secret.rotationInterval || 30);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewingSecret, setViewingSecret] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [showSecretValue, setShowSecretValue] = useState(false);
  useEffect(() => {
    if (!isActive) {
      setShowSecretValue(false);
    }
  }, [isActive]);

  // 3️⃣ early return guard
  // Removed early return guard as secret is now required

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

  const handleRotate = async () => {
    if (!secret.id || !secret.name) {
      console.error('Cannot rotate secret: missing id or name', secret);
      return;
    }
    
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
    if (!secret.id || !secret.name) {
      console.error('Cannot save rotation settings: missing id or name', secret);
      return;
    }
    
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

  // Reset showSecretValue when secret is collapsed
  useEffect(() => {
    if (!isActive) {
      setShowSecretValue(false);
    }
  }, [isActive]);

  // Fetch secret value only when explicitly requested
  const fetchSecretValue = async () => {
    if (!secret.id || !secret.name) {
      console.error('Cannot fetch secret value: missing id or name', secret);
      return;
    }
    
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
        },
        credentials: 'include', // Include cookies for authentication
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
    if (!secretId || !secretName) {
      console.error('Cannot view secret: missing id or name', { secretId, secretName });
      return;
    }
    
    console.log(`Viewing secret: ${secretName} (ID: ${secretId})`);
    // Expand the secret to show details including rotation settings
    handleSecretToggle(secretId);
    // Don't automatically fetch the secret value - keep it masked by default
  };

  return (
    <div 
      data-testid="secret-card" 
      className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-md bg-white shadow-sm transition-all duration-200 ${
        isFocused ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2' : 'border-gray-200'
      }`}
      role="article"
      aria-label={`Secret: ${secret.name}`}
      aria-expanded={isActive}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={isFocused ? 0 : -1}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold" data-testid={`secret-name-${secret.id}`}>{secret.name}</div>
            <div className="text-xs text-gray-500" data-testid={`secret-type-${secret.id}`}>
              {getSecretTypeLabel(secret.type)}
            </div>
            {/* Show description if available */}
            {secret.description && (
              <div className="text-xs text-gray-600 mt-1" data-testid={`secret-description-${secret.id}`}>
                {secret.description}
              </div>
            )}
            {/* Show secret value or masked value */}
            {isActive && showSecretValue && secretValue ? (
              <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-1 rounded" data-testid={`secret-value-${secret.id}`}>
                {secretValue}
              </div>
            ) : isActive && viewingSecret === secret.id ? (
              <div className="text-xs text-gray-500 mt-1" data-testid={`secret-loading-${secret.id}`} aria-live="polite">
                Loading secret value...
              </div>
            ) : (
              <div className="text-xs text-gray-400 mt-1" data-testid={`secret-masked-${secret.id}`}>
                ••••••••••••••••
              </div>
            )}
            {viewError && isActive && (
              <div className="text-xs text-red-600 mt-1" role="alert" data-testid={`secret-error-${secret.id}`}>
                {viewError}
              </div>
            )}
          </div>
          <button
            data-testid={`secret-toggle-${secret.id}`}
            onClick={() => handleSecretToggle(secret.id)}
            className="text-gray-500 hover:text-gray-700 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded transition-colors duration-200"
            aria-label={isActive ? "Collapse secret details" : "Expand secret details"}
            aria-expanded={isActive}
            aria-controls={`secret-details-${secret.id}`}
          >
            <svg 
              className={`h-4 w-4 transform transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Rotation Controls for API Keys - only show when active */}
        {isActive && secret.type?.toUpperCase() === 'API_KEY' && (
          <div 
            id={`secret-details-${secret.id}`}
            className="mt-2 space-y-1" 
            data-testid={`rotation-controls-${secret.id}`}
            role="region"
            aria-label="Rotation settings"
          >
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
                className="focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              />
              <span data-testid="rotation-enabled" className={rotationEnabled ? 'text-green-700' : 'text-gray-400'}>
                {rotationEnabled ? 'Enabled' : 'Disabled'}
              </span>
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
                  className="w-16 px-1 py-0.5 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
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
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 min-h-[36px] transition-colors duration-200"
                onClick={handleSaveRotationSettings}
                disabled={saving}
                aria-busy={saving}
                aria-label="Save rotation settings"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            {saveSuccess && (
              <div className="mt-2 text-xs text-green-700" role="status" aria-live="polite">
                {saveSuccess}
              </div>
            )}
            {saveError && (
              <div className="mt-2 text-xs text-red-700" role="alert" aria-live="assertive">
                {saveError}
              </div>
            )}
            <button
              data-testid="rotate-now-btn"
              aria-label="Rotate now"
              className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 min-h-[36px] transition-colors duration-200"
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
              <div className="mt-2 text-xs text-green-700" role="status" aria-live="polite">
                {rotationSuccess}
              </div>
            )}
            {rotationError && (
              <div className="mt-2 text-xs text-red-700" role="alert" aria-live="assertive">
                {rotationError}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2 mt-4 md:mt-0">
        <button
          data-testid={`secret-details-${secret.id || 'unknown'}`}
          onClick={() => handleViewSecret(secret.id, secret.name)}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium min-h-[44px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded transition-colors duration-200"
          aria-label={`View details for ${secret.name}`}
        >
          View
        </button>
        {isActive && !showSecretValue && (
          <button
            data-testid={`show-secret-value-${secret.id || 'unknown'}`}
            onClick={() => fetchSecretValue()}
            className="text-green-600 hover:text-green-900 text-sm font-medium min-h-[44px] px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded transition-colors duration-200"
            aria-label={`Show value for ${secret.name}`}
            disabled={viewingSecret === secret.id}
          >
            {viewingSecret === secret.id ? 'Loading...' : 'Show Value'}
          </button>
        )}
        {isActive && showSecretValue && (
          <button
            data-testid={`hide-secret-value-${secret.id || 'unknown'}`}
            onClick={() => setShowSecretValue(false)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium min-h-[44px] px-3 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded transition-colors duration-200"
            aria-label={`Hide value for ${secret.name}`}
          >
            Hide Value
          </button>
        )}
        <button
          onClick={() => handleRotateSecret(secret.id, secret.name)}
          className="text-orange-600 hover:text-orange-900 text-sm font-medium min-h-[44px] px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded transition-colors duration-200"
          disabled={isLoading}
          aria-label={`Rotate secret ${secret.name}`}
          aria-busy={isLoading}
        >
          {isLoading ? 'Rotating...' : 'Rotate'}
        </button>
        <button
          onClick={() => handleDeleteSecret(secret.id, secret.name)}
          className="text-red-600 hover:text-red-900 text-sm font-medium min-h-[44px] px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded transition-colors duration-200"
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
  onSuccess: (msg: string, secret?: any) => void; 
  onError: (error: string) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'API_KEY',
    value: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

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

  // Focus trap for modal
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableRef.current) {
            e.preventDefault();
            lastFocusableRef.current?.focus();
          }
        } else {
          if (document.activeElement === lastFocusableRef.current) {
            e.preventDefault();
            firstFocusableRef.current?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  const validateForm = (data = formData) => {
    const errors: {[key: string]: string} = {};
    if (!data.name.trim()) {
      errors.name = 'Please enter a secret name';
    } else if (!/^[a-zA-Z0-9\s_-]+$/.test(data.name)) {
      errors.name = 'Please use only letters, numbers, spaces, hyphens, and underscores';
    }
    if (!data.value.trim()) {
      errors.value = 'Please enter a secret value';
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
      // Focus the first field with an error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField === 'name' && nameInputRef.current) {
        nameInputRef.current.focus();
      }
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
    setSuccessMsg(null);
    try {
      console.log('Creating secret with data:', { name: data.name, type: data.type, hasValue: !!data.value });
      const requestData = {
        name: data.name,
        value: data.value,
        description: data.description,
        type: data.type.toLowerCase()
      };
      console.log('Sending request to API:', requestData);
      // Enforce minimum loading state duration
      const minLoadingMs = 800;
      const start = Date.now();
      const response = await apiClient.createSecret(requestData);
      const elapsed = Date.now() - start;
      if (elapsed < minLoadingMs) {
        await new Promise(res => setTimeout(res, minLoadingMs - elapsed));
      }
      console.log('API response:', response);
      if (response.success) {
        console.log('Secret created successfully, setting success message');
        console.log('Response data:', response.data);
        console.log('Secret object from response:', response.data.secret);
        // Set success message in modal first
        setSuccessMsg(response.data.message || 'Secret created successfully');
        // Pass the created secret data back to the parent
        if (response.data.secret) {
          console.log('Calling onSuccess with secret data:', response.data.secret);
          onSuccess(response.data.message || 'Secret created successfully', response.data.secret);
        } else {
          console.log('No secret data in response, calling onSuccess without secret');
          onSuccess(response.data.message || 'Secret created successfully');
        }
        // Close modal after a longer delay to ensure success message is visible
        setTimeout(() => {
          onClose();
        }, 4000); // Increased from 2000ms to 4000ms to ensure success message is visible
      } else {
        console.error('API returned error:', response.error);
        setErrorMsg(response.error || 'Failed to create secret');
        onError(response.error || 'Failed to create secret');
      }
    } catch (error: any) {
      console.error('Exception in createSecret:', error);
      if (error?.response?.status === 429 || error?.message?.toLowerCase().includes('rate limit')) {
        const rateLimitMsg = 'Rate limit exceeded. Please wait and try again.';
        setErrorMsg(rateLimitMsg);
        onError(rateLimitMsg);
      } else if (error?.response?.status === 400) {
        // Handle API validation errors (like empty secret value)
        const apiErrorMsg = error.response.data?.error || 'Validation error occurred.';
        setErrorMsg(apiErrorMsg);
        onError(apiErrorMsg);
      } else {
        const errorMsg = error?.message || 'Failed to create secret';
        setErrorMsg(errorMsg);
        onError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      ref={modalRef} 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-md">
        <div className="mt-3">
          <h3 id="modal-title" className="text-lg font-medium text-gray-900 mb-4">Add New Secret</h3>
          <p id="modal-description" className="sr-only">Create a new encrypted secret for storing sensitive credentials</p>
          
          {errorMsg && (
            <div 
              data-testid="alert-banner"
              role="alert" 
              aria-live="assertive"
              className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errorMsg}</p>
                </div>
              </div>
            </div>
          )}
          {successMsg && (
            <div 
              data-testid="success-message"
              role="alert" 
              aria-live="polite"
              className="mb-4 bg-green-50 border border-green-200 rounded-md p-4"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMsg}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Validation Errors Container */}
            {Object.keys(validationErrors).length > 0 && (
              <div 
                data-testid="validation-errors"
                role="alert" 
                aria-live="assertive"
                className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {Object.entries(validationErrors).map(([field, error]) => (
                          <li key={field}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="secret-name" className="block text-sm font-medium text-gray-700 mb-1">
                Secret Name <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="secret-name"
                data-testid="secret-name-input"
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter secret name"
                aria-required="true"
                aria-invalid={!!validationErrors.name}
                aria-describedby={validationErrors.name ? 'name-error' : 'name-help'}
                autoComplete="off"
                style={{ outline: 'none' }}
              />
              {validationErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.name}
                </p>
              )}
              <p id="name-help" className="mt-1 text-sm text-gray-500 sr-only">
                Enter a name for your secret using only letters, numbers, spaces, hyphens, and underscores
              </p>
            </div>

            <div>
              <label htmlFor="secret-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="secret-description"
                data-testid="secret-description-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                placeholder="Enter description (optional)"
                rows={3}
                aria-describedby="description-help"
                style={{ outline: 'none' }}
              />
              <p id="description-help" className="mt-1 text-sm text-gray-500">
                Optional description to help identify this secret
              </p>
            </div>

            <div>
              <label htmlFor="secret-type" className="block text-sm font-medium text-gray-700 mb-1">
                Secret Type <span className="text-red-500" aria-label="required">*</span>
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
                onChange={(type) => setFormData({ ...formData, type })}
                aria-describedby={validationErrors.type ? 'type-error' : 'type-help'}
                disabled={isSubmitting}
              />
              {validationErrors.type && (
                <p id="type-error" className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.type}
                </p>
              )}
              <p id="type-help" className="mt-1 text-sm text-gray-500 sr-only">
                Select the type of secret you want to create
              </p>
            </div>

            <div>
              <label htmlFor="secret-value" className="block text-sm font-medium text-gray-700 mb-1">
                Secret Value <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="secret-value"
                data-testid="secret-value-input"
                type="password"
                value={formData.value}
                onChange={handleValueChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 ${
                  validationErrors.value ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter secret value"
                aria-required="true"
                aria-invalid={!!validationErrors.value}
                aria-describedby={validationErrors.value ? 'value-error' : 'value-help'}
                autoComplete="new-password"
                style={{ outline: 'none' }}
              />
              {validationErrors.value && (
                <p id="value-error" className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.value}
                </p>
              )}
              <p id="value-help" className="mt-1 text-sm text-gray-500 sr-only">
                Enter the secret value that will be encrypted and stored securely
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                ref={firstFocusableRef}
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                aria-label="Cancel secret creation"
              >
                Cancel
              </button>
              <button
                ref={lastFocusableRef}
                type="submit"
                data-testid="primary-action create-secret-btn-modal"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors duration-200"
                aria-label={isSubmitting ? "Creating secret..." : "Create secret"}
                aria-describedby={isSubmitting ? "submitting-status" : undefined}
              >
                {isSubmitting ? 'Creating...' : 'Create Secret'}
              </button>
              {isSubmitting && (
                <div id="submitting-status" className="sr-only" aria-live="polite">
                  Creating secret, please wait...
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 