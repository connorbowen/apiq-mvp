import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getExecutionStatus } from '../../../../../lib/api-client';
import ExecutionControls from './ExecutionControls';
import ExecutionLogs from './ExecutionLogs';
import ExecutionProgress from './ExecutionProgress';

interface ExecutionDetailsPageProps {
  params: {
    workflowId: string;
    executionId: string;
  };
}

async function getExecutionData(executionId: string) {
  try {
    const response = await getExecutionStatus(executionId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch execution status');
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching execution data:', error);
    return null;
  }
}

export default async function ExecutionDetailsPage({ params }: ExecutionDetailsPageProps) {
  const { workflowId, executionId } = params;
  
  const executionData = await getExecutionData(executionId);
  
  if (!executionData) {
    notFound();
  }

  const { execution, workflow, progress, queueJobStatus, recentLogs } = executionData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Execution Details
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {workflow.name} • {executionId}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span 
                  data-testid="execution-status-badge"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    execution.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    execution.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    execution.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                    execution.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                    execution.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                  {execution.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Execution Info & Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Execution Progress */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Progress</h2>
                </div>
                <div className="p-6">
                  <Suspense fallback={<div className="animate-pulse h-4 bg-gray-200 rounded"></div>}>
                    <ExecutionProgress 
                      progress={progress} 
                      execution={execution}
                      queueJobStatus={queueJobStatus}
                    />
                  </Suspense>
                </div>
              </div>

              {/* Execution Controls */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Controls</h2>
                </div>
                <div className="p-6">
                  <Suspense fallback={<div className="animate-pulse h-10 bg-gray-200 rounded"></div>}>
                    <ExecutionControls 
                      executionId={executionId}
                      status={execution.status}
                      workflowId={workflowId}
                    />
                  </Suspense>
                </div>
              </div>

              {/* Execution Logs */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Recent Logs</h2>
                </div>
                <div className="p-6">
                  <Suspense fallback={<div className="space-y-2"><div className="animate-pulse h-4 bg-gray-200 rounded"></div><div className="animate-pulse h-4 bg-gray-200 rounded"></div></div>}>
                    <ExecutionLogs 
                      executionId={executionId}
                      initialLogs={recentLogs}
                    />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Right Column - Execution Details */}
            <div className="space-y-6">
              {/* Execution Details */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Details</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Started</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(execution.startedAt).toLocaleString()}
                    </dd>
                  </div>
                  
                  {execution.completedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Completed</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(execution.completedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  
                  {execution.executionTime && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {Math.round(execution.executionTime / 1000)}s
                      </dd>
                    </div>
                  )}
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Attempts</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {execution.attemptCount} / {execution.maxAttempts}
                    </dd>
                  </div>
                  
                  {execution.queueJobId && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Queue Job</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">
                        {execution.queueJobId}
                      </dd>
                    </div>
                  )}
                  
                  {execution.error && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Error</dt>
                      <dd className="mt-1 text-sm text-red-600">
                        {execution.error}
                      </dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow Info */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Workflow</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{workflow.name}</dd>
                  </div>
                  
                  {workflow.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">{workflow.description}</dd>
                    </div>
                  )}
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Steps</dt>
                    <dd className="mt-1 text-sm text-gray-900">{execution.totalSteps}</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 