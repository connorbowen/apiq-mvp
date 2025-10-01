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
import ResponsiveLayoutHandler from '../../components/ResponsiveLayoutHandler';

// Import components directly for better test reliability
import WorkflowsTab from '../../components/dashboard/WorkflowsTab';
import SettingsTab from '../../components/dashboard/SettingsTab';
import AdminTab from '../../components/dashboard/AdminTab';
import ConnectionsTab from '../../components/dashboard/ConnectionsTab';
import ProfileTab from '../../components/dashboard/ProfileTab';
// import SubscriptionTab from '../../components/dashboard/SubscriptionTab';

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
type TabType = 'chat' | 'workflows' | 'connections' | 'settings' | 'profile' | 'subscription';

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
  subscription: {
    label: 'Subscription',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    testId: 'tab-subscription',
    adminOnly: false,
  },
};

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  
  console.info('[dashboard] DashboardContent rendered');
  console.info('[dashboard] Current tab:', activeTab);
  console.info('[dashboard] Connections count:', connections.length);

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

  // Track if tour was temporarily dismissed in this session
  const [tourTemporarilyDismissed, setTourTemporarilyDismissed] = useState(false);

  // Auto-start tour for new users who haven't completed it and haven't dismissed the tour
  useEffect(() => {
    console.log('🎯 Dashboard: Guided tour effect triggered:', {
      hasUser: !!user,
      tourState: onboardingState.tourState,
      tourDismissed: onboardingState.tourState?.dismissed,
      tourTemporarilyDismissed,
      onboardingStage: onboardingState.stage,
      onboardingCompleted: onboardingState.stage === 'completed',
      isTourOpen,
      userEmail: user?.email
    });
    
    // If tour is already open, don't interfere with it
    if (isTourOpen) {
      console.log('🎯 Dashboard: Tour already open, skipping effect');
      return;
    }
    
    // If tour was temporarily dismissed this session, don't show it again
    if (tourTemporarilyDismissed) {
      console.log('🎯 Dashboard: Tour temporarily dismissed this session, skipping effect');
      return;
    }
    
    if (
      user &&
      onboardingState.tourState &&
      !onboardingState.tourState.dismissed &&
      onboardingState.stage !== 'completed'
    ) {
      console.log('🎯 Dashboard: Scheduling guided tour to open in 2 seconds (waiting for DOM elements)');
      const timer = setTimeout(() => {
        // Re-evaluate conditions before opening tour
        if (
          user &&
          onboardingState.tourState &&
          !onboardingState.tourState.dismissed &&
          onboardingState.stage !== 'completed' &&
          !isTourOpen
        ) {
          // Wait for target elements to be available
          const waitForElements = () => {
            const chatInterface = document.querySelector('[data-testid="chat-interface"]');
            if (chatInterface) {
              console.log('🎯 Dashboard: Target elements found, opening guided tour');
              console.log('🎯 Dashboard: fullTourSteps:', fullTourSteps);
              console.log('🎯 Dashboard: openTour function:', typeof openTour);
              try {
                openTour(fullTourSteps);
                console.log('🎯 Dashboard: openTour called successfully');
              } catch (error) {
                console.error('🎯 Dashboard: Error calling openTour:', error);
              }
            } else {
              console.log('🎯 Dashboard: Target elements not ready, retrying in 500ms');
              setTimeout(waitForElements, 500);
            }
          };
          waitForElements();
        } else {
          console.log('🎯 Dashboard: Tour conditions no longer met, skipping tour');
        }
      }, 2000);
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
  }, [user, onboardingState.tourState, onboardingState.stage, openTour, fullTourSteps, isTourOpen, tourTemporarilyDismissed]);

  const loadUser = useCallback(async () => {
    try {
      console.log('👤 Dashboard: Loading user data...');
      const userResponse = await apiClient.getCurrentUser();
      
      // Check if the API response indicates authentication failure
      if (userResponse && !userResponse.success) {
        console.log('👤 Dashboard: API returned error response:', userResponse.error);
        
        // Check if this is an authentication error based on the error message
        const isAuthError = userResponse.error && (
          userResponse.error.includes('401') || 
          userResponse.error.includes('403') ||
          userResponse.error.includes('unauthorized') ||
          userResponse.error.includes('authentication') ||
          userResponse.error.includes('Please log in')
        );
        
        if (isAuthError) {
          console.log('👤 Dashboard: Authentication error detected in response, redirecting to login');
          // Clear any existing cookies and redirect to login
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (logoutError) {
            console.warn('Failed to clear cookies via API:', logoutError);
          }
          router.push('/login');
          return;
        }
      }
      
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
        
        // Reset temporary tour dismissal when user data is loaded (refresh/login)
        setTourTemporarilyDismissed(false);
        
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
      console.log('👤 Dashboard: API call failed:', error);
      
      // Check if this is an authentication error (401/403)
      const isAuthError = error && typeof error === 'object' && 'status' in error && 
        (error.status === 401 || error.status === 403);
      
      if (isAuthError) {
        console.log('👤 Dashboard: Authentication error detected, redirecting to login');
        // Clear any existing cookies and redirect to login
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (logoutError) {
          console.warn('Failed to clear cookies via API:', logoutError);
        }
        router.push('/login');
        return;
      }
      
      // For other errors, continue with minimal functionality
      console.log('👤 Dashboard: Non-auth error, continuing with minimal user data');
    }
    
    // If API call fails for non-auth reasons, try to continue with minimal functionality
    console.log('👤 Dashboard: Continuing with minimal user data');
    setIsLoading(false);
  }, [syncWithUserData, router]);

  const loadConnections = useCallback(async (retryCount = 0) => {
    try {
      console.info('[dashboard] loadConnections called (attempt', retryCount + 1, ')');
      console.info('[dashboard] loadConnections - current connections state:', connections.length);
      const response = await apiClient.getConnections();
      console.info('[dashboard] loadConnections API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        const newConnections = response.data.connections || [];
        console.info('[dashboard] setConnections length:', newConnections.length);
        console.info('[dashboard] setConnections data:', newConnections.map(c => ({
          id: c.id,
          name: c.name,
          authType: c.authType,
          status: c.status
        })));
        
        // Add debugging to see if setConnections is actually called
        console.info('[dashboard] About to call setConnections with', newConnections.length, 'connections');
        setConnections(newConnections);
        console.info('[dashboard] setConnections called successfully');
        
        // Clear any error messages if connections load successfully (even if empty)
        setErrorMessage(null);
      } else {
        console.error('❌ DASHBOARD: Failed to load connections:', response.error);
        // Only show error for actual API failures, not empty results
        if (response.error && !response.error.includes('No connections found')) {
          setErrorMessage(response.error);
        }
      }
    } catch (error: unknown) {
      console.error('❌ DASHBOARD: Error loading connections:', error);
      // Only show network error for actual network failures, not general errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        setErrorMessage('Unable to load connections. Please try again.');
      } else {
        // For other errors, don't show a generic network message
        console.error('Connection loading error (not showing to user):', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [connections.length]);

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
    
    // Filter tabs: show main navigation tabs (chat, workflows, connections) and exclude settings/profile
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
      
      // Include main navigation tabs: chat, workflows, connections
      // Exclude settings and profile (they're accessed via dropdown)
      return (tab === 'chat' || tab === 'workflows' || tab === 'connections') && (!isAdminOnly || hasAdminAccess);
    });
    
    // If settings tab is active (accessed via dropdown), include it
    if (activeTab === 'settings') {
      mainTabs.push('settings');
    }
    
    // If profile tab is active (accessed via dropdown), include it
    if (activeTab === 'profile') {
      mainTabs.push('profile');
    }
    
    // If subscription tab is active (accessed via dropdown), include it
    if (activeTab === 'subscription') {
      mainTabs.push('subscription');
    }
    
    console.log('🔍 Dashboard: Final filtered tabs:', mainTabs);
    return mainTabs;
  }, [user, activeTab]);

  // Initialize tab from URL on component mount and listen for URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get('tab');
      const validTabs = ['chat', 'workflows', 'connections', 'settings', 'profile', 'subscription'];
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
    // Temporarily disable URL polling when tour is active to prevent interference
    const checkUrlInterval = setInterval(() => {
      if (!isTourOpen) {
        handleUrlChange();
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(checkUrlInterval);
    };
  }, [user, isTourOpen]); // Added isTourOpen to dependency array

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" text="Loading dashboard..." />
          <p className="mt-4 text-gray-600">Please wait while we load your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">Unable to load user data. Please try logging in again.</p>
          <button
            onClick={async () => {
              // Clear authentication cookies to prevent redirect loop
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch (error) {
                console.warn('Failed to clear cookies via API, proceeding anyway:', error);
              }
              // Navigate to login page
              router.push('/login');
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <ResponsiveLayoutHandler />
      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} user={user ? { email: user.email, name: user.name || user.email } : { email: '', name: '' }} />
      
      <header role="banner" className="dashboard-header bg-white shadow relative z-50">
      <div className="w-full py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Back to Dashboard link for settings/profile/admin tabs */}
            {['settings', 'profile'].includes(activeTab) && (
              <Link
                href="/dashboard?tab=chat"
                className="flex items-center text-indigo-600 hover:text-indigo-500 transition-colors"
                data-testid="back-to-dashboard-link"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">Back</span>
              </Link>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {activeTab === 'chat' ? 'Chat' : 
               activeTab === 'workflows' ? 'Workflows' :
               activeTab === 'connections' ? 'Connections' :
               activeTab === 'settings' ? 'Settings' :
               activeTab === 'profile' ? 'Profile' :
               activeTab === 'subscription' ? 'Subscription' : 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center justify-between sm:justify-end">
            {/* Mobile tab navigation */}
            {user && !['profile', 'settings', 'subscription'].includes(activeTab) && (
              <div className="sm:hidden flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {filteredTabs.map((tab) => (
                  <button
                    key={tab}
                    data-testid={`mobile-dashboard-tab-${tab}`}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === tab 
                        ? 'bg-white text-indigo-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => handleTabChange(tab)}
                  >
                    {tabConfig[tab].label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && <UserDropdown user={{ ...user, name: user.name || user.email }} onLogout={handleLogout} onHelp={() => setShowSupportModal(true)} />}
            </div>
          </div>
        </div>
      </div>
      </header>

      <main role="main" className="dashboard-main-content dashboard-background dashboard-pattern">
        <section id="main-content" className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-2 pb-6 min-h-0 relative z-0 overflow-y-auto">
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

      {/* Tab Navigation - Enhanced with better visual hierarchy */}
      {user && !['profile', 'settings', 'subscription'].includes(activeTab) && (
        <div className="mb-4 hidden lg:block">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border border-gray-200" aria-label="Tabs" role="tablist">
            {filteredTabs.map((tab) => (
              <button
                key={tab}
                data-testid={tabConfig[tab].testId}
                aria-selected={activeTab === tab ? 'true' : 'false'}
                role="tab"
                className={`px-4 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 min-h-[40px] flex-1 flex items-center justify-center ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                }`}
                onClick={() => handleTabChange(tab)}
              >
                <span className="flex items-center space-x-2">
                  {tab === 'chat' && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  {tab === 'workflows' && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                  {tab === 'connections' && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span>{tabConfig[tab].label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content flex-1 flex flex-col min-h-0 dashboard-content relative z-0">
        {isTabLoading && (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="medium" text="Loading..." />
          </div>
        )}
        {!isTabLoading && activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 pb-4">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 min-h-0">
              {/* Left Sidebar - Compact Features - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:flex lg:col-span-1 flex-col min-h-0">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col min-h-0">
                  <div className="text-center mb-4 flex-shrink-0">
                    <div className="mx-auto h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">APIQ</h2>
                    <p className="text-xs text-gray-500">AI automation platform</p>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {/* Compact Features */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center p-2 bg-indigo-50 rounded-md">
                        <svg className="h-4 w-4 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-700">API Connections</span>
                      </div>
                      <div className="flex items-center p-2 bg-indigo-50 rounded-md">
                        <svg className="h-4 w-4 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-700">Auto Workflows</span>
                      </div>
                      <div className="flex items-center p-2 bg-indigo-50 rounded-md">
                        <svg className="h-4 w-4 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-700">Secure Secrets</span>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="border-t pt-3">
                      <div className="text-xs text-gray-500 mb-1">Quick Stats</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Workflows</span>
                          <span className="font-medium text-indigo-600">{workflows.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Connections</span>
                          <span className="font-medium text-indigo-600">{connections.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Main Chat Area - Full width on mobile, 3/4 on desktop */}
              <div className="col-span-1 lg:col-span-3 flex flex-col min-h-0">
                <ChatInterface onWorkflowGenerated={handleWorkflowGenerated} />
              </div>
            </div>
          </div>
        )}
        {!isTabLoading && activeTab === 'workflows' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <div id="workflows-section" className="flex-1 flex flex-col min-h-0 w-full h-full pb-4">
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
            <div id="connections-section" data-testid="connections-section" className="flex-1 flex flex-col min-h-0 w-full h-full pb-4">
              <ConnectionsTab
                connections={connections}
                onConnectionCreated={async () => {
                  console.info('[dashboard] onConnectionCreated callback triggered');
                  // Add a delay to ensure the API has processed the new connection
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  console.info('[dashboard] Calling loadConnections after connection creation');
                  await loadConnections();
                  console.info('[dashboard] loadConnections completed, setting success message');
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
            <div className="flex-1 flex flex-col min-h-0 w-full">
              <SettingsTab
              connections={connections}
              secrets={secrets}
              user={user}
              onConnectionCreated={async () => {
                console.info('[dashboard] onConnectionCreated callback triggered (SettingsTab)');
                // Add a delay to ensure the API has processed the new connection
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.info('[dashboard] Calling loadConnections after connection creation (SettingsTab)');
                await loadConnections();
                console.info('[dashboard] loadConnections completed, setting success message (SettingsTab)');
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
            </div>
          </Suspense>
        )}
        {!isTabLoading && activeTab === 'profile' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <div className="flex-1 flex flex-col min-h-0 w-full">
              <ProfileTab
              user={user}
              onProfileUpdated={() => {
                setSuccessMessage('Profile updated successfully!');
              }}
            />
            </div>
          </Suspense>
        )}
        {!isTabLoading && activeTab === 'subscription' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <div className="flex-1 flex flex-col min-h-0 w-full">
              {/* <SubscriptionTab /> */}
            </div>
          </Suspense>
        )}
      </div>
    </section>
    
    {/* Mobile Navigation */}
    <MobileNavigation
      activeTab={activeTab}
      onTabChange={(tab: string) => handleTabChange(tab as TabType)}
    />
    
    {/* Guided Tour */}
    <GuidedTour
      steps={fullTourSteps}
      isOpen={isTourOpen}
      onClose={async () => {
        try {
          await closeTour();
          // Mark tour as temporarily dismissed for this session
          setTourTemporarilyDismissed(true);
        } catch (error) {
          console.error('Error closing tour:', error);
        }
      }}
      onComplete={completeTour}
      onSkip={skipTour}
      setActiveTab={(tab: string) => handleTabChange(tab as TabType)}
    />
    
      </main>
    </div>
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


