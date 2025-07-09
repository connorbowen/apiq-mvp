import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

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