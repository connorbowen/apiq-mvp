/**
 * TODO: UX SIMPLIFICATION - WORKFLOWS TAB PHASE 2.1 CHANGES - @connorbowen 2024-12-19
 * 
 * PHASE 2.1: Redesign dashboard layout with 3-tab structure
 * - [ ] ENHANCE: WorkflowsTab remains as one of 3 main tabs
 * - [ ] Integrate recent activity from OverviewTab
 * - [ ] Add workflow status metrics from OverviewTab
 * - [ ] Improve workflow management interface
 * - [ ] Add tests: tests/unit/components/dashboard/WorkflowsTab.test.tsx
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test enhanced workflows tab
 * 
 * PHASE 2.2: Progressive disclosure
 * - [ ] Show basic workflow management for new users
 * - [ ] Progressive reveal of advanced workflow features
 * - [ ] Show workflow templates based on user experience
 * - [ ] Add tests: tests/unit/components/ProgressiveDisclosure.test.tsx
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add tour steps for workflow management
 * - [ ] Interactive tutorial for workflow creation
 * - [ ] Add tests: tests/unit/components/GuidedTour.test.tsx
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize workflow management for mobile screens
 * - [ ] Improve mobile workflow creation flow
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile workflows
 * 
 * ENHANCEMENT PLAN:
 * - Add activity feed from OverviewTab
 * - Integrate workflow metrics
 * - Improve workflow status visualization
 * - Add quick workflow actions
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api/client';

interface WorkflowsTabProps {
  workflows: any[];
  onWorkflowCreated: () => void;
  onWorkflowError: (error: string) => void;
}

export default function WorkflowsTab({ 
  workflows, 
  onWorkflowCreated, 
  onWorkflowError 
}: WorkflowsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string, name: string } | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Clear announcements after 3 seconds
  const clearAnnouncement = useCallback(() => {
    setTimeout(() => setAnnouncement(''), 3000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Active workflow" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'RUNNING':
        return (
          <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Running workflow" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'PAUSED':
        return (
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Paused workflow" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ERROR':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Error workflow" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Default workflow" role="img">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const handleDeleteWorkflow = (workflowId: string, workflowName: string) => {
    setWorkflowToDelete({ id: workflowId, name: workflowName });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!workflowToDelete) return;
    
    try {
      setIsLoading(true);
      setAnnouncement('Deleting workflow...');
      
      const response = await apiClient.deleteWorkflow(workflowToDelete.id);
      
      if (response.success) {
        setAnnouncement(`Workflow "${workflowToDelete.name}" deleted successfully`);
        setShowDeleteDialog(false);
        setWorkflowToDelete(null);
        onWorkflowCreated(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete workflow');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to delete workflow';
      setAnnouncement(`Error: ${errorMsg}`);
      onWorkflowError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setWorkflowToDelete(null);
  };

  const handleToggleWorkflow = async (workflowId: string, currentStatus: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [workflowId]: true }));
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      setAnnouncement(`${newStatus === 'ACTIVE' ? 'Activating' : 'Pausing'} workflow...`);
      
      const response = await apiClient.updateWorkflow(workflowId, { status: newStatus });
      
      if (response.success) {
        setAnnouncement(`Workflow ${newStatus === 'ACTIVE' ? 'activated' : 'paused'} successfully`);
        onWorkflowCreated(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to toggle workflow status');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to toggle workflow status';
      setAnnouncement(`Error: ${errorMsg}`);
      onWorkflowError(errorMsg);
    } finally {
      setActionLoading(prev => ({ ...prev, [workflowId]: false }));
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [workflowId]: true }));
      setAnnouncement('Executing workflow...');
      
      const response = await apiClient.executeWorkflow(workflowId);
      
      if (response.success) {
        setAnnouncement('Workflow execution started successfully');
        onWorkflowCreated(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to execute workflow');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to execute workflow';
      setAnnouncement(`Error: ${errorMsg}`);
      onWorkflowError(errorMsg);
    } finally {
      setActionLoading(prev => ({ ...prev, [workflowId]: false }));
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || workflow.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDeleteDialog(false);
      setWorkflowToDelete(null);
      setAnnouncement('Dialog closed');
    }
  }, []);

  return (
    <div 
      data-testid="workflows-management" 
      role="region" 
      aria-labelledby="workflows-heading"
      onKeyDown={handleKeyDown}
      className="focus:outline-none"
    >
      {/* ARIA live region for announcements */}
      <div 
        id="aria-live-announcements" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Header */}
      <div className="mb-6">
        <h2 id="workflows-heading" className="text-2xl font-semibold text-gray-900 mb-2">Workflows</h2>
        <p className="text-gray-600">Manage your automated workflows and integrations</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="workflow-search-input" className="block text-sm font-medium text-gray-700 mb-1">
            Search workflows
          </label>
          <input
            id="workflow-search-input"
            data-testid="search-input"
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px] min-w-[200px] transition-colors duration-200"
            aria-describedby="search-help"
            aria-label="Search workflows by name or description"
          />
          <div id="search-help" className="sr-only">Search through your workflows by name or description</div>
        </div>
        <div className="sm:w-48 min-w-0">
          <label htmlFor="workflow-filter-select" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by status
          </label>
          <select
            id="workflow-filter-select"
            data-testid="workflow-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px] min-w-[200px] transition-colors duration-200"
            aria-describedby="filter-help"
            aria-label="Filter workflows by status"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="ERROR">Error</option>
          </select>
          <div id="filter-help" className="sr-only">Filter workflows by their current status</div>
        </div>
        <Link
          href="/workflows/create"
          data-testid="primary-action create-workflow-btn"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors text-center min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Create a new workflow"
        >
          Create Workflow
        </Link>
      </div>

      {/* Workflows List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12" role="status" aria-live="polite">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'No workflows match your search criteria.'
                : 'Get started by creating your first workflow.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <Link
                  href="/workflows/create"
                  data-testid="primary-action create-workflow-btn-empty-state"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                  aria-label="Create your first workflow"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Workflow
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200" role="list" aria-label="Workflows list">
            {filteredWorkflows.map((workflow) => (
              <li key={workflow.id} data-testid="workflow-card" role="listitem">
                <Link
                  href={`/workflows/${workflow.id}`}
                  className="block hover:bg-gray-50 transition-colors duration-200"
                  aria-label={`View details for workflow ${workflow.name}`}
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            {getStatusIcon(workflow.status)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">{workflow.name}</p>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                              {workflow.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{workflow.description}</p>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span className="mr-4" data-testid="workflow-steps">Steps: {workflow.steps?.length || 0}</span>
                            <span data-testid="workflow-last-run">Last run: {workflow.lastRun ? new Date(workflow.lastRun).toLocaleDateString() : 'Never'}</span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span data-testid="workflow-status">Status: {workflow.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          data-testid={`execute-workflow-${workflow.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleExecuteWorkflow(workflow.id);
                          }}
                          className="text-green-600 hover:text-green-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-green-50 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors duration-200"
                          disabled={isLoading || actionLoading[workflow.id]}
                          aria-label={`Execute workflow ${workflow.name}`}
                          aria-busy={actionLoading[workflow.id]}
                        >
                          {actionLoading[workflow.id] ? 'Executing...' : 'Execute'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleWorkflow(workflow.id, workflow.status);
                          }}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors duration-200"
                          disabled={isLoading || actionLoading[workflow.id]}
                          aria-label={`${workflow.status === 'ACTIVE' ? 'Pause' : 'Activate'} workflow ${workflow.name}`}
                          aria-busy={actionLoading[workflow.id]}
                        >
                          {actionLoading[workflow.id] ? 'Updating...' : (workflow.status === 'ACTIVE' ? 'Pause' : 'Activate')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id, workflow.name);
                          }}
                          className="text-red-600 hover:text-red-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors duration-200"
                          disabled={isLoading || actionLoading[workflow.id]}
                          aria-label={`Delete workflow ${workflow.name}`}
                          aria-busy={actionLoading[workflow.id]}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-4 flex justify-end">
        <button
          data-testid="refresh-workflows"
          onClick={() => onWorkflowCreated()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Refresh workflows list"
        >
          Refresh
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="delete-dialog-title" 
          aria-describedby="delete-dialog-description"
          data-testid="delete-workflow-dialog"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-4">Delete Workflow</h2>
            <p id="delete-dialog-description" className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete this workflow{workflowToDelete?.name ? ` "${workflowToDelete.name}"` : ''}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px] transition-colors duration-200"
                aria-label="Cancel workflow deletion"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={handleConfirmDelete}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px] min-w-[44px] transition-colors duration-200"
                disabled={isLoading}
                autoFocus
                aria-label="Confirm workflow deletion"
                aria-busy={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 