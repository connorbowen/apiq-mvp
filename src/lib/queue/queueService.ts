import { getQueueClient, QueueClient } from '../queueWrapper';
import { prisma } from '../singletons/prisma';
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

// Prometheus metrics types
interface QueueMetrics {
  jobsTotal: number;
  jobsCompleted: number;
  jobsFailed: number;
  jobsRetry: number;
  jobsActive: number;
  jobsDelayed: number;
  jobsCancelled: number;
  jobsExpired: number;
  queueSize: number;
  workerCount: number;
  avgProcessingTime: number;
  avgWaitTime: number;
  throughputPerMinute: number;
  errorRate: number;
}

// Enhanced job state types
export type JobState = 
  | 'created' 
  | 'retry' 
  | 'active' 
  | 'completed' 
  | 'cancelled' 
  | 'expired' 
  | 'failed';

// Job payload validation schema
const JobPayloadSchema = z.object({
  data: z.any(),
  options: z.object({
    priority: z.number().min(1).max(10).optional(),
    delay: z.number().min(0).optional(),
    retryLimit: z.number().min(0).optional(),
    retryDelay: z.number().min(0).optional(),
    timeout: z.number().min(0).optional(),
    jobKey: z.string().optional(),
  }).optional(),
});

// Queue statistics interface
export interface QueueStatistics {
  queueName: string;
  metrics: QueueMetrics;
  lastUpdated: Date;
  health: 'healthy' | 'degraded' | 'unhealthy';
}

// Enhanced job interface
export interface Job {
  id: string;
  name: string;
  data: any;
  state: JobState;
  created: Date;
  started?: Date;
  completed?: Date;
  failed?: Date;
  retryCount: number;
  retryLimit: number;
  retryDelay: number;
  timeout: number;
  priority: number;
  delay: number;
  jobKey?: string;
  queueName: string;
}

// Worker statistics interface
export interface WorkerStatistics {
  workerId: string;
  queueName: string;
  jobsProcessed: number;
  jobsFailed: number;
  avgProcessingTime: number;
  lastJobProcessed?: Date;
  isActive: boolean;
  startTime: Date;
}

// Queue service configuration
export interface QueueServiceConfig {
  connectionString?: string;
  schema?: string;
  poolSize?: number;
  maxConcurrency?: number;
  retryLimit?: number;
  retryDelay?: number;
  timeout?: number;
  healthCheckInterval?: number;
  retentionDays?: number;
  archiveCompletedJobs?: boolean;
  archiveFailedJobs?: boolean;
  enableMetrics?: boolean;
  metricsInterval?: number; // in milliseconds
}

// Prometheus metrics collector
class PrometheusMetricsCollector {
  private metrics: Map<string, QueueMetrics> = new Map();
  private lastUpdate: Date = new Date();

  updateMetrics(queueName: string, metrics: Partial<QueueMetrics>): void {
    const existing = this.metrics.get(queueName) || this.getDefaultMetrics();
    this.metrics.set(queueName, { ...existing, ...metrics });
    this.lastUpdate = new Date();
  }

  getMetrics(queueName: string): QueueMetrics | null {
    return this.metrics.get(queueName) || null;
  }

  getAllMetrics(): Map<string, QueueMetrics> {
    return new Map(Array.from(this.metrics.entries()));
  }

  getLastUpdate(): Date {
    return this.lastUpdate;
  }

  private getDefaultMetrics(): QueueMetrics {
    return {
      jobsTotal: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
      jobsRetry: 0,
      jobsActive: 0,
      jobsDelayed: 0,
      jobsCancelled: 0,
      jobsExpired: 0,
      queueSize: 0,
      workerCount: 0,
      avgProcessingTime: 0,
      avgWaitTime: 0,
      throughputPerMinute: 0,
      errorRate: 0,
    };
  }

