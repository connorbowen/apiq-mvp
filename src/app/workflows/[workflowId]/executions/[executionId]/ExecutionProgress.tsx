'use client';

interface ExecutionProgressProps {
  progress: {
    currentStep: number;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    progress: number;
    estimatedTimeRemaining?: number;
  } | null;
  execution: any;
  queueJobStatus: any;
}

export default function ExecutionProgress({ progress, execution, queueJobStatus }: ExecutionProgressProps) {
  if (!progress) {
    return (
      <div className="text-sm text-gray-500">
        Progress information not available
      </div>
    );
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="space-y-4" data-testid="execution-progress">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Step Information */}
      <div className="grid grid-cols-2 gap-4 text-sm" data-testid="step-execution">
        <div>
          <dt className="text-gray-500">Current Step</dt>
          <dd className="font-medium text-gray-900">
            {progress.currentStep} of {progress.totalSteps}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Completed Steps</dt>
          <dd className="font-medium text-gray-900">
            {progress.completedSteps}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Failed Steps</dt>
          <dd className="font-medium text-red-600">
            {progress.failedSteps}
          </dd>
        </div>
        {progress.estimatedTimeRemaining && (
          <div>
            <dt className="text-gray-500">Estimated Time Remaining</dt>
            <dd className="font-medium text-gray-900">
              {formatTime(progress.estimatedTimeRemaining)}
            </dd>
          </div>
        )}
      </div>

      {/* Queue Status */}
      {queueJobStatus && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Queue Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">State:</span>
              <span className={`ml-1 font-medium ${
                queueJobStatus.state === 'completed' ? 'text-green-600' :
                queueJobStatus.state === 'failed' ? 'text-red-600' :
                queueJobStatus.state === 'active' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                {queueJobStatus.state}
              </span>
            </div>
            {queueJobStatus.retryCount !== undefined && (
              <div>
                <span className="text-gray-500">Retries:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {queueJobStatus.retryCount}
                </span>
              </div>
            )}
            {queueJobStatus.createdOn && (
              <div className="col-span-2">
                <span className="text-gray-500">Created:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {new Date(queueJobStatus.createdOn).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Execution Status Details */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md" data-testid="execution-status">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Execution Details</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-1 font-medium ${
              execution.status === 'COMPLETED' ? 'text-green-600' :
              execution.status === 'FAILED' ? 'text-red-600' :
              execution.status === 'RUNNING' ? 'text-blue-600' :
              execution.status === 'PAUSED' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {execution.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Attempts:</span>
            <span className="ml-1 font-medium text-gray-900">
              {execution.attemptCount} / {execution.maxAttempts}
            </span>
          </div>
          {execution.executionTime && (
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-1 font-medium text-gray-900">
                {formatTime(execution.executionTime)}
              </span>
            </div>
          )}
          {execution.queueJobId && (
            <div className="col-span-2">
              <span className="text-gray-500">Job ID:</span>
              <span className="ml-1 font-mono text-xs text-gray-900">
                {execution.queueJobId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 