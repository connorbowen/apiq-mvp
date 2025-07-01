import PgBoss from 'pg-boss';
import { PrismaClient } from '../../generated/prisma';
import { logError, logInfo } from '../../utils/logger';

/**
 * Queue Service using pg-boss for workflow execution
 * Provides max-concurrency limits, health checks, and robust job management
 */

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  retryLimit?: number;
  retryDelay?: number;
  timeout?: number;
  priority?: number;
}

export interface QueueConfig {
  maxConcurrency: number;
  retryLimit: number;
  retryDelay: number;
  timeout: number;
  healthCheckInterval: number;
}

export interface QueueHealth {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  activeJobs: number;
  queuedJobs: number;
  failedJobs: number;
  workers: number;
  uptime: number;
  lastHealthCheck: Date;
}

export interface WorkerStats {
  workerId: string;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastActivity: Date;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrency: 10,
  retryLimit: 3,
  retryDelay: 5000,
  timeout: 300000,
  healthCheckInterval: 30000
};

export class QueueService {
  private boss: PgBoss;
  private prisma: PrismaClient;
  private config: QueueConfig;
  private isInitialized: boolean = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private workerStats: Map<string, WorkerStats> = new Map();
  private lastHealthCheck: Date = new Date();

  constructor(prisma: PrismaClient, config: Partial<QueueConfig> = {}) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      max: this.config.maxConcurrency,
      retryLimit: this.config.retryLimit,
      retryDelay: this.config.retryDelay,
      monitorStateIntervalSeconds: 10,
      maintenanceIntervalMinutes: 1,
      archiveCompletedAfterSeconds: 24 * 60 * 60,
      archiveFailedAfterSeconds: 24 * 60 * 60
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.boss.start();
      this.isInitialized = true;
      
      logInfo('Queue service initialized', {
        maxConcurrency: this.config.maxConcurrency,
        retryLimit: this.config.retryLimit,
        timeout: this.config.timeout
      });

