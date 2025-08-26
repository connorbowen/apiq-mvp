'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiClient, ApiConnection } from '../../lib/api/client';
import ChatInterface from '../../components/ChatInterface';
import UserDropdown from '../../components/dashboard/UserDropdown';
import SupportModal from '../../components/dashboard/SupportModal';
import MessageBanner from '../../components/MessageBanner';
import MobileNavigation from '../../components/MobileNavigation';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { OnboardingProvider, useOnboarding } from '../../contexts/OnboardingContext';
import { useGuidedTour, GuidedTour } from '../../components/GuidedTour';
import { UserProvider } from '../../contexts/UserContext';

// Import components directly for better test reliability
import WorkflowsTab from '../../components/dashboard/WorkflowsTab';
import SettingsTab from '../../components/dashboard/SettingsTab';
import AdminTab from '../../components/dashboard/AdminTab';
import ConnectionsTab from '../../components/dashboard/ConnectionsTab';
import ProfileTab from '../../components/dashboard/ProfileTab';

// Dynamic import for modal component (not directly tested)
const CreateConnectionModal = dynamic(() => import('../../components/dashboard/CreateConnectionModal'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false,
});

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
}

// New 3-tab configuration
type TabType = 'chat' | 'workflows' | 'connections' | 'settings' | 'profile';

const tabConfig = {
  chat: {
    label: 'Chat',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    testId: 'tab-chat',
    adminOnly: false,
  },
  workflows: {
    label: 'Workflows',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    testId: 'tab-workflows',
    adminOnly: false,
  },
  connections: {
    label: 'Connections',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    testId: 'tab-connections',
    adminOnly: false,
  },
  settings: {
    label: 'Settings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    testId: 'tab-settings',
    adminOnly: false,
  },
  profile: {
    label: 'Profile',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    testId: 'tab-profile',
    adminOnly: false,
  },
};

