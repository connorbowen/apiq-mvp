import { render, screen } from '@testing-library/react';
import * as nextNavigation from 'next/navigation';
import ExecutionDetailsPage from '../../../../../../../src/app/workflows/[workflowId]/executions/[executionId]/page';

// Mock the API client
jest.mock('../../../../../../../src/lib/api-client', () => ({
  getExecutionStatus: jest.fn()
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  notFound: jest.fn(),
}));

// Mock the client components
jest.mock('../../../../../../../src/app/workflows/[workflowId]/executions/[executionId]/ExecutionControls', () => {
  return function MockExecutionControls({ status }: { status: string }) {
    return (
      <div data-testid="execution-controls">
        <span data-testid="execution-status">{status}</span>
        {status === 'COMPLETED' && <span data-testid="controls-disabled">Controls Disabled</span>}
      </div>
    );
  };
});

jest.mock('../../../../../../../src/app/workflows/[workflowId]/executions/[executionId]/ExecutionProgress', () => {
  return function MockExecutionProgress() {
    return <div data-testid="execution-progress">Progress Component</div>;
  };
});

jest.mock('../../../../../../../src/app/workflows/[workflowId]/executions/[executionId]/ExecutionLogs', () => {
  return function MockExecutionLogs() {
    return <div data-testid="execution-logs">Logs Component</div>;
  };
});

describe('ExecutionDetailsPage', () => {
  const mockParams = {
    workflowId: 'workflow-123',
    executionId: 'execution-456'
  };

  const mockExecutionData = {
    execution: {
      id: 'execution-456',
      status: 'COMPLETED',
      startedAt: '2025-01-01T10:00:00Z',
      completedAt: '2025-01-01T10:05:00Z',
      executionTime: 300000,
      attemptCount: 1,
      maxAttempts: 3,
      totalSteps: 5,
      completedSteps: 5,
      failedSteps: 0,
      currentStep: 5,
      queueJobId: 'job-789',
      queueName: 'workflow-execution',
      error: null,
      result: { success: true },
      metadata: {},
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:05:00Z'
    },
    workflow: {
      id: 'workflow-123',
      name: 'Test Workflow',
      description: 'A test workflow'
    },
    progress: {
      currentStep: 5,
      totalSteps: 5,
      completedSteps: 5,
      failedSteps: 0,
      progress: 100,
      estimatedTimeRemaining: undefined
    },
    queueJobStatus: {
      state: 'completed',
      retryCount: 0,
      createdOn: '2025-01-01T10:00:00Z'
    },
    recentLogs: [
      {
        id: 'log-1',
        level: 'INFO',
        message: 'Workflow started',
        timestamp: '2025-01-01T10:00:00Z'
      },
      {
        id: 'log-2',
        level: 'INFO',
        message: 'Workflow completed successfully',
        timestamp: '2025-01-01T10:05:00Z'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders execution details with completed status', async () => {
    const { getExecutionStatus } = require('../../../../../../../src/lib/api-client');
    getExecutionStatus.mockResolvedValue({
      success: true,
      data: mockExecutionData
    });

    const page = await ExecutionDetailsPage({ params: mockParams });
    render(page);

    // Check that the page title and workflow name are displayed
    expect(screen.getByText('Execution Details')).toBeInTheDocument();
    expect(screen.getByText('Test Workflow • execution-456')).toBeInTheDocument();

    // Check that the status badge shows COMPLETED using specific testid
    expect(screen.getByTestId('execution-status-badge')).toHaveTextContent('COMPLETED');

    // Check that the execution controls component is rendered
    expect(screen.getByTestId('execution-controls')).toBeInTheDocument();
    expect(screen.getByTestId('execution-status')).toHaveTextContent('COMPLETED');

    // Check that controls are disabled for completed status
    expect(screen.getByTestId('controls-disabled')).toBeInTheDocument();

    // Check that progress and logs components are rendered
    expect(screen.getByTestId('execution-progress')).toBeInTheDocument();
    expect(screen.getByTestId('execution-logs')).toBeInTheDocument();

    // Check that execution details are displayed
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('300s')).toBeInTheDocument();
    expect(screen.getByText('Attempts')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Check that workflow information is displayed
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText('A test workflow')).toBeInTheDocument();
    expect(screen.getByText('Total Steps')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders execution details with running status', async () => {
    const runningExecutionData = {
      ...mockExecutionData,
      execution: {
        ...mockExecutionData.execution,
        status: 'RUNNING',
        completedAt: null,
        executionTime: null,
        currentStep: 2,
        completedSteps: 2,
        failedSteps: 0
      },
      progress: {
        currentStep: 2,
        totalSteps: 5,
        completedSteps: 2,
        failedSteps: 0,
        progress: 40,
        estimatedTimeRemaining: 180000
      }
    };

    const { getExecutionStatus } = require('../../../../../../../src/lib/api-client');
    getExecutionStatus.mockResolvedValue({
      success: true,
      data: runningExecutionData
    });

    const page = await ExecutionDetailsPage({ params: mockParams });
    render(page);

    // Check that the status badge shows RUNNING using specific testid
    expect(screen.getByTestId('execution-status-badge')).toHaveTextContent('RUNNING');

    // Check that the execution controls component is rendered
    expect(screen.getByTestId('execution-controls')).toBeInTheDocument();
    expect(screen.getByTestId('execution-status')).toHaveTextContent('RUNNING');

    // Check that controls are not disabled for running status
    expect(screen.queryByTestId('controls-disabled')).not.toBeInTheDocument();
  });

  it('renders execution details with failed status', async () => {
    const failedExecutionData = {
      ...mockExecutionData,
      execution: {
        ...mockExecutionData.execution,
        status: 'FAILED',
        error: 'Step 3 failed: API timeout',
        completedSteps: 2,
        failedSteps: 1
      },
      progress: {
        currentStep: 3,
        totalSteps: 5,
        completedSteps: 2,
        failedSteps: 1,
        progress: 40
      }
    };

    const { getExecutionStatus } = require('../../../../../../../src/lib/api-client');
    getExecutionStatus.mockResolvedValue({
      success: true,
      data: failedExecutionData
    });

    const page = await ExecutionDetailsPage({ params: mockParams });
    render(page);

    // Check that the status badge shows FAILED using specific testid
    expect(screen.getByTestId('execution-status-badge')).toHaveTextContent('FAILED');

    // Check that error information is displayed
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Step 3 failed: API timeout')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const { getExecutionStatus } = require('../../../../../../../src/lib/api-client');
    getExecutionStatus.mockResolvedValue({
      success: false,
      error: 'Execution not found'
    });

    // Mock notFound to throw an error
    (nextNavigation.notFound as any).mockImplementation(() => {
      throw new Error('Not Found');
    });

    await expect(ExecutionDetailsPage({ params: mockParams })).rejects.toThrow('Not Found');
    expect(nextNavigation.notFound).toHaveBeenCalled();
  });

  it('handles network error gracefully', async () => {
    const { getExecutionStatus } = require('../../../../../../../src/lib/api-client');
    getExecutionStatus.mockRejectedValue(new Error('Network error'));

    // Mock notFound to throw an error
    (nextNavigation.notFound as any).mockImplementation(() => {
      throw new Error('Not Found');
    });

    await expect(ExecutionDetailsPage({ params: mockParams })).rejects.toThrow('Not Found');
    expect(nextNavigation.notFound).toHaveBeenCalled();
  });
}); 