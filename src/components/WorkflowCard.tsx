'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description?: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    stepCount: number;
    executionCount: number;
    lastExecuted?: string;
    lastExecutionId?: string;
    createdAt: string;
    updatedAt: string;
  };
  onDelete?: (id: string) => void;
  onExecute?: (id: string) => void;
}

export default function WorkflowCard({ workflow, onDelete, onExecute }: WorkflowCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'DRAFT':
        return 'text-blue-600 bg-blue-100';
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100';
      case 'ARCHIVED':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'DRAFT':
        return 'Draft';
      case 'PAUSED':
        return 'Paused';
      case 'ARCHIVED':
        return 'Archived';
      default:
        return status;
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;
    
    if (confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(workflow.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleExecute = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onExecute) return;
    
    setIsExecuting(true);
    try {
      await onExecute(workflow.id);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Link href={`/workflows/${workflow.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {workflow.name}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                  {getStatusLabel(workflow.status)}
                </span>
              </div>
              
              {workflow.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {workflow.description}
                </p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {workflow.stepCount} steps
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {workflow.executionCount} runs
                </div>
                {workflow.lastExecuted && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(workflow.lastExecuted)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Updated {formatDate(workflow.updatedAt)}
            </div>
            
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              {workflow.lastExecutionId && (
                <Link
                  href={`/workflows/${workflow.id}/executions/${workflow.lastExecutionId}`}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  Monitor
                </Link>
              )}
              
              {workflow.status === 'ACTIVE' && onExecute && (
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isExecuting ? 'Running...' : 'Run'}
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
} 