  // Generate Prometheus format metrics
  generatePrometheusMetrics(): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    for (const [queueName, metrics] of Array.from(this.metrics.entries())) {
      const labels = `queue="${queueName}"`;
      
      lines.push(`# HELP pg_boss_jobs_total Total number of jobs`);
      lines.push(`# TYPE pg_boss_jobs_total counter`);
      lines.push(`pg_boss_jobs_total{${labels}} ${metrics.jobsTotal} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_completed Total number of completed jobs`);
      lines.push(`# TYPE pg_boss_jobs_completed counter`);
      lines.push(`pg_boss_jobs_completed{${labels}} ${metrics.jobsCompleted} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_failed Total number of failed jobs`);
      lines.push(`# TYPE pg_boss_jobs_failed counter`);
      lines.push(`pg_boss_jobs_failed{${labels}} ${metrics.jobsFailed} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_retry Total number of jobs in retry`);
      lines.push(`# TYPE pg_boss_jobs_retry gauge`);
      lines.push(`pg_boss_jobs_retry{${labels}} ${metrics.jobsRetry} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_active Total number of active jobs`);
      lines.push(`# TYPE pg_boss_jobs_active gauge`);
      lines.push(`pg_boss_jobs_active{${labels}} ${metrics.jobsActive} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_delayed Total number of delayed jobs`);
      lines.push(`# TYPE pg_boss_jobs_delayed gauge`);
      lines.push(`pg_boss_jobs_delayed{${labels}} ${metrics.jobsDelayed} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_cancelled Total number of cancelled jobs`);
      lines.push(`# TYPE pg_boss_jobs_cancelled counter`);
      lines.push(`pg_boss_jobs_cancelled{${labels}} ${metrics.jobsCancelled} ${timestamp}`);

      lines.push(`# HELP pg_boss_jobs_expired Total number of expired jobs`);
      lines.push(`# TYPE pg_boss_jobs_expired counter`);
      lines.push(`pg_boss_jobs_expired{${labels}} ${metrics.jobsExpired} ${timestamp}`);

      lines.push(`# HELP pg_boss_queue_size Current queue size`);
      lines.push(`# TYPE pg_boss_queue_size gauge`);
      lines.push(`pg_boss_queue_size{${labels}} ${metrics.queueSize} ${timestamp}`);

      lines.push(`# HELP pg_boss_worker_count Number of active workers`);
      lines.push(`# TYPE pg_boss_worker_count gauge`);
      lines.push(`pg_boss_worker_count{${labels}} ${metrics.workerCount} ${timestamp}`);

      lines.push(`# HELP pg_boss_avg_processing_time Average job processing time in milliseconds`);
      lines.push(`# TYPE pg_boss_avg_processing_time gauge`);
      lines.push(`pg_boss_avg_processing_time{${labels}} ${metrics.avgProcessingTime} ${timestamp}`);

      lines.push(`# HELP pg_boss_avg_wait_time Average job wait time in milliseconds`);
      lines.push(`# TYPE pg_boss_avg_wait_time gauge`);
      lines.push(`pg_boss_avg_wait_time{${labels}} ${metrics.avgWaitTime} ${timestamp}`);

      lines.push(`# HELP pg_boss_throughput_per_minute Jobs processed per minute`);
      lines.push(`# TYPE pg_boss_throughput_per_minute gauge`);
      lines.push(`pg_boss_throughput_per_minute{${labels}} ${metrics.throughputPerMinute} ${timestamp}`);

      lines.push(`# HELP pg_boss_error_rate Error rate as percentage`);
      lines.push(`# TYPE pg_boss_error_rate gauge`);
      lines.push(`pg_boss_error_rate{${labels}} ${metrics.errorRate} ${timestamp}`);
    }

    return lines.join('\n');
  }
}

export class QueueService {
  private boss: QueueClient;
  private config: QueueServiceConfig;
  private isInitialized: boolean = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private workerStats: Map<string, WorkerStats> = new Map();
  private lastHealthCheck: Date = new Date();
  private workers: Map<string, any> = new Map(); // TODO: Replace with proper PgBoss worker type
  private metricsCollector: PrometheusMetricsCollector;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const connectionString = this.config.connectionString || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.boss = getQueueClient({ connectionString });
    console.log('getQueueClient result:', this.boss);
    // Set up error handling
    this.boss.on('error', (error: any) => {
      logError('PgBoss error', error instanceof Error ? error : new Error(String(error)));
    });