function DashboardContent() {
  console.info('[dashboard] DashboardContent rendered');
  
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTabLoading, setIsTabLoading] = useState(false);

  const [showSupportModal, setShowSupportModal] = useState(false);
  const router = useRouter();

  // Guided Tour integration - now safely within OnboardingProvider
  const { state: onboardingState, syncWithUserData, syncWithTourState } = useOnboarding();
  const {
    isTourOpen,
    openTour,
    closeTour,
    completeTour,
    skipTour,
    fullTourSteps,
    tourState
  } = useGuidedTour();

  // Debug logging for tour state
  useEffect(() => {
    console.log('🎯 Dashboard: Onboarding state changed:', {
      user: !!user,
      onboardingState,
      tourState,
      isTourOpen
    });
  }, [user, onboardingState, tourState, isTourOpen]);

  // Auto-start tour for new users who haven't completed it and haven't dismissed the tour
  useEffect(() => {
    console.log('🎯 Dashboard: Guided tour effect triggered:', {
      hasUser: !!user,
      tourState: onboardingState.tourState,
      tourDismissed: onboardingState.tourState?.dismissed,
      onboardingStage: onboardingState.stage,
      onboardingCompleted: onboardingState.stage === 'completed',
      isTourOpen,
      userEmail: user?.email
    });
    if (
      user &&
      onboardingState.tourState &&
      !onboardingState.tourState.dismissed &&
      onboardingState.stage !== 'completed' &&
      !isTourOpen
    ) {
      console.log('🎯 Dashboard: Scheduling guided tour to open in 1 second');
      const timer = setTimeout(() => {
        // Re-evaluate conditions before opening tour
        if (
          user &&
          onboardingState.tourState &&
          !onboardingState.tourState.dismissed &&
          onboardingState.stage !== 'completed' &&
          !isTourOpen
        ) {
          console.log('🎯 Dashboard: Opening guided tour');
          openTour(fullTourSteps);
        } else {
          console.log('🎯 Dashboard: Tour conditions no longer met, skipping tour');
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      console.log('🎯 Dashboard: Tour conditions not met:', {
        hasUser: !!user,
        hasTourState: !!onboardingState.tourState,
        tourDismissed: onboardingState.tourState?.dismissed,
        onboardingStage: onboardingState.stage,
        isTourOpen
      });
    }
  }, [user, onboardingState.tourState, onboardingState.stage, isTourOpen, openTour, fullTourSteps]);

  const loadUser = useCallback(async () => {
    try {
      console.log('👤 Dashboard: Loading user data...');
      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        const userData = userResponse.data.user;
        console.log('👤 Dashboard: User data loaded from API:', {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          emailVerified: userData.emailVerified,
          onboardingStage: userData.onboardingStage
        });
        
        // Ensure role is properly set and handle case sensitivity
        const userWithRole = {
          ...userData,
          name: userData.name || userData.email,
          role: userData.role || 'USER' // Default to USER if role is missing
        };
        
        console.log('👤 Dashboard: Setting user with role:', {
          id: userWithRole.id,
          email: userWithRole.email,
          role: userWithRole.role,
          roleType: typeof userWithRole.role
        });
        
        setUser(userWithRole);
        
        // Sync onboarding context with user data from database
        console.log('🔄 Dashboard: Syncing onboarding context with user data');
        syncWithUserData(userData);
        
        // Sync tour state from database
        console.log('🔄 Dashboard: Syncing tour state from database');
        await syncWithTourState();
        
        setIsLoading(false);
        return;
      }
    } catch (error: unknown) {
      console.log('👤 Dashboard: API call failed, but continuing with minimal user data:', error);
      // Don't redirect to login immediately - the user might still be authenticated
      // but the API call failed due to network issues or other problems
    }
    
    // If API call fails, try to continue with minimal functionality
    // The user might still be authenticated via cookies
    console.log('👤 Dashboard: Continuing with minimal user data');
    setIsLoading(false);
  }, [syncWithUserData]);

  const loadConnections = useCallback(async (retryCount = 0) => {
    try {
      console.info('[dashboard] loadConnections called (attempt', retryCount + 1, ')');
      const response = await apiClient.getConnections();
      console.info('[dashboard] loadConnections API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        const connections = response.data.connections || [];
        console.info('[dashboard] setConnections length:', connections.length);
        console.info('[dashboard] setConnections data:', connections.map(c => ({
          id: c.id,
          name: c.name,
          authType: c.authType,
          status: c.status
        })));
        
        // Add debugging to see if setConnections is actually called
        console.info('[dashboard] About to call setConnections with', connections.length, 'connections');
        setConnections(connections);
        console.info('[dashboard] setConnections called successfully');
        
        // Clear any error messages if connections load successfully
        if (connections.length > 0) {
          setErrorMessage(null);
        }
      } else {
        console.error('❌ DASHBOARD: Failed to load connections:', response.error);
        setErrorMessage(response.error || 'Failed to load connections');
      }
    } catch (error: unknown) {
      console.error('❌ DASHBOARD: Error loading connections:', error);
      setErrorMessage('Network error while loading connections');
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
      // Skip loading secrets for non-admin users to avoid rate limits
      if (!user || user.role !== 'admin') {
        return;
      }
      
      const response = await apiClient.getSecrets();
      if (response.success && response.data) {
        setSecrets(response.data.secrets || []);
      } else {
        // Only log error if it's not a rate limit issue
        if (response.error && !response.error.includes('Rate limit')) {
          console.error('Failed to load secrets:', response.error);
        }
      }
    } catch (error: unknown) {
      // Only log error if it's not a rate limit issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('429') && !errorMessage.includes('Rate limit')) {
        console.error('Error loading secrets:', error);
      }
    }
  }, [user]);

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
      const userData = urlParams.get('user');
      if (userData) {
        // Clear URL parameters
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('oauth2_success');
        newUrl.searchParams.delete('user');
        window.history.replaceState({}, '', newUrl.toString());
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
    }
  }, []); // Empty dependency array - this function doesn't depend on any props/state

  // Monitor connections state changes
  useEffect(() => {
    console.info('[dashboard] Connections state changed:', {
      count: connections.length,
      connections: connections.map(c => ({ id: c.id, name: c.name, authType: c.authType }))
    });
  }, [connections]);

  // Load initial data and set up polling in a single useEffect
  useEffect(() => {
    console.info('[dashboard] DashboardPage useEffect triggered - loading initial data');
    
    // Initial load
    loadConnections();
    loadWorkflows();
    loadSecrets();
    loadUser();
    handleOAuth2Callback();
    
    // Set up polling for real-time updates (much slower to avoid rate limits)
    const interval = setInterval(() => {
      loadConnections();
      loadWorkflows();
      // Only load secrets if user has admin role to avoid rate limits
      if (user?.role === 'admin') {
        loadSecrets();
      }
    }, 60000); // Poll every 60 seconds instead of 30
    
    return () => {
      clearInterval(interval);
    };
  }, []); // Empty dependency array - only run once on mount to prevent infinite loops

  const handleTabChange = useCallback((tab: TabType) => {
    setIsTabLoading(true);
    setActiveTab(tab);
    
    // Update URL with tab parameter without triggering navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
    
    // Show loading state briefly for better UX
    setTimeout(() => {
      setIsTabLoading(false);
    }, 300);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setErrorMessage('Logout failed. Please try again.');
    }
  }, [router]);

  const handleWorkflowGenerated = useCallback((workflow: any, steps: any[]) => {
    setSuccessMessage('Workflow generated successfully!');
    loadWorkflows();
  }, [loadWorkflows]);

  // Memoize filtered tabs based on user role
  const filteredTabs = useMemo(() => {
    if (!user) return Object.keys(tabConfig) as TabType[];
    
    // Debug: Log user role for troubleshooting
    console.log('🔍 Dashboard: User role check:', {
      userId: user.id,
      userRole: user.role,
      userRoleType: typeof user.role,
      hasRole: 'role' in user
    });
    
    // Filter tabs: only show main navigation tabs (not settings)
    const mainTabs = (Object.keys(tabConfig) as TabType[]).filter(tab => {
      const config = tabConfig[tab];
      const isAdminOnly = config.adminOnly;
      const hasAdminAccess = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'admin';
      
      // Debug: Log tab filtering logic
      console.log('🔍 Dashboard: Tab filtering:', {
        tab,
        adminOnly: isAdminOnly,
        hasAdminAccess,
        willShow: !isAdminOnly || hasAdminAccess
      });
      
      return tab !== 'settings' && tab !== 'profile' && (!isAdminOnly || hasAdminAccess);
    });
    
    // If settings tab is active (accessed via dropdown), include it
    if (activeTab === 'settings') {
      mainTabs.push('settings');
    }
    
    // If profile tab is active (accessed via dropdown), include it
    if (activeTab === 'profile') {
      mainTabs.push('profile');
    }
    
    console.log('🔍 Dashboard: Final filtered tabs:', mainTabs);
    return mainTabs;
  }, [user, activeTab]);

  // Initialize tab from URL on component mount and listen for URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get('tab');
      const validTabs = ['chat', 'workflows', 'connections', 'settings', 'profile'];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam as TabType);
      } else {
        // If no tab parameter or invalid, default to chat and update URL
        setActiveTab('chat');
        url.searchParams.set('tab', 'chat');
        window.history.replaceState({}, '', url.toString());
      }
    };

    // Handle initial URL
    handleUrlChange();

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    // Also listen for any programmatic URL changes in tests
    const checkUrlInterval = setInterval(handleUrlChange, 1000);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(checkUrlInterval);
    };
  }, [user]);

  if (isLoading || !user) {
    return (
      <div data-testid="dashboard-loading" />
    );
  }

  return (
    <main role="main" className="min-h-screen bg-gray-50">
      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} user={user ? { email: user.email, name: user.name || user.email } : { email: '', name: '' }} />
    
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
        <div className="flex items-center space-x-4">
          {/* Back to Dashboard link for settings/profile/admin tabs */}
          {['settings', 'profile'].includes(activeTab) && (
            <Link
              href="/dashboard?tab=chat"
              className="flex items-center text-indigo-600 hover:text-indigo-500 transition-colors"
              data-testid="back-to-dashboard-link"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          {user && <UserDropdown user={{ ...user, name: user.name || user.email }} onLogout={handleLogout} onHelp={() => setShowSupportModal(true)} />}
        </div>
      </div>
    </header>

    <section id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Message Banner - only render when there's a message */}
      {(successMessage || errorMessage) && (
        <MessageBanner
          type={successMessage ? 'success' : 'error'}
          message={successMessage || errorMessage || ''}
          onClose={() => {
            setSuccessMessage(null);
            setErrorMessage(null);
          }}
        />
      )}

      {/* Tab Navigation */}
      {user && !['profile', 'settings'].includes(activeTab) && (
        <div className="mb-6 hidden lg:block">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm" aria-label="Tabs" role="tablist">
            {filteredTabs.map((tab) => (
              <button
                key={tab}
                data-testid={tabConfig[tab].testId}
                aria-selected={activeTab === tab ? 'true' : 'false'}
                role="tab"
                className={`px-4 py-2 font-medium text-sm rounded-md transition-colors min-h-[44px] ${
                  activeTab === tab 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTabChange(tab)}
              >
                {tabConfig[tab].label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">
        {isTabLoading && (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="medium" text="Loading..." />
          </div>
        )}
        {!isTabLoading && activeTab === 'chat' && (
          <ChatInterface onWorkflowGenerated={handleWorkflowGenerated} />
        )}
        {!isTabLoading && activeTab === 'workflows' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
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
          </Suspense>
        )}
        {!isTabLoading && activeTab === 'connections' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <div id="connections-section">
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
                  setSuccessMessage('Connection validation completed successfully');
                }}
                onConnectionError={(error) => {
                  setErrorMessage(error);
                }}
              />
            </div>
          </Suspense>
        )}
        {!isTabLoading && activeTab === 'settings' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <SettingsTab
              connections={connections}
              secrets={secrets}
              user={user}
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
                setSuccessMessage('Connection validation completed successfully');
              }}
              onConnectionError={(error) => {
                setErrorMessage(error);
              }}
              onSecretCreated={() => {
                loadSecrets();
                setSuccessMessage('Secret created successfully!');
              }}
              onSecretError={(error) => {
                setErrorMessage(error);
              }}
            />
          </Suspense>
        )}
        {!isTabLoading && activeTab === 'profile' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <ProfileTab
              user={user}
              onProfileUpdated={() => {
                setSuccessMessage('Profile updated successfully!');
              }}
            />
          </Suspense>
        )}
      </div>
    </section>
    
    {/* Mobile Navigation */}
    <MobileNavigation
      activeTab={activeTab}
      onTabChange={(tab: string) => handleTabChange(tab as TabType)}
    />
    
    {/* Bottom padding for mobile navigation */}
    <div className="h-20 md:hidden" />
    
    {/* Guided Tour */}
    <GuidedTour
      steps={fullTourSteps}
      isOpen={isTourOpen}
      onClose={closeTour}
      onComplete={completeTour}
      onSkip={skipTour}
    />
    
  </main>
  );
}

// Wrapper component that provides the OnboardingProvider and UserProvider context
export default function DashboardPage() {
  return (
    <UserProvider>
      <OnboardingProvider>
        <DashboardContent />
      </OnboardingProvider>
    </UserProvider>
  );
}


