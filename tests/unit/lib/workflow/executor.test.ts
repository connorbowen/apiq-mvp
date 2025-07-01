import { WorkflowExecutor, createWorkflowExecutor, ExecutionConfig } from '../../../../src/lib/workflow/executor';
import { ExecutionStateManager, ExecutionState, ExecutionMetrics } from '../../../../src/lib/workflow/executionStateManager';
import { QueueService } from '../../../../src/lib/queue/queueService';
import { stepRunner } from '../../../../src/lib/workflow/stepRunner';

// Mock dependencies
jest.mock('../../../../src/lib/workflow/stepRunner');
jest.mock('../../../../src/lib/queue/queueService');
jest.mock('../../../../src/utils/logger');
jest.mock('../../../../lib/database/client', () => ({
  prisma: {
    executionLog: {
      findMany: jest.fn()
    }
  }
}));

const mockStateManager = {
  createExecution: jest.fn(),
  updateStatus: jest.fn(),
  updateProgress: jest.fn(),
  setQueueJob: jest.fn(),
  getExecutionState: jest.fn(),
  getExecutionProgress: jest.fn(),
  pauseExecution: jest.fn(),
  resumeExecution: jest.fn(),
  cancelExecution: jest.fn(),
  getExecutionMetrics: jest.fn(),
  getStuckExecutions: jest.fn(),
  getRetryableExecutions: jest.fn(),
  getPausedExecutions: jest.fn(),
  resetExecutionForRetry: jest.fn(),
  cleanupOldExecutions: jest.fn()
} as unknown as ExecutionStateManager;