      this.startHealthCheck();
    } catch (error) {
      logError('Failed to initialize queue service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.stopHealthCheck();
      await this.boss.stop();
      this.isInitialized = false;
      logInfo('Queue service stopped');
    } catch (error) {
      logError('Failed to stop queue service', error);
      throw error;
    }
  }

  async submitJob(job: QueueJob): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      this.validateJob(job);

      const jobId = await this.boss.send(job.name, job.data, {
        retryLimit: job.retryLimit ?? this.config.retryLimit,
        retryDelay: job.retryDelay ?? this.config.retryDelay,
        timeout: job.timeout ?? this.config.timeout,
        priority: job.priority ?? 0
      });

      logInfo('Job submitted to queue', {
        jobId,
        jobName: job.name,
        priority: job.priority ?? 0
      });

      return jobId;
    } catch (error) {
      logError('Failed to submit job to queue', error, {
        jobName: job.name,
        jobData: this.sanitizeJobData(job.data)
      });
      throw error;
    }
  }

  async registerWorker(
    jobName: string,
    handler: (job: any) => Promise<any>,
    options: {
      concurrency?: number;
      timeout?: number;
      retryLimit?: number;
    } = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const workerId = `${jobName}-${Date.now()}`;
      
      await this.boss.work(jobName, {
        concurrency: options.concurrency ?? this.config.maxConcurrency,
        timeout: options.timeout ?? this.config.timeout,
        retryLimit: options.retryLimit ?? this.config.retryLimit
      }, async (job) => {
        const startTime = Date.now();
        
        try {
          this.updateWorkerStats(workerId, 'active');
          
          logInfo('Processing job', {
            jobId: job.id,
            jobName: job.name,
            workerId
          });

          const result = await handler(job.data);
          
          this.updateWorkerStats(workerId, 'completed', Date.now() - startTime);
          
          logInfo('Job completed successfully', {
            jobId: job.id,
            jobName: job.name,
            workerId,
            duration: Date.now() - startTime
          });

          return result;
        } catch (error) {
          this.updateWorkerStats(workerId, 'failed', Date.now() - startTime);
          
          logError('Job failed', error, {
            jobId: job.id,
            jobName: job.name,
            workerId,
            duration: Date.now() - startTime
          });

          throw error;
        }
      });

      logInfo('Worker registered', {
        jobName,
        workerId,
        concurrency: options.concurrency ?? this.config.maxConcurrency
      });
    } catch (error) {
      logError('Failed to register worker', error, { jobName });
      throw error;
    }
  }

  async getHealthStatus(): Promise<QueueHealth> {
    if (!this.isInitialized) {
      return {
        status: 'error',
        message: 'Queue service not initialized',
        activeJobs: 0,
        queuedJobs: 0,
        failedJobs: 0,
        workers: 0,
        uptime: 0,
        lastHealthCheck: new Date()
      };
    }

    try {
      const [activeJobs, queuedJobs, failedJobs] = await Promise.all([
        this.boss.getActiveJobCount(),
        this.boss.getQueueSize(),
        this.boss.getFailedJobCount()
      ]);

      const workers = this.workerStats.size;
      const uptime = Date.now() - this.lastHealthCheck.getTime();

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Queue service is healthy';

      if (failedJobs > 10) {
        status = 'error';
        message = `High number of failed jobs: ${failedJobs}`;
      } else if (queuedJobs > 100) {
        status = 'warning';
        message = `High queue size: ${queuedJobs} jobs`;
      } else if (activeJobs > this.config.maxConcurrency * 0.8) {
        status = 'warning';
        message = `High concurrency: ${activeJobs}/${this.config.maxConcurrency} jobs`;
      }

      return {
        status,
        message,
        activeJobs,
        queuedJobs,
        failedJobs,
        workers,
        uptime,
        lastHealthCheck: this.lastHealthCheck
      };
    } catch (error) {
      logError('Failed to get queue health status', error);
      return {
        status: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        activeJobs: 0,
        queuedJobs: 0,
        failedJobs: 0,
        workers: 0,
        uptime: 0,
        lastHealthCheck: new Date()
      };
    }
  }

  getWorkerStats(): WorkerStats[] {
    return Array.from(this.workerStats.values());
  }

  async cancelJob(jobId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      await this.boss.cancel(jobId);
      logInfo('Job cancelled', { jobId });
    } catch (error) {
      logError('Failed to cancel job', error, { jobId });
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const job = await this.boss.getJobById(jobId);
      return job;
    } catch (error) {
      logError('Failed to get job status', error, { jobId });
      throw error;
    }
  }

  async clearFailedJobs(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const failedJobs = await this.boss.getFailedJobs();
      const jobIds = failedJobs.map(job => job.id);
      
      if (jobIds.length > 0) {
        await this.boss.deleteJobs(jobIds);
      }

      logInfo('Failed jobs cleared', { count: jobIds.length });
      return jobIds.length;
    } catch (error) {
      logError('Failed to clear failed jobs', error);
      throw error;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        
        if (health.status === 'error') {
          logError('Queue health check failed', new Error(health.message), health);
        } else if (health.status === 'warning') {
          logInfo('Queue health warning', health);
        }
        
        this.lastHealthCheck = new Date();
      } catch (error) {
        logError('Health check monitoring failed', error);
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private updateWorkerStats(workerId: string, action: 'active' | 'completed' | 'failed', duration?: number): void {
    const stats = this.workerStats.get(workerId) || {
      workerId,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      lastActivity: new Date()
    };

    switch (action) {
      case 'active':
        stats.activeJobs++;
        break;
      case 'completed':
        stats.activeJobs = Math.max(0, stats.activeJobs - 1);
        stats.completedJobs++;
        break;
      case 'failed':
        stats.activeJobs = Math.max(0, stats.activeJobs - 1);
        stats.failedJobs++;
        break;
    }

    stats.lastActivity = new Date();
    this.workerStats.set(workerId, stats);
  }

  private validateJob(job: QueueJob): void {
    if (!job.name || typeof job.name !== 'string') {
      throw new Error('Job name is required and must be a string');
    }

    if (!job.data) {
      throw new Error('Job data is required');
    }

    if (job.retryLimit !== undefined && (job.retryLimit < 0 || job.retryLimit > 10)) {
      throw new Error('Retry limit must be between 0 and 10');
    }

    if (job.retryDelay !== undefined && (job.retryDelay < 1000 || job.retryDelay > 300000)) {
      throw new Error('Retry delay must be between 1 and 300 seconds');
    }

    if (job.timeout !== undefined && (job.timeout < 1000 || job.timeout > 3600000)) {
      throw new Error('Timeout must be between 1 and 3600 seconds');
    }

    if (job.priority !== undefined && (job.priority < -10 || job.priority > 10)) {
      throw new Error('Priority must be between -10 and 10');
    }
  }

  private sanitizeJobData(data: any): any {
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });

      return sanitized;
    }

    return data;
  }
} 