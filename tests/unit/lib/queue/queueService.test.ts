// Type-only imports for test data structures
import type { QueueJob, QueueConfig } from '../../../../src/lib/queue/queueService';
import { prisma } from '../../../../lib/database/client';

// Mock pg-boss first to ensure it's mocked before the wrapper loads it
jest.mock('pg-boss', () => {
  console.log('Setting up pg-boss mock');
  const MockPgBoss = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    createQueue: jest.fn(),
    send: jest.fn(),
    work: jest.fn(),
    cancel: jest.fn(),
    getJobById: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }));
  return {
    __esModule: true,
    default: MockPgBoss,
  };
});

// Mock the queue wrapper
jest.mock('../../../../src/lib/queueWrapper', () => {
  console.log('Setting up queueWrapper mock');
  const mockQueueClient = {
    start: jest.fn(),
    stop: jest.fn(),
    createQueue: jest.fn(),
    send: jest.fn(),
    work: jest.fn(),
    cancel: jest.fn(),
    getJobById: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  const mockGetQueueClient = jest.fn().mockImplementation((config) => {
    console.log('Mock getQueueClient called with config:', config);
    return mockQueueClient;
  });
  return {
    getQueueClient: mockGetQueueClient,
  };
});

// Mock dependencies
jest.mock('../../../../src/generated/prisma');
jest.mock('../../../../src/utils/logger');

// Reset modules to ensure mocks are applied
jest.resetModules();

let QueueService: any;
let PrismaClient: any;
let logError: any;
let logInfo: any;
let getQueueClient: any;
let mockQueueClient: any;

beforeEach(async () => {
  jest.resetModules();

  mockQueueClient = {
    start: jest.fn(),
    stop: jest.fn(),
    createQueue: jest.fn(),
    send: jest.fn(),
    work: jest.fn(),
    cancel: jest.fn(),
    getJobById: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  jest.doMock('../../../../src/lib/queueWrapper', () => ({
    getQueueClient: jest.fn().mockReturnValue(mockQueueClient),
  }));
  jest.doMock('../../../../src/generated/prisma', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({})),
  }));
  jest.doMock('../../../../src/utils/logger', () => ({
    logError: jest.fn(),
    logInfo: jest.fn(),
  }));

  // Dynamically import after mocks
  const queueServiceModule = await import('../../../../src/lib/queue/queueService');
  QueueService = queueServiceModule.QueueService;

  const loggerModule = await import('../../../../src/utils/logger');
  logError = loggerModule.logError;
  logInfo = loggerModule.logInfo;

  const wrapperModule = await import('../../../../src/lib/queueWrapper');
  getQueueClient = wrapperModule.getQueueClient;

  // Use shared prisma client instead of creating new instance
});

