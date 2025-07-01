import PgBoss from 'pg-boss';
import { PrismaClient } from '../../generated/prisma';
import { logError, logInfo } from '../../utils/logger';
// @ts-ignore
import { z } from 'zod'; // Use zod for runtime validation if available

/**
 * Queue Service using pg-boss for workflow execution
 * Provides max-concurrency limits, health checks, and robust job management
 * Compatible with pg-boss 10.3.2
 *
 * Best practices:
 * 1. Always store queueName + jobId for job operations (unless using jobKey)
 * 2. Use jobKey for global uniqueness/deduplication
 * 3. Expose all PgBoss job states (see PgBossJobState)
 * 4. Use teamSize for worker parallelism, single-job handler
 * 5. Validate job payloads at the boundary (zod)
 * 6. Fail fast on null returns from send()
 * 7. Add TODOs for retention, graceful shutdown, metrics, transactional enqueue
 */

// Full set of PgBoss job states (update if PgBoss adds new states)
export type PgBossJobState =
  | 'created'
  | 'retry'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'failed';

export interface QueueJob {
  id?: string;
  queueName: string;
  name: string;
  data: any; // TODO: Replace with more specific type based on job type
  retryLimit?: number;
  retryDelay?: number;
  timeout?: number;
  priority?: number;
  delay?: number;
  expireIn?: number;
  jobKey?: string;
}

export interface QueueConfig {
  maxConcurrency: number;
  retryLimit: number;
  retryDelay: number;
  timeout: number;
  healthCheckInterval: number;
  connectionString?: string;
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

export interface JobStatus {
  id: string;
  queueName: string;
  name: string;
  data: any; // TODO: Replace with more specific type based on job type
  state: PgBossJobState;
  retryLimit?: number;
  retryCount?: number;
  startAfter?: Date;
  expireIn?: number;
  output?: any; // TODO: Replace with more specific type based on job output
  createdOn: Date;
  completedOn?: Date;
  failedOn?: Date;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrency: 10,
  retryLimit: 3,
  retryDelay: 5000,
  timeout: 300000,
  healthCheckInterval: 30000
};

// Example zod schema for job data (customize per job type)
const DefaultJobDataSchema = z.any();

export class QueueService {
  private boss: PgBoss;
  private prisma: PrismaClient;
  private config: QueueConfig;
  private isInitialized: boolean = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private workerStats: Map<string, WorkerStats> = new Map();
  private lastHealthCheck: Date = new Date();
  private workers: Map<string, any> = new Map(); // TODO: Replace with proper PgBoss worker type

  constructor(prisma: PrismaClient, config: Partial<QueueConfig> = {}) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const connectionString = this.config.connectionString || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.boss = new PgBoss(connectionString);
    
    // Set up error handling
    this.boss.on('error', (error: Error) => {
      logError('PgBoss error', error);
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
      logError('Failed to initialize queue service', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.stopHealthCheck();
      // TODO: Graceful shutdown: await this.boss.stop({ graceful: true }) in SIGTERM handler
      this.workers.forEach(async (worker, workerId) => {
        try {
          await worker.off();
          logInfo('Worker stopped', { workerId });
        } catch (error) {
          logError('Failed to stop worker', error as Error, { workerId });
        }
      });
      this.workers.clear();
      await this.boss.stop();
      this.isInitialized = false;
      logInfo('Queue service stopped');
    } catch (error) {
      logError('Failed to stop queue service', error as Error);
      throw error;
    }
  }

  /**
   * Enqueue a job. Always provide queueName. Use jobKey for deduplication if needed.
   * Throws if job cannot be enqueued (e.g., duplicate jobKey).
   */
  async submitJob(job: QueueJob, dataSchema: z.ZodTypeAny = DefaultJobDataSchema): Promise<{ queueName: string; jobId: string }> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      this.validateJob(job);
      // Validate job data at runtime
      dataSchema.parse(job.data);

      // Create queue if it doesn't exist
      await this.boss.createQueue(job.queueName);

      const jobOptions: any = {
        retryLimit: job.retryLimit ?? this.config.retryLimit,
        retryDelay: job.retryDelay ?? this.config.retryDelay,
        timeout: job.timeout ?? this.config.timeout
      };
      if (job.priority !== undefined) jobOptions.priority = job.priority;
      if (job.delay !== undefined) jobOptions.startAfter = new Date(Date.now() + job.delay);
      if (job.expireIn !== undefined) jobOptions.expireIn = job.expireIn;
      if (job.jobKey !== undefined) jobOptions.key = job.jobKey;

      const jobId = await this.boss.send(job.queueName, job.data, jobOptions);
      if (!jobId) {
        logError(
          'Failed to enqueue job (likely duplicate jobKey)',
          new Error('Failed to enqueue job (likely duplicate jobKey)'),
          {
            jobKey: job.jobKey,
            queueName: job.queueName,
            jobName: job.name,
            jobData: this.sanitizeJobData(job.data)
          }
        );
        throw new Error('Failed to enqueue job (likely duplicate jobKey)');
      }

      logInfo('Job submitted to queue', {
        jobId,
        queueName: job.queueName,
        jobName: job.name,
        priority: job.priority ?? 0,
        jobKey: job.jobKey
      });

      return { queueName: job.queueName, jobId };
    } catch (error) {
      logError('Failed to submit job to queue', error as Error, {
        jobName: job.name,
        queueName: job.queueName,
        jobKey: job.jobKey,
        jobData: this.sanitizeJobData(job.data)
      });
      throw error;
    }
  }

