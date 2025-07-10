'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiConnection, CreateConnectionRequest } from '../../lib/api/client';
import ChatInterface from '../../components/ChatInterface';
import OverviewTab from '../../components/dashboard/OverviewTab';
import ConnectionsTab from '../../components/dashboard/ConnectionsTab';
import WorkflowsTab from '../../components/dashboard/WorkflowsTab';
import SecretsTab from '../../components/dashboard/SecretsTab';
import AdminTab from '../../components/dashboard/AdminTab';
import AuditTab from '../../components/dashboard/AuditTab';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'workflows' | 'secrets' | 'chat' | 'admin' | 'audit'>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0); // Trigger for audit log refresh
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      setIsLoading(false); // Stop loading before redirect
      router.push('/login');
      return;
    }
    
    const loadUser = async () => {
      try {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success) {
          setUser(userResponse.data.user);
          setIsLoading(false);
        } else {
          setIsLoading(false); // Stop loading before redirect
          router.push('/login');
        }
      } catch (error: unknown) {
        console.error('Failed to load user:', error);
        setIsLoading(false); // Stop loading before redirect
        router.push('/login');
      }
    };
    
    loadUser();
  }, [router]);

  const loadConnections = useCallback(async () => {
    try {
      console.log('Loading connections...');
      const response = await apiClient.getConnections();
      console.log('Connections API response:', response);
      if (response.success && response.data) {
        console.log('Setting connections:', response.data.connections);
        setConnections(response.data.connections || []);
      } else {
        console.error('Failed to load connections:', response.error);
        setErrorMessage(response.error || 'Failed to load connections');
      }
    } catch (error: unknown) {
      console.error('Error loading connections:', error);
      setErrorMessage('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      const response = await apiClient.getWorkflows();
      if (response.success && response.data) {
        setWorkflows(response.data.workflows || []);
      } else {
        console.error('Failed to load workflows:', response.error);
      }
    } catch (error: unknown) {
      console.error('Error loading workflows:', error);
    }
  }, []);

  const loadSecrets = useCallback(async () => {
    try {
      const response = await apiClient.getSecrets();
      if (response.success && response.data) {
        setSecrets(response.data.secrets || []);
      } else {
        console.error('Failed to load secrets:', response.error);
      }
    } catch (error: unknown) {
      console.error('Error loading secrets:', error);
    }
  }, []);

  // Function to trigger audit log refresh
  const triggerAuditRefresh = useCallback(() => {
    setAuditRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle OAuth2 success messages from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const connectionId = urlParams.get('connection_id');
    
    if (oauthSuccess === 'true') {
      setSuccessMessage('OAuth2 authorization completed successfully!');
      
      // Reload connections to show updated status
      loadConnections();
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('oauth_success');
      newUrl.searchParams.delete('connection_id');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [loadConnections]);

  const handleOAuth2Callback = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauth2Success = urlParams.get('oauth2_success');
    if (oauth2Success === 'true') {
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');
      const userData = urlParams.get('user');
      if (accessToken && refreshToken && userData) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', userData);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('oauth2_success');
        newUrl.searchParams.delete('accessToken');
        newUrl.searchParams.delete('refreshToken');
        newUrl.searchParams.delete('user');
        window.history.replaceState({}, '', newUrl.toString());
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadConnections();
    loadWorkflows();
    loadSecrets();
    handleOAuth2Callback();
  }, [loadConnections, loadWorkflows, loadSecrets, handleOAuth2Callback]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConnections();
      loadWorkflows();
      loadSecrets();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadConnections, loadWorkflows, loadSecrets]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleWorkflowGenerated = (workflow: any, steps: any[]) => {
    // Handle workflow generation - could save to database or show success message
    console.log('Workflow generated:', workflow, steps);
  };

  const handleTabChange = (tab: 'overview' | 'connections' | 'workflows' | 'secrets' | 'chat' | 'admin' | 'audit') => {
    console.log('Tab change requested:', tab, 'Current active tab:', activeTab);
    setActiveTab(tab);
    // Update URL to reflect the active tab
    const url = new URL(window.location.href);
    if (tab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
    console.log('URL updated to:', url.toString());
    // Clear any existing messages when switching tabs
    setSuccessMessage(null);
    setErrorMessage(null);
    
    // Trigger audit log refresh when switching to audit tab
    if (tab === 'audit') {
      triggerAuditRefresh();
    }
  };

  // Initialize tab from URL on component mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const tabParam = url.searchParams.get('tab');
    if (tabParam && ['overview', 'connections', 'workflows', 'secrets', 'chat', 'admin', 'audit'].includes(tabParam)) {
      setActiveTab(tabParam as 'overview' | 'connections' | 'workflows' | 'secrets' | 'chat' | 'admin' | 'audit');
    }
  }, []);

  // Announce success messages to screen readers and auto-clear
  useEffect(() => {
    if (successMessage) {
      const liveRegion = document.getElementById('aria-live-announcements');
      if (liveRegion) {
        liveRegion.textContent = successMessage;
        // Clear after announcement
        setTimeout(() => {
          liveRegion.textContent = '';
        }, 1000);
      }
      
      // Auto-clear success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Announce error messages to screen readers and auto-clear
  useEffect(() => {
    if (errorMessage) {
      const liveRegion = document.getElementById('aria-live-announcements');
      if (liveRegion) {
        liveRegion.textContent = errorMessage;
        // Clear after announcement
        setTimeout(() => {
          liveRegion.textContent = '';
        }, 1000);
      }
      
      // Auto-clear error message after 8 seconds (longer than success)
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <main role="main" className="min-h-screen bg-gray-50">

      
      {/* Skip link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-md z-50 min-w-[44px] min-h-[44px]">
        Skip to main content
      </a>
      
      {/* Additional skip links for better accessibility */}
      <a href="#workflows-section" className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-md z-50 min-w-[44px] min-h-[44px]">
        Skip to workflows
      </a>
      <a href="#admin-section" className="sr-only focus:not-sr-only focus:absolute focus:top-28 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-md z-50 min-w-[44px] min-h-[44px]">
        Skip to admin
      </a>
      
      <header role="banner" className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            {user && <span className="text-gray-700">Welcome, {user.name}</span>}
            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Success and Error Messages */}
        {successMessage && (
          <div data-testid="success-message" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div data-testid="error-message" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
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

        {/* Breadcrumb Navigation */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link 
                href="/dashboard" 
                className="text-indigo-600 hover:text-indigo-800 min-h-[44px] min-w-[44px] flex items-center"
                data-testid="breadcrumb-dashboard"
              >
                Dashboard
              </Link>
            </li>
            {activeTab !== 'overview' && (
              <>
                <li>
                  <span className="text-gray-400">/</span>
                </li>
                <li>
                  <span className="text-gray-900 capitalize" data-testid={`breadcrumb-${activeTab}`}>
                    {activeTab}
                  </span>
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* Mobile Menu Toggle */}
        <div className="mb-6 lg:hidden">
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" data-testid="mobile-menu" className="mb-6 lg:hidden bg-white border border-gray-300 rounded-md shadow-sm">
            <nav className="flex flex-col p-1" aria-label="Mobile Tabs">
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'overview' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('overview');
                  setIsMobileMenuOpen(false);
                }}
              >
                Overview
              </button>
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'connections' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('connections');
                  setIsMobileMenuOpen(false);
                }}
              >
                API Connections
              </button>
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'workflows' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('workflows');
                  setIsMobileMenuOpen(false);
                }}
              >
                Workflows
              </button>
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'secrets' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('secrets');
                  setIsMobileMenuOpen(false);
                }}
              >
                Secrets
              </button>
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'admin' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('admin');
                  setIsMobileMenuOpen(false);
                }}
              >
                Admin
              </button>
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'audit' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('audit');
                  setIsMobileMenuOpen(false);
                }}
              >
                Audit
              </button>
              <button
                className={`px-4 py-2 text-left font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === 'chat' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('chat');
                  setIsMobileMenuOpen(false);
                }}
              >
                Chat
              </button>
            </nav>
          </div>
        )}

        {/* Desktop Tab Navigation */}
        <div className="mb-6 hidden lg:block">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm" aria-label="Tabs">
            <button
              data-testid="tab-overview"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                activeTab === 'overview' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </button>
            <button
              data-testid="tab-connections"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                activeTab === 'connections' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('connections')}
            >
              API Connections
            </button>
            <button
              data-testid="tab-workflows"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                activeTab === 'workflows' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('workflows')}
            >
              Workflows
            </button>
            <button
              data-testid="tab-secrets"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                activeTab === 'secrets' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('secrets')}
            >
              Secrets
            </button>
            <button
              data-testid="tab-admin"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
                activeTab === 'admin' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('admin')}
            >
              Admin
            </button>
            <button
              data-testid="tab-audit"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
                activeTab === 'audit' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('audit')}
            >
              Audit
            </button>
            <button
              data-testid="tab-chat"
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('chat')}
            >
              Chat
            </button>
          </nav>
        </div>



        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" data-testid="error-message" aria-live="polite">
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

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <OverviewTab 
              connections={connections}
              workflows={workflows}
              secrets={secrets}
              user={user}
            />
          )}
          {activeTab === 'connections' && (
            <ConnectionsTab
              connections={connections}
              onConnectionCreated={() => {
                loadConnections();
                setSuccessMessage('Connection created successfully!');
              }}
              onConnectionEdited={() => {
                loadConnections();
                setSuccessMessage('Connection updated successfully');
              }}
              onConnectionDeleted={() => {
                loadConnections();
                setSuccessMessage('Connection deleted successfully');
              }}
              onConnectionTested={() => {
                setSuccessMessage('Connection test passed');
              }}
              onConnectionError={(error) => {
                setErrorMessage(error);
              }}
            />
          )}
          {activeTab === 'workflows' && (
            <div id="workflows-section">
              <WorkflowsTab
                workflows={workflows}
                onWorkflowCreated={() => {
                  loadWorkflows();
                  setSuccessMessage('Workflow created successfully!');
                }}
                onWorkflowError={(error) => {
                  setErrorMessage(error);
                }}
              />
            </div>
          )}
          {activeTab === 'secrets' && (
            <SecretsTab
              secrets={secrets}
              onSecretCreated={() => {
                loadSecrets();
                triggerAuditRefresh(); // Trigger audit log refresh after secret operations
                setSuccessMessage('Secret created successfully!');
              }}
              onSecretError={(error) => {
                setErrorMessage(error);
              }}
            />
          )}
          {activeTab === 'admin' && (
            <div id="admin-section">
              <AdminTab user={user} />
            </div>
          )}
          {activeTab === 'audit' && (
            <AuditTab refreshTrigger={auditRefreshTrigger} />
          )}
          {activeTab === 'chat' && (
            <ChatInterface onWorkflowGenerated={handleWorkflowGenerated} />
          )}
        </div>
      </section>
    </main>
  );
}

// Create Connection Modal Component
function CreateConnectionModal({ onClose, onSuccess, onError }: { onClose: () => void; onSuccess: () => void; onError: (error: string) => void }) {
  const [formData, setFormData] = useState<CreateConnectionRequest>({
    name: '',
    description: '',
    baseUrl: '',
    authType: 'API_KEY',
    authConfig: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOpenApiImport, setShowOpenApiImport] = useState(false);
  const [showOAuth2Setup, setShowOAuth2Setup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Submitting connection data:', formData);
      const response = await apiClient.createConnection(formData);
      console.log('API response:', response);
      if (response.success) {
        console.log('Connection created successfully');
        onSuccess();
      } else {
        console.error('Failed to create connection:', response.error);
        onError(response.error || 'Failed to create connection');
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      onError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If showing OpenAPI import, render that form
  if (showOpenApiImport) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import from OpenAPI</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">OpenAPI URL</label>
                <input
                  type="url"
                  name="openApiUrl"
                  data-testid="openapi-url-input"
                  required
                  placeholder="https://api.example.com/swagger.json"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  data-testid="connection-name-input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {!formData.name && (
                  <div data-testid="name-error" className="mt-1 text-sm text-red-600">
                    Name is required
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  name="description"
                  data-testid="connection-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOpenApiImport(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Import API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // If showing OAuth2 setup, render that form
  if (showOAuth2Setup) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">OAuth2 Setup</h3>
            <div className="space-y-4">
              <div data-testid="oauth2-config">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                  <select
                    data-testid="provider-select"
                    value={formData.authConfig?.provider || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authType: 'OAUTH2', 
                      authConfig: { ...formData.authConfig, provider: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Provider</option>
                    <option value="google">Google</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <button
                    type="button"
                    data-testid="google-provider-btn"
                    onClick={() => setFormData({ ...formData, authType: 'OAUTH2', authConfig: { ...formData.authConfig, provider: 'google' } })}
                    className="p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
                  >
                    <div className="font-medium">Google</div>
                    <div className="text-sm text-gray-500">Connect to Google APIs</div>
                  </button>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOAuth2Setup(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add API Connection</h3>
          
          {/* Connection Type Selection */}
          <div className="mb-4 space-y-2">
            <button
              type="button"
              data-testid="import-openapi-btn"
              onClick={() => setShowOpenApiImport(true)}
              className="w-full p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
            >
              <div className="font-medium">Import from OpenAPI/Swagger</div>
              <div className="text-sm text-gray-500">Import API from OpenAPI specification</div>
            </button>
            <button
              type="button"
              data-testid="oauth2-auth-btn"
              onClick={() => setShowOAuth2Setup(true)}
              className="w-full p-3 border border-gray-300 rounded-md text-left hover:bg-gray-50"
            >
              <div className="font-medium">OAuth2 Authentication</div>
              <div className="text-sm text-gray-500">Connect using OAuth2 providers</div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                data-testid="connection-name-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {!formData.name && (
                <div data-testid="name-error" className="mt-1 text-sm text-red-600">
                  Name is required
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                name="description"
                data-testid="connection-description-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="url"
                name="baseUrl"
                data-testid="connection-baseurl-input"
                required
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {!formData.baseUrl && (
                <div data-testid="baseUrl-error" className="mt-1 text-sm text-red-600">
                  Base URL is required
                </div>
              )}
              {formData.baseUrl && !formData.baseUrl.match(/^https?:\/\/.+/) && (
                <div data-testid="baseUrl-error" className="mt-1 text-sm text-red-600">
                  Invalid URL format
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Authentication Type</label>
              <select
                name="authType"
                data-testid="connection-authtype-select"
                value={formData.authType}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="API_KEY">API Key</option>
                <option value="BEARER_TOKEN">Bearer Token</option>
                <option value="BASIC_AUTH">Basic Auth</option>
                <option value="OAUTH2">OAuth2</option>
                <option value="NONE">None</option>
              </select>
            </div>

            {/* Conditional fields based on auth type */}
            {formData.authType === 'API_KEY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  name="apiKey"
                  data-testid="connection-apikey-input"
                  required
                  value={formData.authConfig?.apiKey || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    authConfig: { ...formData.authConfig, apiKey: e.target.value }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {formData.authType === 'BEARER_TOKEN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Bearer Token</label>
                <input
                  type="password"
                  name="bearerToken"
                  data-testid="connection-bearertoken-input"
                  required
                  value={formData.authConfig?.bearerToken || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    authConfig: { ...formData.authConfig, bearerToken: e.target.value }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {formData.authType === 'BASIC_AUTH' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    name="username"
                    data-testid="connection-username-input"
                    required
                    value={formData.authConfig?.username || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, username: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    data-testid="connection-password-input"
                    required
                    value={formData.authConfig?.password || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, password: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {formData.authType === 'OAUTH2' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select
                    name="provider"
                    data-testid="connection-provider-select"
                    value={formData.authConfig?.provider || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, provider: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Provider</option>
                    <option value="google">Google</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <input
                    type="text"
                    name="clientId"
                    data-testid="connection-clientid-input"
                    required
                    value={formData.authConfig?.clientId || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, clientId: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formData.authType === 'OAUTH2' && !formData.authConfig?.clientId && (
                    <div data-testid="clientId-error" className="mt-1 text-sm text-red-600">
                      Client ID is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <input
                    type="password"
                    name="clientSecret"
                    data-testid="connection-clientsecret-input"
                    required
                    value={formData.authConfig?.clientSecret || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, clientSecret: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formData.authType === 'OAUTH2' && !formData.authConfig?.clientSecret && (
                    <div data-testid="clientSecret-error" className="mt-1 text-sm text-red-600">
                      Client Secret is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Redirect URI</label>
                  <input
                    type="url"
                    name="redirectUri"
                    data-testid="connection-redirecturi-input"
                    required
                    value={formData.authConfig?.redirectUri || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, redirectUri: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="http://localhost:3000/api/connections/oauth2/callback"
                  />
                  {formData.authType === 'OAUTH2' && !formData.authConfig?.redirectUri && (
                    <div data-testid="redirectUri-error" className="mt-1 text-sm text-red-600">
                      Redirect URI is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scope</label>
                  <input
                    type="text"
                    name="scope"
                    data-testid="connection-scope-input"
                    value={formData.authConfig?.scope || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authConfig: { ...formData.authConfig, scope: e.target.value }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="repo user"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                data-testid="cancel-connection-btn"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-connection-btn"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
