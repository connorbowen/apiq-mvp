'use client';

import { useState } from 'react';
import { pauseExecution, resumeExecution, cancelExecution } from '../../../../../lib/api-client';

interface ExecutionControlsProps {
  executionId: string;
  status: string;
  workflowId: string;
}

export default function ExecutionControls({ executionId, status, workflowId }: ExecutionControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const handleAction = async (actionType: 'pause' | 'resume' | 'cancel') => {
    setIsLoading(true);
    setAction(actionType);
    
    try {
      switch (actionType) {
        case 'pause':
          await pauseExecution(executionId);
          break;
        case 'resume':
          await resumeExecution(executionId);
          break;
        case 'cancel':
          await cancelExecution(executionId);
          break;
      }
      
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error(`Failed to ${actionType} execution:`, error);
      alert(`Failed to ${actionType} execution. Please try again.`);
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const canPause = status === 'RUNNING' || status === 'PENDING';
  const canResume = status === 'PAUSED';
  const canCancel = status === 'RUNNING' || status === 'PENDING' || status === 'PAUSED';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {canPause && (
          <button
            onClick={() => handleAction('pause')}
            disabled={isLoading}
            data-testid="primary-action pause-workflow-btn"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && action === 'pause' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Pausing...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </>
            )}
          </button>
        )}

        {canResume && (
          <button
            onClick={() => handleAction('resume')}
            disabled={isLoading}
            data-testid="primary-action resume-workflow-btn"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && action === 'resume' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resuming...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </>
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={isLoading}
            data-testid="primary-action cancel-workflow-btn"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && action === 'cancel' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cancelling...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            )}
          </button>
        )}
      </div>

      {!canPause && !canResume && !canCancel && (
        <p className="text-sm text-gray-500">
          No actions available for execution in status: <span className="font-medium">{status}</span>
        </p>
      )}
    </div>
  );
} 