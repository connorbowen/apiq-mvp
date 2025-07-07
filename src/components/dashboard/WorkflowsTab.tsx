'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

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
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'RUNNING':
        return (
          <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'PAUSED':
        return (
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ERROR':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      // TODO: Implement delete workflow API call
      setShowDeleteDialog(false);
      setWorkflowToDelete(null);
      onWorkflowCreated(); // Refresh the list
    } catch (error) {
      onWorkflowError('Failed to delete workflow');
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
      setIsLoading(true);
      // TODO: Implement toggle workflow API call
      onWorkflowCreated(); // Refresh the list
    } catch (error) {
      onWorkflowError('Failed to toggle workflow status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      setIsLoading(true);
      // TODO: Implement execute workflow API call
      onWorkflowCreated(); // Refresh the list
    } catch (error) {
      onWorkflowError('Failed to execute workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || workflow.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div data-testid="workflows-management">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-600">Manage your automated workflows and integrations</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="workflow-search-input" className="sr-only">Search workflows</label>
          <input
            id="workflow-search-input"
            data-testid="search-input"
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px] min-w-[200px]"
          />
        </div>
        <div className="sm:w-48 min-w-0">
          <label htmlFor="workflow-filter-select" className="sr-only">Filter by status</label>
          <select
            id="workflow-filter-select"
            data-testid="workflow-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px] min-w-[200px]"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="ERROR">Error</option>
          </select>
        </div>
        <Link
          href="/workflows/create"
          data-testid="create-workflow-btn primary-action"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors text-center min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          Create Workflow
        </Link>
      </div>

      {/* Workflows List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
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
                  data-testid="primary-action"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Workflow
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredWorkflows.map((workflow) => (
              <li key={workflow.id} data-testid="workflow-card">
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
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/workflows/${workflow.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-indigo-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        View
                      </Link>
                      <button
                        data-testid={`execute-workflow-${workflow.id}`}
                        onClick={() => handleExecuteWorkflow(workflow.id)}
                        className="text-green-600 hover:text-green-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-green-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        disabled={isLoading}
                      >
                        Execute
                      </button>
                      <button
                        onClick={() => handleToggleWorkflow(workflow.id, workflow.status)}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        disabled={isLoading}
                      >
                        {workflow.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
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
        >
          Refresh
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-4">Delete Workflow</h2>
            <p className="text-sm text-gray-700 mb-6">Are you sure you want to delete this workflow{workflowToDelete?.name ? ` "${workflowToDelete.name}"` : ''}? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={handleConfirmDelete}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px] min-w-[44px]"
                disabled={isLoading}
                autoFocus
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