  /**
   * Register a worker for a queue. Use teamSize for parallelism. Handler receives a single job.
   * Use zod schema for payload validation.
   */
  async registerWorker(
    queueName: string,
    handler: (job: any) => Promise<any>, // TODO: Replace with proper job type
    options: {
      teamSize?: number;
      timeout?: number;
      retryLimit?: number;
      dataSchema?: z.ZodTypeAny;
    } = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const workerId = `${queueName}-${Date.now()}`;
      await this.boss.createQueue(queueName);
      const workerOptions = {
        teamSize: options.teamSize ?? this.config.maxConcurrency,
        timeout: options.timeout ?? this.config.timeout,
        retryLimit: options.retryLimit ?? this.config.retryLimit,
        batchSize: 1 // Always single-job handler for clarity
      };
      const dataSchema = options.dataSchema ?? DefaultJobDataSchema;
      const worker = await this.boss.work(queueName, workerOptions, async (job: any) => { // TODO: Replace with proper PgBoss job type
        const startTime = Date.now();
        try {
          // Validate job data at runtime
          dataSchema.parse(job.data);
          this.updateWorkerStats(workerId, 'active');
          logInfo('Processing job', {
            jobId: job.id,
            queueName,
            workerId
          });
          const result = await handler(job.data);
          this.updateWorkerStats(workerId, 'completed');
          logInfo('Job completed successfully', {
            jobId: job.id,
            queueName,
            workerId,
            duration: Date.now() - startTime
          });
          return result;
        } catch (error) {
          this.updateWorkerStats(workerId, 'failed');
          logError('Job failed', error as Error, {
            jobId: job.id,
            queueName,
            workerId,
            duration: Date.now() - startTime
          });
          throw error;
        }
      });
      this.workers.set(workerId, worker);
      logInfo('Worker registered', {
        queueName,
        workerId,
        teamSize: options.teamSize ?? this.config.maxConcurrency
      });
    } catch (error) {
      logError('Failed to register worker', error as Error, { queueName });
      throw error;
    }
  }

  /**
   * Get health status. TODO: Add real queue metrics and Prometheus integration.
   */
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
      // TODO: Implement real queue metrics (active, queued, failed jobs per queue)
      // TODO: Emit metrics to Prometheus
      const workers = this.workerStats.size;
      const uptime = Date.now() - this.lastHealthCheck.getTime();
      const status: 'healthy' | 'warning' | 'error' = 'healthy';
      const message = 'Queue service is healthy';
      return {
        status,
        message,
        activeJobs: 0, // TODO
        queuedJobs: 0, // TODO
        failedJobs: 0, // TODO
        workers,
        uptime,
        lastHealthCheck: this.lastHealthCheck
      };
    } catch (error) {
      logError('Failed to get queue health status', error as Error);
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

  /**
   * Cancel a job. Requires queueName and jobId.
   */
  async cancelJob(queueName: string, jobId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }
    try {
      await this.boss.cancel(queueName, jobId);
      logInfo('Job cancelled', { queueName, jobId });
    } catch (error) {
      logError('Failed to cancel job', error as Error, { queueName, jobId });
      throw error;
    }
  }

  /**
   * Get job status. Requires queueName and jobId.
   */
  async getJobStatus(queueName: string, jobId: string): Promise<JobStatus | null> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }
    try {
      const job = await this.boss.getJobById(queueName, jobId);
      if (!job) return null;
      // Defensive: map PgBoss job fields to our JobStatus
      return {
        id: job.id,
        queueName,
        name: job.name,
        data: job.data,
        state: job.state as PgBossJobState,
        retryLimit: job.retryLimit ?? undefined,
        retryCount: job.retryCount ?? undefined,
        startAfter: job.startAfter ?? undefined,
        expireIn: typeof job.expireIn === 'number' ? job.expireIn : undefined,
        output: job.output ?? undefined,
        createdOn: job.createdOn,
        completedOn: job.completedOn ?? undefined,
        failedOn: (job as any).failedOn ?? undefined // TODO: Replace with proper PgBoss job type
      };
    } catch (error) {
      logError('Failed to get job status', error as Error, { queueName, jobId });
      throw error;
    }
  }

  /**
   * Placeholder: implement failed job clearing/retention/archival.
   * TODO: Use boss.archive(), set deleteAfterDays, and/or expireIn per job.
   */
  async clearFailedJobs(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }
    try {
      // TODO: Implement real failed job clearing
      logInfo('Failed jobs clear operation requested (not yet implemented)');
      return 0;
    } catch (error) {
      logError('Failed to clear failed jobs', error as Error);
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
        logError('Health check monitoring failed', error as Error);
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private updateWorkerStats(workerId: string, action: 'active' | 'completed' | 'failed'): void {
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
    if (!job.queueName || typeof job.queueName !== 'string') {
      throw new Error('Queue name is required and must be a string');
    }
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
    if (job.delay !== undefined && (job.delay < 0 || job.delay > 86400000)) {
      throw new Error('Delay must be between 0 and 24 hours');
    }
    if (job.expireIn !== undefined && (job.expireIn < 1000 || job.expireIn > 86400000)) {
      throw new Error('Expire time must be between 1 second and 24 hours');
    }
  }

  private sanitizeJobData(data: any): any { // TODO: Replace with more specific types
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

// TODO: Retention/archive: set expireIn per job, run boss.archive() nightly, set deleteAfterDays on archive tables
// TODO: Graceful shutdown: call await boss.stop({ graceful: true }) in SIGTERM handler
// TODO: Visibility timeout/stall detection: tune expireIn, use onStalled, or heartbeat for long jobs
// TODO: Back-pressure/metrics: emit job counts per state to Prometheus, alert on high active/created counts
// TODO: Idempotent handlers: use jobKey or write handlers to be idempotent
// TODO: Transactional enqueue: use boss.publishWithin() inside a DB transaction if needed 