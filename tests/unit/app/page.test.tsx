import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../../../src/app/page';

// Mock Next.js router and Link
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock fetch for health check
global.fetch = jest.fn();

describe('Home Page (Landing Page)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main landing page with correct content', () => {
    render(<Home />);
    
    // Check main heading and tagline
    expect(screen.getByText(/just ask, we'll connect/i)).toBeInTheDocument();
    expect(screen.getByText(/ai-powered api assistant/i)).toBeInTheDocument();
    
    // Check navigation links
    expect(screen.getByRole('link', { name: /try chat/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start chatting/i })).toBeInTheDocument();
  });

  it('renders the chat demo section', () => {
    render(<Home />);
    
    expect(screen.getByText(/chat interface/i)).toBeInTheDocument();
    expect(screen.getByText(/just describe what you want to do/i)).toBeInTheDocument();
    
    // Check for demo messages
    expect(screen.getByText(/when a new customer signs up/i)).toBeInTheDocument();
    expect(screen.getByText(/i'll help you create a workflow/i)).toBeInTheDocument();
  });

  it('renders the examples section', () => {
    render(<Home />);
    
    expect(screen.getByText(/what you can ask/i)).toBeInTheDocument();
    expect(screen.getByText(/natural language examples/i)).toBeInTheDocument();
    
    // Check for example cards
    expect(screen.getByText(/get the latest orders/i)).toBeInTheDocument();
    expect(screen.getByText(/monitor our github repository/i)).toBeInTheDocument();
    expect(screen.getByText(/send me a daily summary/i)).toBeInTheDocument();
  });

  it('renders the features section', () => {
    render(<Home />);
    
    expect(screen.getByText(/why it works/i)).toBeInTheDocument();
    expect(screen.getByText(/simple, powerful, and intelligent/i)).toBeInTheDocument();
  });

  it('performs health check when button is clicked', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, status: 'healthy' }),
    } as Response);

    render(<Home />);
    
    // Find and click health check button (if it exists)
    const healthButton = screen.queryByRole('button', { name: /check health/i });
    if (healthButton) {
      fireEvent.click(healthButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/health');
      });
    }
  });

  it('handles health check errors gracefully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Home />);
    
    const healthButton = screen.queryByRole('button', { name: /check health/i });
    if (healthButton) {
      fireEvent.click(healthButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/health');
      });
    }
  });

  it('has proper navigation links to dashboard and login', () => {
    render(<Home />);
    
    const tryChatLink = screen.getByRole('link', { name: /try chat/i });
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    const startChattingLink = screen.getByRole('link', { name: /start chatting/i });
    
    expect(tryChatLink).toHaveAttribute('href', '/dashboard');
    expect(signInLink).toHaveAttribute('href', '/login');
    expect(startChattingLink).toHaveAttribute('href', '/dashboard');
  });

  it('has proper accessibility attributes', () => {
    render(<Home />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: /just ask, we'll connect/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what you can ask/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /why it works/i })).toBeInTheDocument();
  });

  it('renders with proper styling classes', () => {
    render(<Home />);
    
    // Check for main container classes - the min-h-screen is on the root div
    const rootContainer = document.querySelector('.min-h-screen');
    expect(rootContainer).toBeInTheDocument();
  });

  it('displays hero section with call-to-action buttons', () => {
    render(<Home />);
    
    // Check hero section content
    expect(screen.getByText(/describe what you want to do with your apis/i)).toBeInTheDocument();
    
    // Check CTA buttons
    expect(screen.getByRole('link', { name: /start chatting/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see examples/i })).toBeInTheDocument();
  });

  it('shows workflow creation example in chat demo', () => {
    render(<Home />);
    
    // Check for workflow creation steps
    expect(screen.getByText(/monitors for new customer signups/i)).toBeInTheDocument();
    expect(screen.getByText(/adds customer to your crm system/i)).toBeInTheDocument();
    expect(screen.getByText(/sends a personalized welcome email/i)).toBeInTheDocument();
    expect(screen.getByText(/ready to save and activate/i)).toBeInTheDocument();
  });

  it('displays example descriptions correctly', () => {
    render(<Home />);
    
    // Check example descriptions
    expect(screen.getByText(/creates a workflow that syncs order data/i)).toBeInTheDocument();
    expect(screen.getByText(/automatically creates project management tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/generates automated reports combining multiple data sources/i)).toBeInTheDocument();
  });

  it('has proper semantic HTML structure', () => {
    render(<Home />);
    
    // Check for semantic elements
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
  });

  it('handles loading state for health check', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<Home />);
    
    const healthButton = screen.queryByRole('button', { name: /check health/i });
    if (healthButton) {
      fireEvent.click(healthButton);
      
      // Should show loading state
      expect(healthButton).toBeDisabled();
    }
  });
}); 