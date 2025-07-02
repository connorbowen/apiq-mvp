import { ExecutionStateManager, ExecutionState, ExecutionProgress, ExecutionMetrics } from '../../../../src/lib/workflow/executionStateManager';
import { QueueService } from '../../../../src/lib/queue/queueService';
import { prisma } from '../../../../lib/database/client';

// Mock dependencies
jest.mock('../../../../src/generated/prisma');
jest.mock('../../../../src/lib/queue/queueService');
jest.mock('../../../../src/utils/logger');

const mockPrisma = {
  workflowExecution: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  }
} as unknown as typeof prisma;

const mockQueueService = {
  cancelJob: jest.fn(),
  getJobStatus: jest.fn()
} as unknown as QueueService;

describe('ExecutionStateManager', () => {
  let stateManager: ExecutionStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new ExecutionStateManager(mockPrisma, mockQueueService);
  });

  describe('createExecution', () => {
    it('should create a new execution record with enhanced state tracking', async () => {
      const mockExecution = {
        id: 'exec-123',
        workflowId: 'workflow-123',
        userId: 'user-123',
        status: 'PENDING',
        totalSteps: 5,
        maxAttempts: 3,
        attemptCount: 0,
        completedSteps: 0,
        failedSteps: 0,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.create as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.createExecution(
        'workflow-123',
        'user-123',
        5,
        3,
        { test: 'metadata' }
      );

      expect(mockPrisma.workflowExecution.create).toHaveBeenCalledWith({
        data: {
          workflowId: 'workflow-123',
          userId: 'user-123',
          status: 'PENDING',
          totalSteps: 5,
          maxAttempts: 3,
          metadata: { test: 'metadata' }
        }
      });

      expect(result).toMatchObject({
        id: 'exec-123',
        workflowId: 'workflow-123',
        userId: 'user-123',
        status: 'PENDING',
        totalSteps: 5,
        maxAttempts: 3,
        attemptCount: 0,
        completedSteps: 0,
        failedSteps: 0
      });
      
      // Check timestamp separately to avoid precision issues
      expect(result.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateStatus', () => {
    it('should update execution status with proper state transitions', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'RUNNING',
        startedAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.updateStatus('exec-123', 'RUNNING', {
        currentStep: 2,
        completedSteps: 2,
        failedSteps: 0
      });

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'RUNNING',
          startedAt: expect.any(Date),
          currentStep: 2,
          completedSteps: 2,
          failedSteps: 0
        }
      });

      expect(result.status).toBe('RUNNING');
    });

    it('should handle RETRYING status with attempt count increment', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'RETRYING',
        attemptCount: 1,
        retryAfter: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      await stateManager.updateStatus('exec-123', 'RETRYING');

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'RETRYING',
          attemptCount: { increment: 1 },
          retryAfter: expect.any(Date)
        }
      });
    });
  });

  describe('pauseExecution', () => {
    it('should pause execution and cancel queue job', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'PAUSED',
        pausedAt: new Date(),
        pausedBy: 'user-123',
        queueJobId: 'job-123',
        queueName: 'workflow-execution',
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);
      (mockQueueService.cancelJob as jest.Mock).mockResolvedValue(undefined);

      const result = await stateManager.pauseExecution('exec-123', 'user-123');

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'PAUSED',
          pausedAt: expect.any(Date),
          pausedBy: 'user-123'
        }
      });

      expect(mockQueueService.cancelJob).toHaveBeenCalledWith('workflow-execution', 'job-123');
      expect(result.status).toBe('PAUSED');
      expect(result.pausedBy).toBe('user-123');
    });

    it('should handle pause without queue job gracefully', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'PAUSED',
        pausedAt: new Date(),
        pausedBy: 'user-123',
        queueJobId: null,
        queueName: null,
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.pauseExecution('exec-123', 'user-123');

      expect(mockQueueService.cancelJob).not.toHaveBeenCalled();
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('resumeExecution', () => {
    it('should resume execution and reset status to PENDING', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'PENDING',
        resumedAt: new Date(),
        resumedBy: 'user-123',
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.resumeExecution('exec-123', 'user-123');

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'PENDING',
          resumedAt: expect.any(Date),
          resumedBy: 'user-123'
        }
      });

      expect(result.status).toBe('PENDING');
      expect(result.resumedBy).toBe('user-123');
    });
  });

  describe('cancelExecution', () => {
    it('should cancel execution and cancel queue job', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'CANCELLED',
        completedAt: new Date(),
        queueJobId: 'job-123',
        queueName: 'workflow-execution',
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);
      (mockQueueService.cancelJob as jest.Mock).mockResolvedValue(undefined);

      const result = await stateManager.cancelExecution('exec-123', 'user-123');

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
          result: { cancelled: true, cancelledAt: expect.any(Date), cancelledBy: 'user-123' }
        }
      });

      expect(mockQueueService.cancelJob).toHaveBeenCalledWith('workflow-execution', 'job-123');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable execution', async () => {
      const mockExecution = {
        attemptCount: 1,
        maxAttempts: 3,
        retryAfter: new Date(Date.now() - 1000), // Past retry time
        status: 'FAILED',
        error: 'TEMPORARY_ERROR'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(true);
    });

    it('should return false when max attempts exceeded', async () => {
      const mockExecution = {
        attemptCount: 3,
        maxAttempts: 3,
        status: 'FAILED',
        error: 'TEMPORARY_ERROR'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(false);
    });

    it('should return false for permanent errors', async () => {
      const mockExecution = {
        attemptCount: 1,
        maxAttempts: 3,
        status: 'FAILED',
        error: 'INVALID_API_KEY'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(false);
    });

    it('should return false when retry time not reached', async () => {
      const mockExecution = {
        attemptCount: 1,
        maxAttempts: 3,
        retryAfter: new Date(Date.now() + 10000), // Future retry time
        status: 'FAILED',
        error: 'TEMPORARY_ERROR'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(false);
    });
  });

  describe('getRetryableExecutions', () => {
    it('should return retryable executions', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          status: 'FAILED',
          attemptCount: 1,
          maxAttempts: 3,
          retryAfter: new Date(Date.now() - 1000),
          error: 'TEMPORARY_ERROR'
        },
        {
          id: 'exec-2',
          status: 'FAILED',
          attemptCount: 2,
          maxAttempts: 3,
          retryAfter: new Date(Date.now() - 1000),
          error: 'TEMPORARY_ERROR'
        }
      ];

      (mockPrisma.workflowExecution.findMany as jest.Mock).mockResolvedValue(mockExecutions);

      const result = await stateManager.getRetryableExecutions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('exec-1');
      expect(result[1].id).toBe('exec-2');
    });

    it('should filter out executions with permanent errors', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          status: 'FAILED',
          attemptCount: 1,
          maxAttempts: 3,
          retryAfter: new Date(Date.now() - 1000),
          error: 'TEMPORARY_ERROR'
        },
        {
          id: 'exec-2',
          status: 'FAILED',
          attemptCount: 1,
          maxAttempts: 3,
          retryAfter: new Date(Date.now() - 1000),
          error: 'INVALID_API_KEY'
        }
      ];

      (mockPrisma.workflowExecution.findMany as jest.Mock).mockResolvedValue(mockExecutions);

      const result = await stateManager.getRetryableExecutions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('exec-1');
    });
  });

  describe('getStuckExecutions', () => {
    it('should return stuck executions', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          status: 'RUNNING',
          startedAt: new Date(Date.now() - 2000000) // 33 minutes ago
        }
      ];

      (mockPrisma.workflowExecution.findMany as jest.Mock).mockResolvedValue(mockExecutions);

      const result = await stateManager.getStuckExecutions(30);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('exec-1');
    });
  });

  describe('getExecutionMetrics', () => {
    it('should return execution metrics', async () => {
      const mockCounts = [10, 7, 3]; // total, successful, failed
      const mockRecentExecutions = [
        { id: 'exec-1', status: 'COMPLETED' },
        { id: 'exec-2', status: 'FAILED' }
      ];
      const mockCompletedExecutions = [
        { executionTime: 1000 },
        { executionTime: 2000 },
        { executionTime: 3000 }
      ];

      (mockPrisma.workflowExecution.count as jest.Mock)
        .mockResolvedValueOnce(mockCounts[0])
        .mockResolvedValueOnce(mockCounts[1])
        .mockResolvedValueOnce(mockCounts[2]);
      
      (mockPrisma.workflowExecution.findMany as jest.Mock)
        .mockResolvedValueOnce(mockRecentExecutions)
        .mockResolvedValueOnce(mockCompletedExecutions);

      const result = await stateManager.getExecutionMetrics();

      expect(result.totalExecutions).toBe(10);
      expect(result.successfulExecutions).toBe(7);
      expect(result.failedExecutions).toBe(3);
      expect(result.successRate).toBe(70);
      expect(result.averageExecutionTime).toBe(2000);
      expect(result.recentExecutions).toHaveLength(2);
    });
  });

  describe('resetExecutionForRetry', () => {
    it('should reset execution for retry', async () => {
      const mockExecution = {
        id: 'exec-123',
        status: 'PENDING',
        currentStep: 0,
        completedSteps: 0,
        failedSteps: 0,
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.resetExecutionForRetry('exec-123');

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'PENDING',
          currentStep: 0,
          completedSteps: 0,
          failedSteps: 0,
          stepResults: {},
          error: undefined,
          result: undefined,
          executionTime: undefined,
          startedAt: undefined,
          completedAt: undefined
        }
      });

      expect(result.status).toBe('PENDING');
    });
  });

  describe('cleanupOldExecutions', () => {
    it('should cleanup old execution records', async () => {
      (mockPrisma.workflowExecution.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await stateManager.cleanupOldExecutions(30);

      expect(result).toBe(5);
      expect(mockPrisma.workflowExecution.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
        }
      });
    });
  });

  describe('getExecutionProgress', () => {
    it('should calculate progress correctly', async () => {
      const mockExecution = {
        currentStep: 3,
        totalSteps: 5,
        completedSteps: 2,
        failedSteps: 1,
        startedAt: new Date(Date.now() - 60000), // 1 minute ago
        status: 'RUNNING'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.getExecutionProgress('exec-123');

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        currentStep: 3,
        totalSteps: 5,
        completedSteps: 2,
        failedSteps: 1,
        progress: 40 // (2/5) * 100
      });
      expect(result!.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('getPausedExecutions', () => {
    it('should return paused executions', async () => {
      const mockExecutions = [
        { id: 'exec-1', status: 'PAUSED' },
        { id: 'exec-2', status: 'PAUSED' }
      ];

      (mockPrisma.workflowExecution.findMany as jest.Mock).mockResolvedValue(mockExecutions);

      const result = await stateManager.getPausedExecutions();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PAUSED');
      expect(result[1].status).toBe('PAUSED');
    });
  });
}); 