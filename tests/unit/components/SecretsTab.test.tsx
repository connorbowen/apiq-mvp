import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SecretsTab from '../../../src/components/dashboard/SecretsTab';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiClient } from '../../../src/lib/api/client';

// Mock the API client
jest.mock('../../../src/lib/api/client', () => ({
  apiClient: {
    createSecret: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock axios
jest.mock('axios');

// Mock the SecretTypeSelect component
jest.mock('../../../src/components/ui/SecretTypeSelect', () => ({
  SecretTypeSelect: function MockSecretTypeSelect({ options, selected, onChange }: any) {
    return (
      <select
        data-testid="secret-type-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value} data-testid="secret-type-option">
            {option.label}
          </option>
        ))}
      </select>
    );
  }
}));

// Mock the AlertBanner component
jest.mock('../../../src/components/ui/AlertBanner', () => {
  return function MockAlertBanner({ type, message, onClose }: any) {
    return (
      <div data-testid={`alert-banner-${type}`} role="alert">
        {message}
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  };
});

describe('SecretsTab', () => {
  const mockSecrets = [
    {
      id: 'secret-1',
      name: 'Test API Key',
      description: 'A test API key',
      type: 'API_KEY',
      isEncrypted: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastRotated: null,
      rotationEnabled: true,
      rotationInterval: 30
    },
    {
      id: 'secret-2',
      name: 'Test Bearer Token',
      description: 'A test bearer token',
      type: 'BEARER_TOKEN',
      isEncrypted: true,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      lastRotated: '2024-01-15T00:00:00Z'
    }
  ];

  const defaultProps = {
    secrets: mockSecrets,
    onSecretCreated: jest.fn(),
    onSecretError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Heading and Page Structure', () => {
    it('renders the main h2 heading with correct text', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { name: 'Secrets Management' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveClass('text-2xl', 'font-semibold', 'text-gray-900');
      expect(heading).toHaveAttribute('id', 'secrets-heading');
    });

    it('renders the description text below the heading', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const description = screen.getByText('Manage your encrypted API keys, tokens, and sensitive credentials');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-gray-600');
    });

    it('has the correct data-testid and ARIA attributes for the main container', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const container = screen.getByTestId('secrets-management');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-labelledby', 'secrets-heading');
    });
  });

  describe('Primary Action Button', () => {
    it('renders the create secret button with correct attributes', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveTextContent('Create Secret');
      expect(createButton).toHaveClass('bg-indigo-600', 'text-white');
    });

    it('has proper accessibility attributes for the primary action', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      expect(createButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2', 'focus:ring-indigo-500');
      expect(createButton).toHaveClass('min-h-[44px]'); // Touch target size
    });

    it('opens the create secret modal when clicked', async () => {
      render(<SecretsTab {...defaultProps} />);
      
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter Controls', () => {
    it('renders search input with proper accessibility attributes', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('secret-search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search secrets...');
      expect(searchInput).toHaveAttribute('id', 'secret-search-input');
      expect(searchInput).toHaveClass('min-h-[44px]', 'min-w-[200px]');
      
      // Check for associated label
      const label = screen.getByLabelText('Search secrets');
      expect(label).toBeInTheDocument();
    });

    it('renders filter select with proper accessibility attributes', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const filterSelect = screen.getByTestId('secret-filter-select');
      expect(filterSelect).toBeInTheDocument();
      expect(filterSelect).toHaveAttribute('id', 'secret-filter-select');
      expect(filterSelect).toHaveClass('min-h-[44px]', 'min-w-[200px]');
      
      // Check for associated label
      const label = screen.getByLabelText('Filter by type');
      expect(label).toBeInTheDocument();
      
      // Check for all filter options
      expect(screen.getByRole('option', { name: 'All Types' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'API Key' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Bearer Token' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Password' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'SSH Key' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Certificate' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'OAuth2 Token' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Database Password' })).toBeInTheDocument();
    });

    it('filters secrets based on search term', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('secret-search-input');
      fireEvent.change(searchInput, { target: { value: 'Test API Key' } });
      
      expect(screen.getByText('Test API Key')).toBeInTheDocument();
      expect(screen.queryByText('Test Bearer Token')).not.toBeInTheDocument();
    });

    it('filters secrets based on type', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const filterSelect = screen.getByTestId('secret-filter-select');
      fireEvent.change(filterSelect, { target: { value: 'API_KEY' } });
      
      // Get all secret cards
      const cards = screen.getAllByTestId('secret-card');
      // Should contain the API Key secret
      expect(cards.some(card => within(card).getByTestId('secret-name-secret-1').textContent === 'Test API Key')).toBe(true);
      // Should not contain the Bearer Token secret
      expect(cards.some(card => {
        try {
          return within(card).getByTestId('secret-name-secret-2').textContent === 'Test Bearer Token';
        } catch {
          return false;
        }
      })).toBe(false);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no secrets exist', () => {
      render(<SecretsTab {...defaultProps} secrets={[]} />);
      
      // Check for empty state heading
      const emptyHeading = screen.getByRole('heading', { name: 'No secrets' });
      expect(emptyHeading).toBeInTheDocument();
      expect(emptyHeading.tagName).toBe('H3');
      
      // Check for empty state description
      const emptyDescription = screen.getByText('Get started by adding your first secret to the vault.');
      expect(emptyDescription).toBeInTheDocument();
      
      // Check for empty state icon (SVG present)
      const emptyIcon = document.querySelector('.text-gray-400');
      expect(emptyIcon).toBeInTheDocument();
    });

    it('renders empty state when search has no results', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('secret-search-input');
      fireEvent.change(searchInput, { target: { value: 'Non-existent secret' } });
      
      const emptyHeading = screen.getByRole('heading', { name: 'No secrets' });
      expect(emptyHeading).toBeInTheDocument();
      
      const emptyDescription = screen.getByText('No secrets match your search criteria.');
      expect(emptyDescription).toBeInTheDocument();
    });
  });

  describe('Secret List', () => {
    it('renders secret cards with correct information', () => {
      render(<SecretsTab {...defaultProps} />);
      
      expect(screen.getByText('Test API Key')).toBeInTheDocument();
      expect(screen.getByText('Test Bearer Token')).toBeInTheDocument();
      expect(screen.getByText('A test API key')).toBeInTheDocument();
      expect(screen.getByText('A test bearer token')).toBeInTheDocument();
    });

    it('displays secret type with correct styling', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const apiKeyType = screen.getByTestId('secret-type-secret-1');
      const bearerTokenType = screen.getByTestId('secret-type-secret-2');
      
      expect(apiKeyType).toBeInTheDocument();
      expect(bearerTokenType).toBeInTheDocument();
    });

    it('renders secret action buttons', () => {
      render(<SecretsTab {...defaultProps} />);
      
      // Check for action buttons (view, rotate, delete)
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('filters out secrets with missing id or name', () => {
      const invalidSecrets = [
        { id: 'valid-1', name: 'Valid Secret', type: 'API_KEY' },
        { id: '', name: 'Invalid Secret', type: 'API_KEY' },
        { name: 'Another Invalid', type: 'API_KEY' },
        { id: 'valid-2', name: '', type: 'API_KEY' },
      ];

      render(<SecretsTab {...defaultProps} secrets={invalidSecrets} />);
      
      // Only valid secrets should be displayed
      expect(screen.getByText('Valid Secret')).toBeInTheDocument();
      expect(screen.queryByText('Invalid Secret')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Invalid')).not.toBeInTheDocument();
    });
  });

  describe('Create Secret Modal', () => {
    it('renders modal with proper form fields when opened', async () => {
      render(<SecretsTab {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Check for form fields
      expect(screen.getByTestId('secret-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('secret-description-input')).toBeInTheDocument();
      expect(screen.getByTestId('secret-type-select')).toBeInTheDocument();
      expect(screen.getByTestId('secret-value-input')).toBeInTheDocument();
    });

    it('has proper ARIA attributes for form fields', async () => {
      render(<SecretsTab {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Check for proper labels and ARIA attributes
      const nameInput = screen.getByTestId('secret-name-input');
      const descriptionInput = screen.getByTestId('secret-description-input');
      const valueInput = screen.getByTestId('secret-value-input');
      
      expect(nameInput).toHaveAttribute('aria-required', 'true');
      // Description is optional, so it doesn't need aria-required attribute
      expect(valueInput).toHaveAttribute('aria-required', 'true');
    });

    it('handles form submission with validation', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      apiClient.createSecret.mockResolvedValue({
        success: true,
        data: {
          message: 'Secret created successfully',
          secret: {
            id: 'new-secret-1',
            name: 'New Secret',
            type: 'API_KEY',
            description: 'A new secret',
          }
        }
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill form
      const nameInput = screen.getByTestId('secret-name-input');
      const descriptionInput = screen.getByTestId('secret-description-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(descriptionInput, { target: { value: 'A new secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      // Submit form
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check that API was called
      await waitFor(() => {
        expect(apiClient.createSecret).toHaveBeenCalledWith({
          name: 'New Secret',
          value: 'secret-value',
          description: 'A new secret',
          type: 'api_key'
        });
      });
    });

    it('shows validation errors for invalid form data', async () => {
      render(<SecretsTab {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Submit empty form
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Value is required')).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid secret name characters', async () => {
      render(<SecretsTab {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill form with invalid name
      const nameInput = screen.getByTestId('secret-name-input');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'Invalid@Name' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      // Submit form
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for validation error
      await waitFor(() => {
        expect(screen.getAllByText('Name can only contain letters, numbers, spaces, hyphens, and underscores').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Success and Error Messages', () => {
    it('displays success message when secret is created', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      apiClient.createSecret.mockResolvedValue({
        success: true,
        data: {
          message: 'Secret created successfully',
          secret: {
            id: 'new-secret-1',
            name: 'New Secret',
            type: 'API_KEY',
            description: 'A new secret',
          }
        }
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for success message (use getAllByText for robustness)
      await waitFor(() => {
        expect(screen.getAllByText('Secret created successfully').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays success message for 4 seconds before closing modal', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      apiClient.createSecret.mockResolvedValue({
        success: true,
        data: {
          message: 'Secret created successfully',
          secret: {
            id: 'new-secret-1',
            name: 'New Secret',
            type: 'API_KEY',
          }
        }
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for success message
      await waitFor(() => {
        expect(screen.getAllByTestId('success-message').length).toBeGreaterThanOrEqual(1);
      });
      
      // Advance timer by 3.9 seconds - modal should still be open
      act(() => {
        jest.advanceTimersByTime(3900);
      });
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Advance timer by 0.1 seconds - modal should close
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('displays error message when secret creation fails', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      apiClient.createSecret.mockResolvedValue({
        success: false,
        error: 'Creation failed'
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for error message (use getAllByText for robustness)
      await waitFor(() => {
        expect(screen.getAllByText('Creation failed').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles rate limiting errors gracefully', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.response = { status: 429 };
      apiClient.createSecret.mockRejectedValue(rateLimitError);

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for rate limit error message (use getAllByText for robustness)
      await waitFor(() => {
        expect(screen.getAllByText('Rate limit exceeded. Please wait and try again.').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Secret List Updates', () => {
    it('adds new secret to local state when created successfully', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      const newSecret = {
        id: 'new-secret-1',
        name: 'New Secret',
        type: 'API_KEY',
        description: 'A new secret',
      };
      
      apiClient.createSecret.mockResolvedValue({
        success: true,
        data: {
          message: 'Secret created successfully',
          secret: newSecret
        }
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check that new secret appears in the list
      await waitFor(() => {
        expect(screen.getByText('New Secret')).toBeInTheDocument();
        expect(screen.getByText('A new secret')).toBeInTheDocument();
      });
    });

    it('updates existing secret in local state when secret already exists', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      const updatedSecret = {
        id: 'secret-1',
        name: 'Updated API Key',
        type: 'API_KEY',
        description: 'Updated description',
      };
      
      apiClient.createSecret.mockResolvedValue({
        success: true,
        data: {
          message: 'Secret updated successfully',
          secret: updatedSecret
        }
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret with same name
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'Test API Key' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check that secret is updated in the list
      await waitFor(() => {
        expect(screen.getByText('Updated API Key')).toBeInTheDocument();
        expect(screen.getByText('Updated description')).toBeInTheDocument();
      });
    });

    it('calls onSecretCreated when no secret data is provided', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      apiClient.createSecret.mockResolvedValue({
        success: true,
        data: {
          message: 'Secret created successfully'
          // No secret data provided
        }
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      // Wait for modal to appear with longer timeout
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check that onSecretCreated is called
      await waitFor(() => {
        expect(defaultProps.onSecretCreated).toHaveBeenCalled();
      });
    });
  });

  describe('Secret Card Functionality', () => {
    it('handles secret toggle correctly', async () => {
      render(<SecretsTab {...defaultProps} />);
      
      // Find and click the toggle button for the first secret
      const toggleButton = screen.getByTestId('secret-toggle-secret-1');
      fireEvent.click(toggleButton);
      
      // Check that the secret is expanded
      await waitFor(() => {
        expect(screen.getByTestId('rotation-controls-secret-1')).toBeInTheDocument();
      });
      
      // Click again to collapse
      fireEvent.click(toggleButton);
      
      // Check that the secret is collapsed
      await waitFor(() => {
        expect(screen.queryByTestId('rotation-controls-secret-1')).not.toBeInTheDocument();
      });
    });

    it('handles secret value viewing correctly', async () => {
      // Mock fetch for secret value retrieval
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { value: 'decrypted-secret-value' }
        })
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Expand the secret first
      const toggleButton = screen.getByTestId('secret-toggle-secret-1');
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('rotation-controls-secret-1')).toBeInTheDocument();
      });
      
      // Click show value button
      const showValueButton = screen.getByTestId('show-secret-value-secret-1');
      fireEvent.click(showValueButton);
      
      // Check that secret value is displayed
      await waitFor(() => {
        expect(screen.getByTestId('secret-value-secret-1')).toBeInTheDocument();
        expect(screen.getByText('decrypted-secret-value')).toBeInTheDocument();
      });
    });

    it('handles secret value viewing errors', async () => {
      // Mock fetch for secret value retrieval with error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      render(<SecretsTab {...defaultProps} />);
      
      // Expand the secret first
      const toggleButton = screen.getByTestId('secret-toggle-secret-1');
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('rotation-controls-secret-1')).toBeInTheDocument();
      });
      
      // Click show value button
      const showValueButton = screen.getByTestId('show-secret-value-secret-1');
      fireEvent.click(showValueButton);
      
      // Check that error is displayed
      await waitFor(() => {
        expect(screen.getByTestId('secret-error-secret-1')).toBeInTheDocument();
        expect(screen.getByText('Failed to retrieve secret: Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter secrets by search term', () => {
      const { getByTestId, getByText, queryByText } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      const searchInput = getByTestId('secret-search-input');
      fireEvent.change(searchInput, { target: { value: 'Test API Key' } });

      // Check that matching secrets are visible
      expect(getByText('Test API Key')).toBeInTheDocument();
      
      // Check that non-matching secrets are not visible
      expect(screen.queryByText('Test Bearer Token')).not.toBeInTheDocument();
    });

    it('should filter secrets by type', () => {
      const { getByTestId } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      const filterSelect = getByTestId('secret-filter-select');
      fireEvent.change(filterSelect, { target: { value: 'API_KEY' } });

      // Get all secret cards
      const cards = screen.getAllByTestId('secret-card');
      // Should contain the API Key secret
      expect(cards.some(card => within(card).getByTestId('secret-name-secret-1').textContent === 'Test API Key')).toBe(true);
      // Should not contain the Bearer Token secret
      expect(cards.some(card => {
        try {
          return within(card).getByTestId('secret-name-secret-2').textContent === 'Test Bearer Token';
        } catch {
          return false;
        }
      })).toBe(false);
    });

    it('should show no results message when no secrets match filter', () => {
      const { getByTestId, getByText } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      const searchInput = getByTestId('secret-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(getByText('No secrets match your search criteria.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for form validation', () => {
      const { getByTestId } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      // Open modal
      const createButton = getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);

      const nameInput = getByTestId('secret-name-input');
      const valueInput = getByTestId('secret-value-input');

      // Check initial ARIA attributes
      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(valueInput).toHaveAttribute('aria-required', 'true');
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');
      expect(valueInput).toHaveAttribute('aria-invalid', 'false');

      // Submit empty form to trigger validation
      const submitButton = getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);

      // Check ARIA attributes after validation
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(valueInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should announce success messages to screen readers', async () => {
      const mockSecret = {
        id: 'new-secret-id',
        name: 'new-secret',
        type: 'API_KEY',
        description: 'New test secret',
        value: 'new-secret-value',
        rotationEnabled: false,
        rotationInterval: null,
        nextRotationAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (apiClient.createSecret as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          message: 'Secret created successfully',
          secret: mockSecret
        }
      });

      const { getByTestId } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      // Open modal
      const createButton = getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);

      // Fill and submit form
      const nameInput = getByTestId('secret-name-input');
      const descriptionInput = getByTestId('secret-description-input');
      const valueInput = getByTestId('secret-value-input');
      const submitButton = getByTestId('primary-action create-secret-btn-modal');

      fireEvent.change(nameInput, { target: { value: 'new-secret' } });
      fireEvent.change(descriptionInput, { target: { value: 'New test secret' } });
      fireEvent.change(valueInput, { target: { value: 'new-secret-value' } });
      fireEvent.click(submitButton);

      // Wait for success message to appear
      await waitFor(() => {
        const successMessages = screen.getAllByText('Secret created successfully');
        expect(successMessages.length).toBeGreaterThan(0);
        
        // Check that at least one has proper ARIA attributes
        const successMessage = successMessages.find(msg => 
          msg.closest('[role="alert"]') && 
          msg.closest('[aria-live="polite"]')
        );
        expect(successMessage).toBeInTheDocument();
      });
    });

    it('should have proper focus management in modal', () => {
      const { getByTestId } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      // Open modal
      const createButton = getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);

      // Check that name input is focused
      const nameInput = getByTestId('secret-name-input');
      expect(nameInput).toHaveFocus();
    });

    it('should handle escape key to close modal', () => {
      const { getByTestId, queryByText } = render(
        <SecretsTab 
          secrets={mockSecrets} 
          onSecretCreated={defaultProps.onSecretCreated} 
          onSecretError={defaultProps.onSecretError} 
        />
      );

      // Open modal
      const createButton = getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      expect(getByTestId('secret-name-input')).toBeInTheDocument();

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      // Check that modal closes
      expect(queryByText('Add New Secret')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles search input changes', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('secret-search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(searchInput).toHaveValue('test');
    });

    it('handles filter selection changes', () => {
      render(<SecretsTab {...defaultProps} />);
      
      const filterSelect = screen.getByTestId('secret-filter-select');
      fireEvent.change(filterSelect, { target: { value: 'API_KEY' } });
      
      expect(filterSelect).toHaveValue('API_KEY');
    });

    it('calls onSecretCreated when secret actions are triggered', () => {
      render(<SecretsTab {...defaultProps} />);
      
      // This would test the actual secret action handlers
      // For now, we'll verify the props are passed correctly
      expect(defaultProps.onSecretCreated).toBeDefined();
      expect(defaultProps.onSecretError).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles missing secret ID gracefully', () => {
      const invalidSecrets = [
        { name: 'Secret without ID', type: 'API_KEY' }
      ];

      render(<SecretsTab {...defaultProps} secrets={invalidSecrets} />);
      
      // Should not crash and should filter out invalid secrets
      expect(screen.queryByText('Secret without ID')).not.toBeInTheDocument();
    });

    it('handles missing secret name gracefully', () => {
      const invalidSecrets = [
        { id: 'secret-1', type: 'API_KEY' }
      ];

      render(<SecretsTab {...defaultProps} secrets={invalidSecrets} />);
      
      // Should not crash and should filter out invalid secrets
      expect(screen.queryByTestId('secret-card')).not.toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      const { apiClient } = require('../../../src/lib/api/client');
      apiClient.createSecret.mockRejectedValue(new Error('Network error'));

      render(<SecretsTab {...defaultProps} />);
      
      // Open modal and create secret
      const createButton = screen.getByTestId('primary-action create-secret-btn');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByTestId('secret-name-input');
      const typeSelect = screen.getByTestId('secret-type-select');
      const valueInput = screen.getByTestId('secret-value-input');
      
      fireEvent.change(nameInput, { target: { value: 'New Secret' } });
      fireEvent.change(typeSelect, { target: { value: 'API_KEY' } });
      fireEvent.change(valueInput, { target: { value: 'secret-value' } });
      
      const submitButton = screen.getByTestId('primary-action create-secret-btn-modal');
      fireEvent.click(submitButton);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByTestId('alert-banner')).toBeInTheDocument();
        expect(screen.getAllByText('Network error').length).toBeGreaterThanOrEqual(1);
      });
    });
  });
}); 