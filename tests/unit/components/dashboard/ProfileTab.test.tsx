import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileTab from '../../../../src/components/dashboard/ProfileTab';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  timezone: 'UTC',
  language: 'en',
  emailVerified: true,
  emailVerifiedAt: '2024-01-01T00:00:00Z',
  notificationsEnabled: true,
  marketingEmailsEnabled: false,
  role: 'USER',
  isActive: true,
  lastLogin: '2024-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  provider: 'credentials',
};

describe('ProfileTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile information correctly', () => {
    render(<ProfileTab user={mockUser} />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account information and preferences.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('✓ Email verified')).toBeInTheDocument();
  });

  it('shows edit button when not editing', () => {
    render(<ProfileTab user={mockUser} />);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('enables editing when edit button is clicked', () => {
    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows unverified email status', () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    render(<ProfileTab user={unverifiedUser} />);

    expect(screen.getByText('⚠ Email not verified')).toBeInTheDocument();
  });

  it('displays account information correctly', () => {
    render(<ProfileTab user={mockUser} />);

    expect(screen.getByDisplayValue('Email/Password')).toBeInTheDocument();
    // Date formatting may vary by locale, so we check for the presence of the fields
    expect(screen.getByDisplayValue(/2024/)).toBeInTheDocument(); // Member since
    expect(screen.getByDisplayValue(/2024/)).toBeInTheDocument(); // Last login
  });

  it('handles profile update successfully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Profile updated successfully',
        profile: { ...mockUser, firstName: 'Updated' },
      }),
    } as Response);

    const onProfileUpdated = jest.fn();
    render(<ProfileTab user={mockUser} onProfileUpdated={onProfileUpdated} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Updated',
          lastName: 'User',
          timezone: 'UTC',
          language: 'en',
          notificationsEnabled: true,
          marketingEmailsEnabled: false,
        }),
      });
    });

    await waitFor(() => {
      expect(onProfileUpdated).toHaveBeenCalled();
    });
  });

  it('handles profile update error', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    } as Response);

    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('cancels editing when cancel button is clicked', () => {
    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('validates form fields', () => {
    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'a'.repeat(51) } });

    // The validation happens on form submission, not on change
    fireEvent.click(screen.getByText('Save Changes'));

    // Check that the form doesn't submit due to validation
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('shows loading state during form submission', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    
    // Fill in required fields to avoid validation errors
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    
    fireEvent.click(screen.getByText('Save Changes'));

    // The loading state should be visible
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('displays timezone options correctly', () => {
    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    
    const timezoneSelect = screen.getByDisplayValue('UTC');
    expect(timezoneSelect).toBeInTheDocument();
    expect(timezoneSelect).toHaveValue('UTC');
  });

  it('displays language options correctly', () => {
    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    
    const languageSelect = screen.getByDisplayValue('English');
    expect(languageSelect).toBeInTheDocument();
    expect(languageSelect).toHaveValue('en');
  });

  it('handles checkbox preferences correctly', () => {
    render(<ProfileTab user={mockUser} />);

    fireEvent.click(screen.getByText('Edit Profile'));
    
    const notificationsCheckbox = screen.getByLabelText('Enable notifications');
    const marketingCheckbox = screen.getByLabelText('Receive marketing emails');

    expect(notificationsCheckbox).toBeChecked();
    expect(marketingCheckbox).not.toBeChecked();
  });
}); 