const mockQueueService = {
  submitJob: jest.fn(),
  cancelJob: jest.fn(),
  getJobStatus: jest.fn()
} as unknown as QueueService;

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new WorkflowExecutor({}, mockStateManager, mockQueueService);
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultExecutor = new WorkflowExecutor({}, mockStateManager, mockQueueService);
      
      // Access private config through a test method or check behavior
      expect(defaultExecutor).toBeInstanceOf(WorkflowExecutor);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: ExecutionConfig = {
        maxConcurrency: 5,
        timeout: 600000,
        maxRetries: 5,
        useQueue: false
      };

      const customExecutor = new WorkflowExecutor(customConfig, mockStateManager, mockQueueService);
      expect(customExecutor).toBeInstanceOf(WorkflowExecutor);
    });
  });

  describe('executeWorkflow', () => {
    const mockWorkflow = {
      id: 'workflow-123',
      name: 'Test Workflow'
    };

    const mockSteps = [
      { id: 'step-1', stepOrder: 1, name: 'Step 1', action: 'noop' },
      { id: 'step-2', stepOrder: 2, name: 'Step 2', action: 'noop' }
    ];

    const mockExecution = {
      id: 'exec-123',
      workflowId: 'workflow-123',
      userId: 'user-123',
      status: 'PENDING',
      totalSteps: 2,
      maxAttempts: 3,
      attemptCount: 0,
      completedSteps: 0,
      failedSteps: 0,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      (mockStateManager.createExecution as jest.Mock).mockResolvedValue(mockExecution);
      (mockStateManager.updateStatus as jest.Mock).mockResolvedValue(mockExecution);
      (mockStateManager.updateProgress as jest.Mock).mockResolvedValue(mockExecution);
      (stepRunner.executeStep as jest.Mock).mockResolvedValue({
        success: true,
        data: { message: 'Step completed' },
        duration: 100,
        retryCount: 0
      });
    });

    it('should execute workflow successfully', async () => {
      const result = await executor.executeWorkflow(mockWorkflow, mockSteps, 'user-123');

      expect(mockStateManager.createExecution).toHaveBeenCalledWith(
        'workflow-123',
        'user-123',
        2,
        3,
        { parameters: {}, workflowName: 'Test Workflow' }
      );

      expect(mockStateManager.updateStatus).toHaveBeenCalledWith('exec-123', 'RUNNING');
      expect(mockStateManager.updateStatus).toHaveBeenCalledWith('exec-123', 'COMPLETED', expect.any(Object));

      expect(result).toMatchObject({
        success: true,
        executionId: 'exec-123',
        status: 'COMPLETED',
        totalSteps: 2,
        completedSteps: 2,
        failedSteps: 0
      });
    });

    it('should handle workflow execution failure', async () => {
      (stepRunner.executeStep as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Step failed',
        duration: 100,
        retryCount: 0
      });

      const result = await executor.executeWorkflow(mockWorkflow, mockSteps, 'user-123');

      expect(result).toMatchObject({
        success: false,
        executionId: 'exec-123',
        status: 'FAILED',
        totalSteps: 2,
        completedSteps: 0,
        failedSteps: 2
      });
    }, 20000);

    it('should handle execution errors', async () => {
      (mockStateManager.updateStatus as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await executor.executeWorkflow(mockWorkflow, mockSteps, 'user-123');

      expect(result).toMatchObject({
        success: false,
        executionId: 'exec-123',
        status: 'FAILED',
        error: 'Database error'
      });
    });

    it('should handle paused execution', async () => {
      (mockStateManager.getExecutionState as jest.Mock).mockResolvedValue({
        status: 'PAUSED'
      });

      const result = await executor.executeWorkflow(mockWorkflow, mockSteps, 'user-123');

      expect(result).toMatchObject({
        success: false,
        status: 'FAILED',
        error: 'Execution paused by user'
      });
    });

    it('should handle cancelled execution', async () => {
      (mockStateManager.getExecutionState as jest.Mock).mockResolvedValue({
        status: 'CANCELLED'
      });

      const result = await executor.executeWorkflow(mockWorkflow, mockSteps, 'user-123');

      expect(result).toMatchObject({
        success: false,
        status: 'FAILED',
        error: 'Execution cancelled by user'
      });
    });
  });

  describe('submitWorkflowForExecution', () => {
    const mockWorkflow = {
      id: 'workflow-123',
      name: 'Test Workflow'
    };

    const mockSteps = [
      { id: 'step-1', stepOrder: 1, name: 'Step 1' }
    ];

    const mockExecution = {
      id: 'exec-123',
      workflowId: 'workflow-123',
      userId: 'user-123',
      status: 'PENDING'
    };

    beforeEach(() => {
      (mockStateManager.createExecution as jest.Mock).mockResolvedValue(mockExecution);
      (mockStateManager.setQueueJob as jest.Mock).mockResolvedValue(mockExecution);
      (mockQueueService.submitJob as jest.Mock).mockResolvedValue({ jobId: 'job-123' });
    });

    it('should submit workflow for queue execution', async () => {
      const result = await executor.submitWorkflowForExecution(
        mockWorkflow,
        mockSteps,
        'user-123',
        { param: 'value' }
      );

      expect(mockStateManager.createExecution).toHaveBeenCalledWith(
        'workflow-123',
        'user-123',
        1,
        3,
        { parameters: { param: 'value' }, workflowName: 'Test Workflow' }
      );

      expect(mockQueueService.submitJob).toHaveBeenCalledWith({
        queueName: 'workflow-execution',
        name: 'execute-workflow',
        data: expect.objectContaining({
          executionId: 'exec-123',
          workflowId: 'workflow-123',
          userId: 'user-123',
          steps: mockSteps,
          parameters: { param: 'value' }
        }),
        retryLimit: 3,
        retryDelay: 5000,
        timeout: 300000
      });

      expect(mockStateManager.setQueueJob).toHaveBeenCalledWith('exec-123', 'job-123', 'workflow-execution');

      expect(result).toEqual({
        executionId: 'exec-123',
        queueJobId: 'job-123'
      });
    });

    it('should throw error when queue execution is disabled', async () => {
      const noQueueExecutor = new WorkflowExecutor({ useQueue: false }, mockStateManager, mockQueueService);

      await expect(noQueueExecutor.submitWorkflowForExecution(mockWorkflow, mockSteps, 'user-123'))
        .rejects.toThrow('Queue execution is disabled');
    });
  });

  describe('execution control methods', () => {
    it('should pause execution', async () => {
      await executor.pauseExecution('exec-123', 'user-123');

      expect(mockStateManager.pauseExecution).toHaveBeenCalledWith('exec-123', 'user-123');
    });

    it('should resume execution', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'PENDING',
        queueName: 'workflow-execution'
      };

      (mockStateManager.resumeExecution as jest.Mock).mockResolvedValue(mockExecution);

      await executor.resumeExecution('exec-123', 'user-123');

      expect(mockStateManager.resumeExecution).toHaveBeenCalledWith('exec-123', 'user-123');
    });

    it('should cancel execution', async () => {
      await executor.cancelExecution('exec-123', 'user-123');

      expect(mockStateManager.cancelExecution).toHaveBeenCalledWith('exec-123', 'user-123');
    });
  });

  describe('monitoring methods', () => {
    it('should get execution status', async () => {
      const mockState: ExecutionState = {
        id: 'exec-123',
        workflowId: 'workflow-123',
        userId: 'user-123',
        status: 'RUNNING',
        attemptCount: 0,
        maxAttempts: 3,
        totalSteps: 2,
        completedSteps: 1,
        failedSteps: 0,
        startedAt: new Date()
      };

      (mockStateManager.getExecutionState as jest.Mock).mockResolvedValue(mockState);

      const result = await executor.getExecutionStatus('exec-123');

      expect(mockStateManager.getExecutionState).toHaveBeenCalledWith('exec-123');
      expect(result).toEqual(mockState);
    });

    it('should get execution progress', async () => {
      const mockProgress = {
        currentStep: 1,
        totalSteps: 2,
        completedSteps: 1,
        failedSteps: 0,
        progress: 50,
        estimatedTimeRemaining: 60000
      };

      (mockStateManager.getExecutionProgress as jest.Mock).mockResolvedValue(mockProgress);

      const result = await executor.getExecutionProgress('exec-123');

      expect(mockStateManager.getExecutionProgress).toHaveBeenCalledWith('exec-123');
      expect(result).toEqual(mockProgress);
    });

    it('should get execution metrics', async () => {
      const mockMetrics: ExecutionMetrics = {
        totalExecutions: 10,
        successfulExecutions: 7,
        failedExecutions: 3,
        averageExecutionTime: 5000,
        successRate: 70,
        recentExecutions: []
      };

      (mockStateManager.getExecutionMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await executor.getExecutionMetrics('workflow-123', 'user-123');

      expect(mockStateManager.getExecutionMetrics).toHaveBeenCalledWith('workflow-123', 'user-123', undefined);
      expect(result).toEqual(mockMetrics);
    });

    it('should get stuck executions', async () => {
      const mockStuckExecutions: ExecutionState[] = [
        {
          id: 'exec-1',
          workflowId: 'workflow-123',
          userId: 'user-123',
          status: 'RUNNING',
          attemptCount: 0,
          maxAttempts: 3,
          totalSteps: 2,
          completedSteps: 0,
          failedSteps: 0,
          startedAt: new Date(Date.now() - 2000000)
        }
      ];

      (mockStateManager.getStuckExecutions as jest.Mock).mockResolvedValue(mockStuckExecutions);

      const result = await executor.getStuckExecutions(30);

      expect(mockStateManager.getStuckExecutions).toHaveBeenCalledWith(30);
      expect(result).toEqual(mockStuckExecutions);
    });

    it('should get retryable executions', async () => {
      const mockRetryableExecutions: ExecutionState[] = [
        {
          id: 'exec-1',
          workflowId: 'workflow-123',
          userId: 'user-123',
          status: 'FAILED',
          attemptCount: 1,
          maxAttempts: 3,
          totalSteps: 2,
          completedSteps: 0,
          failedSteps: 2,
          startedAt: new Date()
        }
      ];

      (mockStateManager.getRetryableExecutions as jest.Mock).mockResolvedValue(mockRetryableExecutions);

      const result = await executor.getRetryableExecutions();

      expect(mockStateManager.getRetryableExecutions).toHaveBeenCalled();
      expect(result).toEqual(mockRetryableExecutions);
    });

    it('should get paused executions', async () => {
      const mockPausedExecutions: ExecutionState[] = [
        {
          id: 'exec-1',
          workflowId: 'workflow-123',
          userId: 'user-123',
          status: 'PAUSED',
          attemptCount: 0,
          maxAttempts: 3,
          totalSteps: 2,
          completedSteps: 1,
          failedSteps: 0,
          startedAt: new Date()
        }
      ];

      (mockStateManager.getPausedExecutions as jest.Mock).mockResolvedValue(mockPausedExecutions);

      const result = await executor.getPausedExecutions();

      expect(mockStateManager.getPausedExecutions).toHaveBeenCalled();
      expect(result).toEqual(mockPausedExecutions);
    });

    it('should reset execution for retry', async () => {
      const mockExecution: ExecutionState = {
        id: 'exec-123',
        workflowId: 'workflow-123',
        userId: 'user-123',
        status: 'PENDING',
        attemptCount: 0,
        maxAttempts: 3,
        totalSteps: 2,
        completedSteps: 0,
        failedSteps: 0,
        startedAt: new Date()
      };

      (mockStateManager.resetExecutionForRetry as jest.Mock).mockResolvedValue(mockExecution);

      const result = await executor.resetExecutionForRetry('exec-123');

      expect(mockStateManager.resetExecutionForRetry).toHaveBeenCalledWith('exec-123');
      expect(result).toEqual(mockExecution);
    });

    it('should cleanup old executions', async () => {
      (mockStateManager.cleanupOldExecutions as jest.Mock).mockResolvedValue(5);

      const result = await executor.cleanupOldExecutions(30);

      expect(mockStateManager.cleanupOldExecutions).toHaveBeenCalledWith(30);
      expect(result).toBe(5);
    });
  });

  describe('getExecutionLogs', () => {
    it('should get execution logs', async () => {
      const mockLogs = [
        { id: 'log-1', message: 'Step 1 started', level: 'INFO' },
        { id: 'log-2', message: 'Step 1 completed', level: 'INFO' }
      ];

      const { prisma } = require('../../../../lib/database/client');
      (prisma.executionLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await executor.getExecutionLogs('exec-123');

      expect(prisma.executionLog.findMany).toHaveBeenCalledWith({
        where: { executionId: 'exec-123' },
        orderBy: { timestamp: 'asc' }
      });
      expect(result).toEqual(mockLogs);
    });
  });
});

describe('createWorkflowExecutor', () => {
  it('should create WorkflowExecutor with dependencies', () => {
    const executor = createWorkflowExecutor(mockStateManager, mockQueueService, { maxRetries: 5 });

    expect(executor).toBeInstanceOf(WorkflowExecutor);
  });
}); 