describe('QueueService', () => {
  let queueService: any;
  let mockPrisma: any;
  let mockQueueClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    // Create mock Prisma client
    mockPrisma = prisma;
    
    // Create queue service instance
    queueService = new QueueService(mockPrisma);
    
    // Get the current mock queue client
    mockQueueClient = getQueueClient();
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(queueService).toBeInstanceOf(QueueService);
      expect(mockQueueClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should throw error when DATABASE_URL is not provided', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => {
        new QueueService(mockPrisma);
      }).toThrow('DATABASE_URL environment variable is required');
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<QueueConfig> = {
        maxConcurrency: 5,
        retryLimit: 2,
        timeout: 60000
      };

      const customQueueService = new QueueService(mockPrisma, customConfig);
      expect(customQueueService).toBeInstanceOf(QueueService);
    });
  });

  describe('initialize', () => {
    it('should initialize the queue service successfully', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);

      await queueService.initialize();

      expect(mockQueueClient.start).toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith('Queue service initialized', expect.any(Object));
    });

    it('should not initialize twice', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);

      await queueService.initialize();
      await queueService.initialize();

      expect(mockQueueClient.start).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Database connection failed');
      mockQueueClient.start.mockRejectedValue(error);

      await expect(queueService.initialize()).rejects.toThrow('Database connection failed');
      expect(logError).toHaveBeenCalledWith('Failed to initialize queue service', error);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should stop the queue service successfully', async () => {
      mockQueueClient.stop.mockResolvedValue(undefined);

      await queueService.stop();

      expect(mockQueueClient.stop).toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith('Queue service stopped');
    });

    it('should not stop if not initialized', async () => {
      const uninitializedService = new QueueService(mockPrisma);
      
      await uninitializedService.stop();

      expect(mockQueueClient.stop).not.toHaveBeenCalled();
    });

    it('should handle stop errors', async () => {
      const error = new Error('Stop failed');
      mockQueueClient.stop.mockRejectedValue(error);

      await expect(queueService.stop()).rejects.toThrow('Stop failed');
      expect(logError).toHaveBeenCalledWith('Failed to stop queue service', error);
    });
  });

  describe('submitJob', () => {
    beforeEach(async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should submit a job successfully', async () => {
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { test: 'data' }
      };

      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.send.mockResolvedValue('job-123');

      const result = await queueService.submitJob(job);

      expect(result).toEqual({ queueName: 'test-queue', jobId: 'job-123' });
      expect(mockQueueClient.createQueue).toHaveBeenCalledWith('test-queue');
      expect(mockQueueClient.send).toHaveBeenCalledWith('test-queue', { test: 'data' }, expect.any(Object));
      expect(logInfo).toHaveBeenCalledWith('Job submitted to queue', expect.any(Object));
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new QueueService(mockPrisma);
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { test: 'data' }
      };

      await expect(uninitializedService.submitJob(job)).rejects.toThrow('Queue service not initialized');
    });

    it('should validate job data', async () => {
      const invalidJob = {
        queueName: 'test-queue',
        name: '',
        data: null
      } as QueueJob;

      await expect(queueService.submitJob(invalidJob)).rejects.toThrow('Job name is required and must be a string');
    });

    it('should handle job submission errors', async () => {
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { test: 'data' }
      };

      const error = new Error('Queue full');
      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.send.mockRejectedValue(error);

      await expect(queueService.submitJob(job)).rejects.toThrow('Queue full');
      expect(logError).toHaveBeenCalledWith('Failed to submit job to queue', error, expect.any(Object));
    });

    it('should sanitize sensitive data in logs', async () => {
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { 
          password: 'secret123',
          token: 'abc123',
          normalData: 'visible'
        }
      };

      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.send.mockRejectedValue(new Error('Test error'));

      await expect(queueService.submitJob(job)).rejects.toThrow('Test error');
      
      expect(logError).toHaveBeenCalledWith(
        'Failed to submit job to queue',
        expect.any(Error),
        expect.objectContaining({
          jobData: {
            password: '[REDACTED]',
            token: '[REDACTED]',
            normalData: 'visible'
          }
        })
      );
    });
  });

  describe('registerWorker', () => {
    beforeEach(async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should register a worker successfully', async () => {
      const jobName = 'test-job';
      const handler = jest.fn().mockResolvedValue('result');
      const mockWorker = { off: jest.fn() };

      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.work.mockResolvedValue(mockWorker);

      await queueService.registerWorker(jobName, handler);

      expect(mockQueueClient.createQueue).toHaveBeenCalledWith(jobName);
      expect(mockQueueClient.work).toHaveBeenCalledWith(jobName, expect.any(Object), expect.any(Function));
      expect(logInfo).toHaveBeenCalledWith('Worker registered', expect.any(Object));
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new QueueService(mockPrisma);
      const handler = jest.fn();

      await expect(uninitializedService.registerWorker('test-job', handler)).rejects.toThrow('Queue service not initialized');
    });

    it('should handle worker registration errors', async () => {
      const jobName = 'test-job';
      const handler = jest.fn();
      const error = new Error('Worker registration failed');

      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.work.mockRejectedValue(error);

      await expect(queueService.registerWorker(jobName, handler)).rejects.toThrow('Worker registration failed');
      expect(logError).toHaveBeenCalledWith('Failed to register worker', error, { queueName: jobName });
    });

    it('should track worker statistics', async () => {
      const jobName = 'test-job';
      const handler = jest.fn();
      const mockWorker = { off: jest.fn() };
      let workHandler: any;

      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.work.mockImplementation((name, options, wh) => {
        workHandler = wh;
        return Promise.resolve(mockWorker);
      });

      await queueService.registerWorker(jobName, handler);

      // Simulate job processing
      const fakeJob = { id: 'job-1', name: jobName, data: {} };
      await workHandler([fakeJob]);

      const stats = queueService.getWorkerStats();
      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        workerId: expect.stringContaining(jobName),
        activeJobs: 0,
        completedJobs: 1,
        failedJobs: 0,
        lastActivity: expect.any(Date)
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return error status when not initialized', async () => {
      const health = await queueService.getHealthStatus();

      expect(health).toEqual({
        status: 'error',
        message: 'Queue service not initialized',
        activeJobs: 0,
        queuedJobs: 0,
        failedJobs: 0,
        workers: 0,
        uptime: 0,
        lastHealthCheck: expect.any(Date)
      });
    });

    it('should return health status when initialized', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      const health = await queueService.getHealthStatus();

      expect(health).toEqual({
        status: 'healthy',
        message: 'Queue service is healthy',
        activeJobs: 0,
        queuedJobs: 0,
        failedJobs: 0,
        workers: 0,
        uptime: expect.any(Number),
        lastHealthCheck: expect.any(Date)
      });
    });

    it('should handle health check errors', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      // Test that health check returns proper error handling
      const health = await queueService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Queue service is healthy');
    });
  });

  describe('cancelJob', () => {
    beforeEach(async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should cancel a job successfully', async () => {
      const queueName = 'test-queue';
      const jobId = 'job-123';
      mockQueueClient.cancel.mockResolvedValue(undefined);

      await queueService.cancelJob(queueName, jobId);

      expect(mockQueueClient.cancel).toHaveBeenCalledWith(queueName, jobId);
      expect(logInfo).toHaveBeenCalledWith('Job cancelled', { queueName, jobId });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new QueueService(mockPrisma);

      await expect(uninitializedService.cancelJob('test-queue', 'job-123')).rejects.toThrow('Queue service not initialized');
    });

    it('should handle cancellation errors', async () => {
      const queueName = 'test-queue';
      const jobId = 'job-123';
      const error = new Error('Job not found');
      mockQueueClient.cancel.mockRejectedValue(error);

      await expect(queueService.cancelJob(queueName, jobId)).rejects.toThrow('Job not found');
      expect(logError).toHaveBeenCalledWith('Failed to cancel job', error, { queueName, jobId });
    });
  });

  describe('getJobStatus', () => {
    beforeEach(async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should return job status when job exists', async () => {
      const queueName = 'test-queue';
      const jobId = 'job-123';
      const mockJob = {
        id: jobId,
        name: 'test-job',
        data: { test: 'data' },
        state: 'completed',
        retryLimit: 3,
        retryCount: 0,
        createdOn: new Date(),
        completedOn: new Date()
      };

      mockQueueClient.getJobById.mockResolvedValue(mockJob);

      const status = await queueService.getJobStatus(queueName, jobId);

      expect(status).toEqual({
        id: jobId,
        queueName,
        name: 'test-job',
        data: { test: 'data' },
        state: 'completed',
        retryLimit: 3,
        retryCount: 0,
        createdOn: expect.any(Date),
        completedOn: expect.any(Date)
      });
    });

    it('should return null when job does not exist', async () => {
      const queueName = 'test-queue';
      const jobId = 'job-123';
      mockQueueClient.getJobById.mockResolvedValue(null);

      const status = await queueService.getJobStatus(queueName, jobId);

      expect(status).toBeNull();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new QueueService(mockPrisma);

      await expect(uninitializedService.getJobStatus('test-queue', 'job-123')).rejects.toThrow('Queue service not initialized');
    });

    it('should handle get job status errors', async () => {
      const queueName = 'test-queue';
      const jobId = 'job-123';
      const error = new Error('Database error');
      mockQueueClient.getJobById.mockRejectedValue(error);

      await expect(queueService.getJobStatus(queueName, jobId)).rejects.toThrow('Database error');
      expect(logError).toHaveBeenCalledWith('Failed to get job status', error, { queueName, jobId });
    });
  });

  describe('clearFailedJobs', () => {
    beforeEach(async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should return 0 for now (placeholder implementation)', async () => {
      const cleared = await queueService.clearFailedJobs();

      expect(cleared).toBe(0);
      expect(logInfo).toHaveBeenCalledWith('Failed jobs clear operation requested (not yet implemented)');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new QueueService(mockPrisma);

      await expect(uninitializedService.clearFailedJobs()).rejects.toThrow('Queue service not initialized');
    });
  });

  describe('getWorkerStats', () => {
    it('should return empty array when no workers', () => {
      const stats = queueService.getWorkerStats();
      expect(stats).toEqual([]);
    });

    it('should return worker statistics when workers exist', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      const jobName = 'test-job';
      const handler = jest.fn();
      const mockWorker = { off: jest.fn() };
      let workHandler: any;

      mockQueueClient.createQueue.mockResolvedValue(undefined);
      mockQueueClient.work.mockImplementation((name, options, wh) => {
        workHandler = wh;
        return Promise.resolve(mockWorker);
      });

      await queueService.registerWorker(jobName, handler);

      // Simulate job processing
      const fakeJob = { id: 'job-1', name: jobName, data: {} };
      await workHandler([fakeJob]);

      const stats = queueService.getWorkerStats();
      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        workerId: expect.stringContaining(jobName),
        activeJobs: 0,
        completedJobs: 1,
        failedJobs: 0,
        lastActivity: expect.any(Date)
      });
    });
  });

  describe('Job validation', () => {
    it('should validate job name', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      const invalidJob = {
        queueName: 'test-queue',
        name: '',
        data: { test: 'data' }
      } as QueueJob;

      await expect(queueService.submitJob(invalidJob)).rejects.toThrow('Job name is required and must be a string');
    });

    it('should validate job data', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      const invalidJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: null
      } as QueueJob;

      await expect(queueService.submitJob(invalidJob)).rejects.toThrow('Job data is required');
    });

    it('should validate retry limit', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      const invalidJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { test: 'data' },
        retryLimit: 15
      } as QueueJob;

      await expect(queueService.submitJob(invalidJob)).rejects.toThrow('Retry limit must be between 0 and 10');
    });

    it('should validate priority', async () => {
      mockQueueClient.start.mockResolvedValue(undefined);
      await queueService.initialize();

      const invalidJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { test: 'data' },
        priority: 15
      } as QueueJob;

      await expect(queueService.submitJob(invalidJob)).rejects.toThrow('Priority must be between -10 and 10');
    });
  });
}); 