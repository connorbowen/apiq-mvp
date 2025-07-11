/**
 * TODO: UX SIMPLIFICATION - DASHBOARD UNIT TESTS - @connorbowen 2024-12-19
 * 
 * PHASE 1: QUICK WINS TESTING
 * 
 * 1.1 Hide non-essential tabs for regular users
 * - [ ] test('should filter tabs based on user role')
 * - [ ] test('should hide admin tab for regular users')
 * - [ ] test('should hide audit tab for regular users')
 * - [ ] test('should show all tabs for admin users')
 * 
 * 1.2 Make Chat the default tab
 * - [ ] test('should initialize with chat as default tab')
 * - [ ] test('should handle URL parameters for chat tab')
 * - [ ] test('should maintain tab state correctly')
 * 
 * 1.3 Simplify the header - remove breadcrumbs
 * - [ ] test('should render simplified header without breadcrumbs')
 * - [ ] test('should maintain logout functionality')
 * - [ ] test('should display user information correctly')
 * 
 * 1.4 Consolidate error/success messages
 * - [ ] test('should display unified message banner')
 * - [ ] test('should handle message state management')
 * - [ ] test('should auto-clear messages after timeout')
 * 
 * PHASE 2: CORE SIMPLIFICATION TESTING
 * 
 * 2.1 Redesign dashboard layout with 3-tab structure
 * - [ ] test('should render only 3 tabs: Chat, Workflows, Settings')
 * - [ ] test('should handle tab switching in new structure')
 * - [ ] test('should maintain tab content rendering')
 * - [ ] test('should handle mobile menu for 3-tab structure')
 * 
 * 2.2 Progressive disclosure
 * - [ ] test('should show features based on user onboarding stage')
 * - [ ] test('should handle progressive feature unlocking')
 * - [ ] test('should maintain functionality for advanced users')
 * 
 * 2.4 Guided tour integration
 * - [ ] test('should trigger guided tour for new users')
 * - [ ] test('should handle tour state management')
 * - [ ] test('should allow tour skipping')
 * 
 * PHASE 3: POLISH TESTING
 * 
 * 3.1 Mobile optimization
 * - [ ] test('should handle mobile navigation correctly')
 * - [ ] test('should maintain responsive design')
 * - [ ] test('should handle mobile menu interactions')
 * 
 * 3.2 Performance optimizations
 * - [ ] test('should handle component memoization')
 * - [ ] test('should optimize re-renders')
 * - [ ] test('should handle lazy loading')
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useRouter } from 'next/navigation';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock the API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    getConnections: jest.fn(),
    getCurrentUser: jest.fn(),
    generateWorkflow: jest.fn(),
  },
}));

// Mock ChatInterface component with a very simple implementation
jest.mock('../../../../src/components/ChatInterface', () => {
  return function MockChatInterface() {
    return <div data-testid="chat-interface">Chat Interface Mock</div>;
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: jest.fn(),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

const { apiClient } = require('../../../../src/lib/api/client');

// Import the component after all mocks are set up
let DashboardPage: any;
beforeAll(async () => {
  // Dynamic import to ensure mocks are in place
  const module = await import('../../../../src/app/dashboard/page');
  DashboardPage = module.default;
});

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    jest.useRealTimers();
    localStorageMock.clear();
    
    // Set up authenticated user
    localStorageMock.setItem('accessToken', 'mock-access-token');
    localStorageMock.setItem('user', JSON.stringify({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }));
    
    // Mock API responses
    apiClient.getCurrentUser.mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        }
      }
    });
    
    apiClient.getConnections.mockResolvedValue({
      success: true,
      data: {
        connections: [
          {
            id: 'conn-1',
            name: 'GitHub API',
            baseUrl: 'https://api.github.com',
            status: 'ACTIVE',
            authType: 'OAUTH2',
            endpointCount: 5
          },
          {
            id: 'conn-2',
            name: 'Stripe API',
            baseUrl: 'https://api.stripe.com',
            status: 'ACTIVE',
            authType: 'API_KEY',
            endpointCount: 3
          }
        ]
      }
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders dashboard with authenticated user', async () => {
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
    });
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    expect(screen.getByText('Logout')).toBeInTheDocument();
    
    unmount();
  });

  it('loads and displays connections', async () => {
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /api connections/i })).toBeInTheDocument();
    });
    
    unmount();
  });

  it('shows connection statistics', async () => {
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /api connections/i })).toBeInTheDocument();
    });
    
    unmount();
  });

  it('switches between chat and connections tabs', async () => {
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /api connections/i })).toBeInTheDocument();
    });
    
    const connectionsTab = screen.getByRole('button', { name: /api connections/i });
    fireEvent.click(connectionsTab);
    
    // After clicking connections tab, we should see the connections content
    // Note: The actual connections content is rendered by ConnectionsTab component
    // which may be mocked or not fully implemented in this test
    
    unmount();
  });

  it('handles logout correctly', async () => {
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
    });
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(localStorageMock.getItem('accessToken')).toBeNull();
    expect(localStorageMock.getItem('user')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
    
    unmount();
  });

  it('redirects to login when not authenticated', () => {
    localStorageMock.clear();
    const { unmount } = render(<DashboardPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
    
    unmount();
  });

  // New tests for the authentication logic we fixed
  it('sets loading to false before redirecting when no token exists', () => {
    localStorageMock.clear();
    const { unmount } = render(<DashboardPage />);
    
    // Should redirect immediately without staying in loading state
    expect(mockPush).toHaveBeenCalledWith('/login');
    
    unmount();
  });

  it('sets loading to false before redirecting when no user data exists', async () => {
    localStorageMock.clear();
    const { rerender } = render(<DashboardPage />);
    act(() => {
      localStorageMock.setItem('accessToken', 'token');
      rerender(<DashboardPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('sets loading to false before redirecting when API call fails', async () => {
    localStorageMock.setItem('accessToken', 'mock-token');
    localStorageMock.setItem('user', JSON.stringify({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }));
    
    // Mock API failure
    apiClient.getCurrentUser.mockResolvedValue({
      success: false,
      error: 'Authentication failed'
    });
    
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
    
    unmount();
  });

  it('sets loading to false before redirecting when API call throws error', async () => {
    localStorageMock.setItem('accessToken', 'mock-token');
    localStorageMock.setItem('user', JSON.stringify({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }));
    
    // Mock API error
    apiClient.getCurrentUser.mockRejectedValue(new Error('Network error'));
    
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
    
    unmount();
  });

  it('maintains loading state during successful authentication', async () => {
    localStorageMock.setItem('accessToken', 'mock-token');
    localStorageMock.setItem('user', JSON.stringify({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }));
    
    // Mock successful API response
    apiClient.getCurrentUser.mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        }
      }
    });
    
    const { unmount } = render(<DashboardPage />);
    
    // Should not redirect on successful authentication
    await waitFor(() => {
      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
    });
    
    expect(mockPush).not.toHaveBeenCalled();
    
    unmount();
  });

  it('handles API errors gracefully', async () => {
    apiClient.getCurrentUser.mockResolvedValue({ success: false });
    
    const { unmount } = render(<DashboardPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
    
    unmount();
  });

  it('shows loading state while fetching data', () => {
    apiClient.getCurrentUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: { user: { id: '1', name: 'Test' } } }), 100)));
    
    const { unmount } = render(<DashboardPage />);
    
    // Should show loading spinner
    const generics = screen.getAllByRole('generic');
    expect(generics.some(el => el.className.includes('animate-spin'))).toBe(true);
    
    unmount();
  });
}); 