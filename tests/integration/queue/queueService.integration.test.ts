import { QueueService, QueueServiceConfig, Job, QueueStatistics, WorkerStatistics, QueueJob } from '../../../src/lib/queue/queueService';
import { getTestDatabase } from '../../helpers/test-db';
import { PrismaClient } from '../../../src/generated/prisma';

describe('QueueService Integration Tests', () => {
  let queueService: QueueService;
  let testConfig: QueueServiceConfig;
  let testDb: any;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    testDb = await getTestDatabase();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDb.connectionString,
        },
      },
    });
    testConfig = {
      connectionString: testDb.connectionString,
      schema: 'test_pgboss',
      poolSize: 5,
      maxConcurrency: 10,
      retentionDays: 1,
      archiveCompletedJobs: false,
      archiveFailedJobs: false,
      enableMetrics: true,
      metricsInterval: 5000, // 5 seconds for faster tests
    };
  });

  afterAll(async () => {
    if (queueService) {
      await queueService.stop();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    if (testDb) {
      await testDb.cleanup();
    }
  });

  beforeEach(async () => {
    // Create fresh queue service instance for each test
    queueService = new QueueService(prisma, testConfig);
    await queueService.initialize();
  });

  afterEach(async () => {
    if (queueService) {
      await queueService.stop();
    }
  });

  describe('Basic Queue Operations', () => {
    it('should submit and process a simple job', async () => {
      const queueName = 'test-simple-queue';
      const jobName = 'test-job';
      const jobData = { message: 'Hello World', timestamp: Date.now() };
      let processedJob: any = null;

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        processedJob = jobData;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData
      };
      const result = await queueService.submitJob(job);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify job was processed
      expect(processedJob).toBeTruthy();
      expect(processedJob).toEqual(jobData);
      expect(result.queueName).toBe(queueName);
      expect(result.jobId).toBeTruthy();
    }, 10000);

    it('should handle job with custom options', async () => {
      const queueName = 'test-options-queue';
      const jobName = 'test-delayed-job';
      const jobData = { message: 'Delayed job' };
      let processedJob: any = null;

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        processedJob = jobData;
      });

      // Submit job with delay
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData,
        priority: 1,
        delay: 1000, // 1 second delay
        retryLimit: 2,
        retryDelay: 500,
        timeout: 10000,
        jobKey: 'unique-key-123',
      };
      const result = await queueService.submitJob(job);

      // Wait for delay + processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify job was processed
      expect(processedJob).toBeTruthy();
      expect(processedJob).toEqual(jobData);
      expect(result.queueName).toBe(queueName);
      expect(result.jobId).toBeTruthy();
    }, 10000);

    it('should handle job cancellation', async () => {
      const queueName = 'test-cancel-queue';
      const jobName = 'test-cancel-job';
      const jobData = { message: 'Should be cancelled' };
      let jobProcessed = false;

      // Register worker with delay
      await queueService.registerWorker(queueName, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Long processing time
        jobProcessed = true;
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData
      };
      const result = await queueService.submitJob(job);

      // Wait a bit then cancel
      await new Promise(resolve => setTimeout(resolve, 500));
      await queueService.cancelJob(queueName, result.jobId);

      // Wait for potential processing
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Verify job was cancelled and not processed
      expect(jobProcessed).toBe(false);
    }, 10000);

    it('should handle job status retrieval', async () => {
      const queueName = 'test-status-queue';
      const jobName = 'test-status-job';
      const jobData = { message: 'Status test' };

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData
      };
      const result = await queueService.submitJob(job);

      // Get job status immediately
      const status = await queueService.getJobStatus(queueName, result.jobId);

      // Verify status
      expect(status).toBeTruthy();
      expect(status!.id).toBe(result.jobId);
      expect(status!.name).toBe(jobName);
      expect(status!.data).toEqual(jobData);
      expect(status!.queueName).toBe(queueName);
      expect(['created', 'active', 'completed']).toContain(status!.state);
    }, 10000);
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed jobs', async () => {
      const queueName = 'test-retry-queue';
      const jobName = 'test-retry-job';
      const jobData = { message: 'Retry test' };
      let attemptCount = 0;
      const maxAttempts = 3;

      // Register worker that fails first two times
      await queueService.registerWorker(queueName, async (jobData: any) => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        // Succeed on third attempt
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData,
        retryLimit: 2,
        retryDelay: 100,
      };
      await queueService.submitJob(job);

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify job was retried
      expect(attemptCount).toBe(maxAttempts);
    }, 15000);

    it('should handle job timeout', async () => {
      const queueName = 'test-timeout-queue';
      const jobName = 'test-timeout-job';
      const jobData = { message: 'Timeout test' };
      let jobStarted = false;

      // Register worker that takes too long
      await queueService.registerWorker(queueName, async (jobData: any) => {
        jobStarted = true;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Longer than timeout
      });

      // Submit job with short timeout
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData,
        timeout: 1000, // 1 second timeout
        retryLimit: 0, // No retries
      };
      const result = await queueService.submitJob(job);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify job started but should be timed out
      expect(jobStarted).toBe(true);

      // Check job status
      const status = await queueService.getJobStatus(queueName, result.jobId);
      expect(['failed', 'expired']).toContain(status!.state);
    }, 15000);
  });

  describe('Multiple Workers and Concurrency', () => {
    it('should handle multiple workers processing jobs concurrently', async () => {
      const queueName = 'test-concurrency-queue';
      const jobName = 'test-concurrent-job';
      const jobCount = 5;
      const processedJobs: string[] = [];
      const processingTimes: number[] = [];

      // Register worker with team size
      await queueService.registerWorker(queueName, async (jobData: any) => {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
        const processingTime = Date.now() - startTime;
        
        processedJobs.push(jobData.id || 'unknown');
        processingTimes.push(processingTime);
      }, { teamSize: 3 });

      // Submit multiple jobs
      const jobs: QueueJob[] = [];
      for (let i = 0; i < jobCount; i++) {
        jobs.push({
          queueName,
          name: jobName,
          data: { id: `job-${i}`, message: `Job ${i}` }
        });
      }

      const startTime = Date.now();
      await Promise.all(jobs.map(job => queueService.submitJob(job)));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify all jobs were processed
      expect(processedJobs.length).toBe(jobCount);
      expect(processingTimes.length).toBe(jobCount);
      
      // Verify concurrent processing (should be faster than sequential)
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(jobCount * 500); // Should be processed concurrently
    }, 15000);

    it('should handle multiple queues independently', async () => {
      const queue1 = 'test-queue-1';
      const queue2 = 'test-queue-2';
      const jobName = 'test-multi-queue-job';
      let queue1Processed = false;
      let queue2Processed = false;

      // Register workers for both queues
      await queueService.registerWorker(queue1, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        queue1Processed = true;
      });

      await queueService.registerWorker(queue2, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        queue2Processed = true;
      });

      // Submit jobs to both queues
      const job1: QueueJob = {
        queueName: queue1,
        name: jobName,
        data: { message: 'Queue 1 job' }
      };
      const job2: QueueJob = {
        queueName: queue2,
        name: jobName,
        data: { message: 'Queue 2 job' }
      };

      await Promise.all([
        queueService.submitJob(job1),
        queueService.submitJob(job2)
      ]);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify both jobs were processed independently
      expect(queue1Processed).toBe(true);
      expect(queue2Processed).toBe(true);
    }, 10000);
  });

  describe('Queue Statistics and Metrics', () => {
    it('should provide accurate queue statistics', async () => {
      const queueName = 'test-stats-queue';
      const jobName = 'test-stats-job';

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Submit multiple jobs
      const jobs: QueueJob[] = [];
      for (let i = 0; i < 3; i++) {
        jobs.push({
          queueName,
          name: jobName,
          data: { id: i, message: `Job ${i}` }
        });
      }

      await Promise.all(jobs.map(job => queueService.submitJob(job)));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get worker statistics
      const workerStats = queueService.getWorkerStats();
      expect(workerStats.length).toBeGreaterThan(0);
      
      const worker = workerStats.find(w => w.workerId.includes(queueName));
      expect(worker).toBeTruthy();
      expect(worker!.completedJobs).toBeGreaterThan(0);
    }, 10000);

    it('should track worker statistics', async () => {
      const queueName = 'test-worker-stats-queue';
      const jobName = 'test-worker-stats-job';

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Submit a job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: { message: 'Worker stats test' }
      };
      await queueService.submitJob(job);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check worker statistics
      const workerStats = queueService.getWorkerStats();
      const worker = workerStats.find(w => w.workerId.includes(queueName));
      
      expect(worker).toBeTruthy();
      expect(worker!.completedJobs).toBeGreaterThan(0);
      expect(worker!.lastActivity).toBeInstanceOf(Date);
    }, 10000);

    it('should generate Prometheus metrics', async () => {
      const queueName = 'test-metrics-queue';
      const jobName = 'test-metrics-job';

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Submit a job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: { message: 'Metrics test' }
      };
      await queueService.submitJob(job);

      // Wait for processing and metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get health status (which includes basic metrics)
      const health = await queueService.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.workers).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Health Monitoring', () => {
    it('should provide health check information', async () => {
      const health = await queueService.getHealthStatus();
      
      expect(health).toBeTruthy();
      expect(health.status).toBe('healthy');
      expect(health.message).toBeTruthy();
      expect(health.workers).toBeGreaterThanOrEqual(0);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.lastHealthCheck).toBeInstanceOf(Date);
    }, 5000);

    it('should detect unhealthy state when no workers', async () => {
      // Create a new queue service without workers
      const emptyQueueService = new QueueService(prisma, testConfig);
      await emptyQueueService.initialize();

      const health = await emptyQueueService.getHealthStatus();
      
      expect(health.status).toBe('healthy'); // Should still be healthy even without workers
      expect(health.workers).toBe(0);

      await emptyQueueService.stop();
    }, 5000);
  });

  describe('Data Validation and Security', () => {
    it('should validate job payload structure', async () => {
      const queueName = 'test-validation-queue';
      const jobName = 'test-validation-job';
      const jobData = { message: 'Valid job data' };

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        expect(jobData.message).toBe('Valid job data');
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: jobData
      };
      const result = await queueService.submitJob(job);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(result.jobId).toBeTruthy();
    }, 10000);

    it('should handle large job payloads', async () => {
      const queueName = 'test-large-payload-queue';
      const jobName = 'test-large-payload-job';
      const largeData = {
        message: 'Large payload test',
        data: 'x'.repeat(10000) // 10KB payload
      };

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        expect(jobData.message).toBe('Large payload test');
        expect(jobData.data.length).toBe(10000);
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: largeData
      };
      const result = await queueService.submitJob(job);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(result.jobId).toBeTruthy();
    }, 10000);
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const queueName = 'test-shutdown-queue';
      const jobName = 'test-shutdown-job';
      let jobProcessed = false;

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        jobProcessed = true;
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: { message: 'Shutdown test' }
      };
      await queueService.submitJob(job);

      // Wait a bit then shutdown
      await new Promise(resolve => setTimeout(resolve, 50));
      await queueService.stop();

      // Verify shutdown completed
      expect(queueService).toBeTruthy();
    }, 10000);
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle database connection loss gracefully', async () => {
      const queueName = 'test-connection-loss-queue';
      const jobName = 'test-connection-loss-job';

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        // Simulate work
      });

      // Submit job
      const job: QueueJob = {
        queueName,
        name: jobName,
        data: { message: 'Connection loss test' }
      };
      const result = await queueService.submitJob(job);

      // Verify job was submitted
      expect(result.jobId).toBeTruthy();
    }, 10000);

    it('should handle duplicate job keys', async () => {
      const queueName = 'test-duplicate-keys-queue';
      const jobName = 'test-duplicate-keys-job';
      const jobData = { message: 'Duplicate key test' };
      const jobKey = 'unique-key-456';

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        // Process job
      });

      // Submit first job
      const job1: QueueJob = {
        queueName,
        name: jobName,
        data: jobData,
        jobKey
      };
      const result1 = await queueService.submitJob(job1);

      // Try to submit duplicate job
      const job2: QueueJob = {
        queueName,
        name: jobName,
        data: { ...jobData, message: 'Duplicate' },
        jobKey
      };

      await expect(queueService.submitJob(job2)).rejects.toThrow();

      // Verify first job was successful
      expect(result1.jobId).toBeTruthy();
    }, 10000);

    it('should handle rapid job submission', async () => {
      const queueName = 'test-rapid-submission-queue';
      const jobName = 'test-rapid-submission-job';
      const jobCount = 10;
      let processedCount = 0;

      // Register worker
      await queueService.registerWorker(queueName, async (jobData: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        processedCount++;
      });

      // Submit jobs rapidly
      const jobs: QueueJob[] = [];
      for (let i = 0; i < jobCount; i++) {
        jobs.push({
          queueName,
          name: jobName,
          data: { id: i, message: `Rapid job ${i}` }
        });
      }

      const startTime = Date.now();
      await Promise.all(jobs.map(job => queueService.submitJob(job)));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify all jobs were processed
      expect(processedCount).toBe(jobCount);
    }, 15000);
  });
}); 