import { ExecutionStateManager, ExecutionState, ExecutionProgress } from '../../../../src/lib/workflow/executionStateManager';
import { QueueService } from '../../../../src/lib/queue/queueService';
import { PrismaClient } from '../../../../src/generated/prisma';

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
    deleteMany: jest.fn()
  }
} as unknown as PrismaClient;

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
        queueName: 'workflow-execution',
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

  describe('updateProgress', () => {
    it('should update execution progress', async () => {
      const mockExecution = {
        id: 'exec-123',
        currentStep: 3,
        completedSteps: 3,
        failedSteps: 0,
        stepResults: { 1: { success: true }, 2: { success: true }, 3: { success: true } },
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.updateProgress('exec-123', {
        currentStep: 3,
        completedSteps: 3,
        failedSteps: 0,
        stepResults: { 1: { success: true }, 2: { success: true }, 3: { success: true } }
      });

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          currentStep: 3,
          completedSteps: 3,
          failedSteps: 0,
          stepResults: { 1: { success: true }, 2: { success: true }, 3: { success: true } }
        }
      });

      expect(result.currentStep).toBe(3);
      expect(result.completedSteps).toBe(3);
    });
  });

  describe('getExecutionProgress', () => {
    it('should calculate progress correctly', async () => {
      const mockExecution = {
        currentStep: 3,
        totalSteps: 5,
        completedSteps: 3,
        failedSteps: 0,
        startedAt: new Date(Date.now() - 30000), // 30 seconds ago
        status: 'RUNNING'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.getExecutionProgress('exec-123');

      expect(result).toEqual({
        currentStep: 3,
        totalSteps: 5,
        completedSteps: 3,
        failedSteps: 0,
        progress: 60, // 3/5 * 100
        estimatedTimeRemaining: expect.any(Number)
      });
    });

    it('should return null for non-existent execution', async () => {
      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await stateManager.getExecutionProgress('exec-123');

      expect(result).toBeNull();
    });
  });

  describe('shouldRetry', () => {
    it('should return true for failed execution within retry limits', async () => {
      const mockExecution = {
        attemptCount: 1,
        maxAttempts: 3,
        retryAfter: new Date(Date.now() - 1000), // Past retry time
        status: 'FAILED'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(true);
    });

    it('should return false when max attempts exceeded', async () => {
      const mockExecution = {
        attemptCount: 3,
        maxAttempts: 3,
        retryAfter: new Date(Date.now() - 1000),
        status: 'FAILED'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(false);
    });

    it('should return false when retry time has not passed', async () => {
      const mockExecution = {
        attemptCount: 1,
        maxAttempts: 3,
        retryAfter: new Date(Date.now() + 10000), // Future retry time
        status: 'FAILED'
      };

      (mockPrisma.workflowExecution.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.shouldRetry('exec-123');

      expect(result).toBe(false);
    });
  });

  describe('getRetryableExecutions', () => {
    it('should return executions that need to be retried', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          status: 'FAILED',
          attemptCount: 1,
          maxAttempts: 3,
          retryAfter: new Date(Date.now() - 1000)
        },
        {
          id: 'exec-2',
          status: 'FAILED',
          attemptCount: 2,
          maxAttempts: 3,
          retryAfter: new Date(Date.now() - 1000)
        }
      ];

      (mockPrisma.workflowExecution.findMany as jest.Mock).mockResolvedValue(mockExecutions);

      const result = await stateManager.getRetryableExecutions();

      expect(mockPrisma.workflowExecution.findMany).toHaveBeenCalledWith({
        where: {
          status: 'FAILED',
          retryAfter: { lte: expect.any(Date) }
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('exec-1');
      expect(result[1].id).toBe('exec-2');
    });
  });

  describe('getPausedExecutions', () => {
    it('should return paused executions', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          status: 'PAUSED',
          pausedAt: new Date(),
          pausedBy: 'user-123'
        }
      ];

      (mockPrisma.workflowExecution.findMany as jest.Mock).mockResolvedValue(mockExecutions);

      const result = await stateManager.getPausedExecutions();

      expect(mockPrisma.workflowExecution.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PAUSED'
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PAUSED');
    });
  });

  describe('cleanupOldExecutions', () => {
    it('should delete old completed executions', async () => {
      const mockResult = { count: 5 };

      (mockPrisma.workflowExecution.deleteMany as jest.Mock).mockResolvedValue(mockResult);

      const result = await stateManager.cleanupOldExecutions(30);

      expect(mockPrisma.workflowExecution.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
        }
      });

      expect(result).toBe(5);
    });
  });

  describe('setQueueJob', () => {
    it('should set queue job information', async () => {
      const mockExecution = {
        id: 'exec-123',
        queueJobId: 'job-123',
        queueName: 'workflow-execution',
        updatedAt: new Date()
      };

      (mockPrisma.workflowExecution.update as jest.Mock).mockResolvedValue(mockExecution);

      const result = await stateManager.setQueueJob('exec-123', 'job-123', 'workflow-execution');

      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          queueJobId: 'job-123',
          queueName: 'workflow-execution'
        }
      });

      expect(result.queueJobId).toBe('job-123');
      expect(result.queueName).toBe('workflow-execution');
    });
  });
}); 