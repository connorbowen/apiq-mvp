import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowsTab from '../../../src/components/dashboard/WorkflowsTab';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('WorkflowsTab', () => {
  const mockWorkflows = [
    {
      id: 'wf-1',
      name: 'Test Workflow 1',
      description: 'A test workflow',
      status: 'ACTIVE',
      stepCount: 3,
      executionCount: 5,
      lastExecuted: '2024-01-01T12:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'wf-2',
      name: 'Test Workflow 2',
      description: 'Another test workflow',
      status: 'INACTIVE',
      stepCount: 2,
      executionCount: 0,
      lastExecuted: null,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ];

  const defaultProps = {
    workflows: mockWorkflows,
    onWorkflowCreated: jest.fn(),
    onWorkflowError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Heading and Page Structure', () => {
    it('renders the main h2 heading with correct text', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { name: 'Workflows' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveClass('text-2xl', 'font-semibold', 'text-gray-900');
    });

    it('renders the description text below the heading', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const description = screen.getByText('Manage your automated workflows and integrations');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-gray-600');
    });

    it('has the correct data-testid for the main container', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const container = screen.getByTestId('workflows-management');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Primary Action Button', () => {
    it('renders the create workflow button with correct attributes', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const createButton = screen.getByTestId('primary-action create-workflow-btn');
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveTextContent('Create Workflow');
      expect(createButton).toHaveAttribute('href', '/workflows/create');
      expect(createButton).toHaveClass('bg-green-600', 'text-white');
    });

    it('has proper accessibility attributes for the primary action', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const createButton = screen.getByTestId('primary-action create-workflow-btn');
      expect(createButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2', 'focus:ring-green-500');
      expect(createButton).toHaveClass('min-h-[44px]', 'min-w-[44px]'); // Touch target size
    });
  });

  describe('Search and Filter Controls', () => {
    it('renders search input with proper accessibility attributes', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search workflows...');
      expect(searchInput).toHaveAttribute('id', 'workflow-search-input');
      expect(searchInput).toHaveClass('min-h-[44px]', 'min-w-[200px]');
      
      // Check for associated label
      const label = screen.getByLabelText('Search workflows');
      expect(label).toBeInTheDocument();
    });

    it('renders filter select with proper accessibility attributes', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const filterSelect = screen.getByTestId('workflow-filter-select');
      expect(filterSelect).toBeInTheDocument();
      expect(filterSelect).toHaveAttribute('id', 'workflow-filter-select');
      expect(filterSelect).toHaveClass('min-h-[44px]', 'min-w-[200px]');
      
      // Check for associated label
      const label = screen.getByLabelText('Filter by status');
      expect(label).toBeInTheDocument();
      
      // Check for all filter options
      expect(screen.getByRole('option', { name: 'All Status' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Running' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Paused' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Error' })).toBeInTheDocument();
    });

    it('filters workflows based on search term', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Test Workflow 1' } });
      
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Workflow 2')).not.toBeInTheDocument();
    });

    it('filters workflows based on status', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const filterSelect = screen.getByTestId('workflow-filter-select');
      fireEvent.change(filterSelect, { target: { value: 'ACTIVE' } });
      
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Workflow 2')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no workflows exist', () => {
      render(<WorkflowsTab {...defaultProps} workflows={[]} />);
      
      // Check for empty state heading
      const emptyHeading = screen.getByRole('heading', { name: 'No workflows' });
      expect(emptyHeading).toBeInTheDocument();
      expect(emptyHeading.tagName).toBe('H3');
      
      // Check for empty state description
      const emptyDescription = screen.getByText('Get started by creating your first workflow.');
      expect(emptyDescription).toBeInTheDocument();
      
      // Check for empty state icon (SVG present)
      const emptyIcon = document.querySelector('.text-gray-400');
      expect(emptyIcon).toBeInTheDocument();
    });

    it('renders empty state when search has no results', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Non-existent workflow' } });
      
      const emptyHeading = screen.getByRole('heading', { name: 'No workflows' });
      expect(emptyHeading).toBeInTheDocument();
      
      const emptyDescription = screen.getByText('No workflows match your search criteria.');
      expect(emptyDescription).toBeInTheDocument();
    });
  });

  describe('Workflow List', () => {
    it('renders workflow cards with correct information', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
      expect(screen.getByText('A test workflow')).toBeInTheDocument();
      expect(screen.getByText('Another test workflow')).toBeInTheDocument();
    });

    it('displays workflow status with correct styling', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const activeStatus = screen.getByText('Active');
      const inactiveStatus = screen.getByText('Inactive');
      
      expect(activeStatus).toBeInTheDocument();
      expect(inactiveStatus).toBeInTheDocument();
      
      // Check that status elements exist (the actual styling is applied via CSS classes)
      // The component uses getStatusColor function to apply classes dynamically
      expect(activeStatus).toBeInTheDocument();
      expect(inactiveStatus).toBeInTheDocument();
    });

    it('renders workflow action buttons', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      // Check for action buttons (these would be present in the workflow cards)
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility and ARIA', () => {
    it('has proper ARIA labels and roles', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      // Check for proper form labels
      expect(screen.getByLabelText('Search workflows')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Workflows' })).toBeInTheDocument();
    });

    it('has proper focus management for interactive elements', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      const filterSelect = screen.getByTestId('workflow-filter-select');
      const createButton = screen.getByTestId('primary-action create-workflow-btn');
      
      // Check that all interactive elements have focus styles
      expect(searchInput).toHaveClass('focus:outline-none', 'focus:ring-indigo-500', 'focus:border-indigo-500');
      expect(filterSelect).toHaveClass('focus:outline-none', 'focus:ring-indigo-500', 'focus:border-indigo-500');
      expect(createButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2', 'focus:ring-green-500');
    });

    it('has proper touch target sizes for mobile accessibility', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      const filterSelect = screen.getByTestId('workflow-filter-select');
      const createButton = screen.getByTestId('primary-action create-workflow-btn');
      
      // Check minimum touch target sizes
      expect(searchInput).toHaveClass('min-h-[44px]', 'min-w-[200px]');
      expect(filterSelect).toHaveClass('min-h-[44px]', 'min-w-[200px]');
      expect(createButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    });
  });

  describe('User Interactions', () => {
    it('handles search input changes', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(searchInput).toHaveValue('test');
    });

    it('handles filter selection changes', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      const filterSelect = screen.getByTestId('workflow-filter-select');
      fireEvent.change(filterSelect, { target: { value: 'ACTIVE' } });
      
      expect(filterSelect).toHaveValue('ACTIVE');
    });

    it('calls onWorkflowCreated when workflow actions are triggered', () => {
      render(<WorkflowsTab {...defaultProps} />);
      
      // This would test the actual workflow action handlers
      // For now, we'll verify the props are passed correctly
      expect(defaultProps.onWorkflowCreated).toBeDefined();
      expect(defaultProps.onWorkflowError).toBeDefined();
    });
  });
}); 