    this.metricsCollector = new PrometheusMetricsCollector();
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
      this.startMetricsCollection();
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
          // PgBoss workers don't have an off() method, they are automatically cleaned up
          // when the boss instance is stopped
          logInfo('Worker cleanup initiated', { workerId });
        } catch (error) {
          logError('Failed to cleanup worker', error instanceof Error ? error : new Error(String(error)), { workerId });
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
        retryLimit: options.retryLimit ?? this.config.retryLimit
      };
      const dataSchema = options.dataSchema ?? DefaultJobDataSchema;
      const worker = await this.boss.work(queueName, workerOptions, async (jobs: any) => { // TODO: Replace with proper PgBoss job type
        const startTime = Date.now();
        try {
          // PgBoss passes an array of jobs, but we expect single jobs
          const job = Array.isArray(jobs) ? jobs[0] : jobs;
          
          // Debug: Log the job object structure
          logInfo('Job received by worker', {
            jobId: job?.id,
            jobKeys: job ? Object.keys(job) : 'job is null/undefined',
            jobData: job?.data,
            queueName,
            workerId
          });
          
          // Validate job data at runtime
          if (!job || !job.data) {
            throw new Error(`Invalid job object received: ${JSON.stringify(job)}`);
          }
          dataSchema.parse(job.data);
          this.updateWorkerStats(workerId, 'active');
          logInfo('Processing job', {
            jobId: job.id,
            queueName,
            workerId
          });
          const result = await handler(job);
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
            jobId: Array.isArray(jobs) ? jobs[0]?.id : jobs?.id,
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
      // PgBoss doesn't store job names, so we use the queue name as fallback
      return {
        id: job.id,
        queueName,
        name: job.name || queueName, // Use queue name as fallback if job name not available
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
    if (job.retryDelay !== undefined && (job.retryDelay < 100 || job.retryDelay > 300000)) {
      throw new Error('Retry delay must be between 0.1 and 300 seconds');
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

  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(async () => {
      try {
        // Update metrics for all registered queues
        for (const queueName of Array.from(this.workers.keys())) {
          await this.getQueueStatistics(queueName);
        }
      } catch (error) {
        logError('Metrics collection failed:', error as Error);
      }
    }, (this.config as any).metricsInterval || 30000);
  }

  private async getQueueStatistics(queueName: string): Promise<QueueStatistics> {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      // Get basic queue metrics from PgBoss
      const schema = this.config.schema || 'pgboss';
      const table = `"${schema}"."job"`;

      // Get job counts by state
      const jobCounts = await prisma.$queryRawUnsafe(`
        SELECT 
          state,
          COUNT(*) as count
        FROM ${table}
        WHERE name = $1
        GROUP BY state
      `, queueName);

      // Get worker count for this queue
      const workerCount = this.workers.has(queueName) ? 1 : 0;

      // Calculate metrics
      const metrics: QueueMetrics = {
        jobsTotal: 0,
        jobsCompleted: 0,
        jobsFailed: 0,
        jobsRetry: 0,
        jobsActive: 0,
        jobsDelayed: 0,
        jobsCancelled: 0,
        jobsExpired: 0,
        queueSize: 0,
        workerCount,
        avgProcessingTime: 0,
        avgWaitTime: 0,
        throughputPerMinute: 0,
        errorRate: 0
      };

      // Parse job counts
      for (const row of jobCounts as any[]) {
        const count = parseInt(row.count);
        metrics.jobsTotal += count;
        
        switch (row.state) {
          case 'completed':
            metrics.jobsCompleted = count;
            break;
          case 'failed':
            metrics.jobsFailed = count;
            break;
          case 'retry':
            metrics.jobsRetry = count;
            break;
          case 'active':
            metrics.jobsActive = count;
            break;
          case 'created':
            metrics.queueSize = count;
            break;
          case 'cancelled':
            metrics.jobsCancelled = count;
            break;
          case 'expired':
            metrics.jobsExpired = count;
            break;
        }
      }

      // Calculate error rate
      if (metrics.jobsTotal > 0) {
        metrics.errorRate = (metrics.jobsFailed / metrics.jobsTotal) * 100;
      }

      // Determine health status
      let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (metrics.errorRate > 10) {
        health = 'unhealthy';
      } else if (metrics.errorRate > 5 || metrics.jobsActive > 100) {
        health = 'degraded';
      }

      return {
        queueName,
        metrics,
        lastUpdated: new Date(),
        health
      };
    } catch (error) {
      logError('Failed to get queue statistics', error as Error, { queueName });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logInfo('Shutting down queue service');
    
    // Stop all workers
    for (const [workerId, worker] of Array.from(this.workers.entries())) {
      try {
        await worker.off();
        logInfo('Worker stopped', { workerId });
      } catch (error) {
        logError('Error stopping worker', error as Error, { workerId });
      }
    }
    
    // Clear worker collections
    this.workers.clear();
    this.workerStats.clear();
    
    // Stop the boss
    if (this.boss) {
      await this.boss.stop();
      logInfo('Queue service shutdown complete');
    }
  }

  async purge(): Promise<void> {
    if (!this.boss) {
      logInfo('PgBoss not initialized, skipping purge');
      return;
    }

    try {
      const schema = this.config.schema || 'pgboss';
      const table = `"${schema}"."job"`;

      // 1) Stop PgBoss so it releases any locks
      await this.boss.stop();

      // 2) Truncate parent + all partitions, reset IDs
      await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE
      `);

      // 3) Restart PgBoss so it rebuilds its partition map
      await this.boss.start();

      logInfo('Queue purged via TRUNCATE and PgBoss restart');
    } catch (err: any) {
      logError('Failed to purge queue', err as Error);
      // Try to restart PgBoss even if truncate failed
      try {
        await this.boss.start();
      } catch (restartError) {
        logError('Failed to restart PgBoss after purge failure', restartError as Error);
      }
    }
  }
}

// TODO: Retention/archive: set expireIn per job, run boss.archive() nightly, set deleteAfterDays on archive tables
// TODO: Graceful shutdown: call await boss.stop({ graceful: true }) in SIGTERM handler
// TODO: Visibility timeout/stall detection: tune expireIn, use onStalled, or heartbeat for long jobs
// TODO: Back-pressure/metrics: emit job counts per state to Prometheus, alert on high active/created counts
// TODO: Idempotent handlers: use jobKey or write handlers to be idempotent
// TODO: Transactional enqueue: use boss.publishWithin() inside a DB transaction if needed 