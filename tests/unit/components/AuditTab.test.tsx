import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuditTab from '../../../src/components/dashboard/AuditTab';

// Mock fetch
global.fetch = jest.fn();

describe('AuditTab', () => {
  const mockAuditLogs = [
    {
      id: 'log-1',
      action: 'SECRET_CREATED',
      resource: 'Secret',
      resourceId: 'secret-1',
      userId: 'user-1',
      userEmail: 'test@example.com',
      timestamp: '2024-01-01T00:00:00Z',
      details: {
        secretName: 'Test API Key',
        secretType: 'api_key',
        timestamp: '2024-01-01T00:00:00Z',
        // Sensitive data that should be sanitized
        value: 'sensitive-secret-value',
        encryptedData: 'encrypted-data',
        keyId: 'key-1',
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    },
    {
      id: 'log-2',
      action: 'SECRET_ACCESSED',
      resource: 'Secret',
      resourceId: 'secret-1',
      userId: 'user-1',
      userEmail: 'test@example.com',
      timestamp: '2024-01-01T01:00:00Z',
      details: {
        secretName: 'Test API Key',
        accessType: 'read',
        timestamp: '2024-01-01T01:00:00Z',
        // Sensitive data that should be sanitized
        value: 'sensitive-secret-value',
        encryptedData: 'encrypted-data',
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    },
    {
      id: 'log-3',
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: 'user-1',
      userId: 'user-1',
      userEmail: 'test@example.com',
      timestamp: '2024-01-01T02:00:00Z',
      details: {
        loginMethod: 'password',
        timestamp: '2024-01-01T02:00:00Z',
        // Non-sensitive data
        success: true,
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
      },
      writable: true,
    });
  });

  describe('Component Rendering', () => {
    it('renders the main heading and description', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      expect(screen.getByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();
      expect(screen.getByText('Monitor system activity and security events')).toBeInTheDocument();
    });

    it('has proper ARIA attributes for accessibility', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      const container = screen.getByTestId('audit-management');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-labelledby', 'audit-heading');
    });
  });

  describe('Filter Controls', () => {
    it('renders filter dropdown with all options', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'All Events' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Secret Operations' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Security Events' })).toBeInTheDocument();
    });

    it('filters logs correctly when filter changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      // Wait for logs to load
      await waitFor(() => {
        expect(screen.getAllByTestId('audit-log')).toHaveLength(3);
      });
      
      // Change filter to secrets only
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'secrets' } });
      
      // Should only show secret-related logs
      await waitFor(() => {
        const secretLogs = screen.getAllByTestId('audit-log');
        expect(secretLogs).toHaveLength(2); // SECRET_CREATED and SECRET_ACCESSED
      });
    });

    it('filters logs correctly for security events', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      // Wait for logs to load
      await waitFor(() => {
        expect(screen.getAllByTestId('audit-log')).toHaveLength(3);
      });
      
      // Change filter to security events
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'security' } });
      
      // Should show security-related logs (USER_LOGIN contains 'LOGIN')
      await waitFor(() => {
        const securityLogs = screen.getAllByTestId('audit-log');
        expect(securityLogs).toHaveLength(1); // USER_LOGIN
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('renders refresh button with proper accessibility attributes', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh audit logs' });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveClass('min-h-[44px]');
    });

    it('handles manual refresh correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getAllByTestId('audit-log')).toHaveLength(3);
      });
      
      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: 'Refresh audit logs' });
      fireEvent.click(refreshButton);
      
      // Should show refreshing state
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      
      // Wait for refresh to complete
      await waitFor(() => {
        expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
      });
      
      // Should have called fetch twice (initial load + refresh)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('refreshes when refreshTrigger prop changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      const { rerender } = render(<AuditTab refreshTrigger={0} />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getAllByTestId('audit-log')).toHaveLength(3);
      });
      
      // Change refreshTrigger to trigger refresh
      rerender(<AuditTab refreshTrigger={1} />);
      
      // Should have called fetch twice (initial load + trigger refresh)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Audit Log Display', () => {
    it('displays audit logs in table format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      // Wait for logs to load
      await waitFor(() => {
        expect(screen.getAllByTestId('audit-log')).toHaveLength(3);
      });
      
      // Check table headers
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('IP Address')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('formats action labels correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByText('Secret created')).toBeInTheDocument();
        expect(screen.getByText('Secret accessed')).toBeInTheDocument();
        expect(screen.getByText('User login')).toBeInTheDocument();
      });
    });

    it('applies correct color coding to actions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        const secretCreated = screen.getByText('Secret created');
        const secretAccessed = screen.getByText('Secret accessed');
        const userLogin = screen.getByText('User login');
        
        // Check for color classes
        expect(secretCreated.closest('span')).toHaveClass('bg-green-100', 'text-green-800');
        expect(secretAccessed.closest('span')).toHaveClass('bg-blue-100', 'text-blue-800');
        expect(userLogin.closest('span')).toHaveClass('bg-purple-100', 'text-purple-800');
      });
    });

    it('formats timestamps correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        // Check that timestamps are formatted (not raw ISO strings)
        const timestampElements = screen.getAllByText(/1\/1\/2024/);
        expect(timestampElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Sanitization', () => {
    it('sanitizes sensitive data from secret creation logs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [mockAuditLogs[0]] } // SECRET_CREATED log
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
      });
      
      // Get the details cell content
      const detailsCell = screen.getByText(/Test API Key/).closest('tr')?.querySelector('td:last-child');
      const detailsText = detailsCell?.textContent || '';
      
      // Should contain safe fields
      expect(detailsText).toContain('Test API Key');
      expect(detailsText).toContain('api_key');
      expect(detailsText).toContain('timestamp');
      
      // Should NOT contain sensitive data
      expect(detailsText).not.toContain('sensitive-secret-value');
      expect(detailsText).not.toContain('encrypted-data');
      expect(detailsText).not.toContain('key-1');
    });

    it('sanitizes sensitive data from secret access logs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [mockAuditLogs[1]] } // SECRET_ACCESSED log
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
      });
      
      // Get the details cell content
      const detailsCell = screen.getByText(/Test API Key/).closest('tr')?.querySelector('td:last-child');
      const detailsText = detailsCell?.textContent || '';
      
      // Should contain safe fields
      expect(detailsText).toContain('Test API Key');
      expect(detailsText).toContain('read');
      expect(detailsText).toContain('timestamp');
      
      // Should NOT contain sensitive data
      expect(detailsText).not.toContain('sensitive-secret-value');
      expect(detailsText).not.toContain('encrypted-data');
    });

    it('handles string details correctly', async () => {
      const logWithStringDetails = {
        ...mockAuditLogs[0],
        details: 'Simple string details'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [logWithStringDetails] }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
      });
      
      // Should display string details as-is
      expect(screen.getByText('Simple string details')).toBeInTheDocument();
    });

    it('handles null or undefined details gracefully', async () => {
      const logWithNullDetails = {
        ...mockAuditLogs[0],
        details: null
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [logWithNullDetails] }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
      });
      
      // Should not crash and should display "null"
      expect(screen.getByText('null')).toBeInTheDocument();
    });

    it('preserves non-sensitive data in details', async () => {
      const logWithMixedData = {
        ...mockAuditLogs[2], // USER_LOGIN log
        details: {
          loginMethod: 'password',
          timestamp: '2024-01-01T02:00:00Z',
          success: true,
          // Non-sensitive data should be preserved
          userAgent: 'Mozilla/5.0...',
          ipAddress: '192.168.1.1'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [logWithMixedData] }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
      });
      
      // Get the details cell content
      const detailsCell = screen.getByText(/User login/).closest('tr')?.querySelector('td:last-child');
      const detailsText = detailsCell?.textContent || '';
      
      // Should contain non-sensitive data
      expect(detailsText).toContain('password');
      expect(detailsText).toContain('true');
      expect(detailsText).toContain('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load audit logs: Internal Server Error')).toBeInTheDocument();
      });
    });

    it('displays error message when API returns error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Database connection failed'
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });

    it('displays error message when fetch throws exception', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AuditTab />);
      
      expect(screen.getByText('Loading audit logs...')).toBeInTheDocument();
    });

    it('shows empty state when no logs are returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByText('No audit logs found')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('announces refresh to screen readers', async () => {
      // Mock the aria-live region
      const mockAnnouncementRegion = document.createElement('div');
      mockAnnouncementRegion.id = 'aria-live-announcements';
      document.body.appendChild(mockAnnouncementRegion);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: 'Refresh audit logs' });
      fireEvent.click(refreshButton);
      
      // Check that refresh is announced
      expect(mockAnnouncementRegion.textContent).toBe('Refreshing audit logs...');
      
      // Cleanup
      document.body.removeChild(mockAnnouncementRegion);
    });

    it('has proper table structure for screen readers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: mockAuditLogs }
        })
      });

      render(<AuditTab />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
      });
      
      // Check for proper table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check for table headers
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(6); // Action, Resource, User, Timestamp, IP Address, Details
    });
  });

  describe('Export Functionality', () => {
    it('renders export button with proper accessibility', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { logs: [] }
        })
      });

      render(<AuditTab />);
      
      const exportButton = screen.getByRole('button', { name: 'Export audit log' });
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).toHaveClass('min-h-[44px]');
    });
  });
}); 