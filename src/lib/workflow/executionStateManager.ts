import { prisma } from '../singletons/prisma';
import { logError, logInfo, logDebug } from '../../utils/logger';
import { QueueService } from '../queue/queueService';

export interface ExecutionState {
  id: string;
  workflowId: string;
  userId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED' | 'RETRYING';
  attemptCount: number;
  maxAttempts: number;
  retryAfter?: Date;
  queueJobId?: string;
  queueName?: string;
  pausedAt?: Date;
  pausedBy?: string;
  resumedAt?: Date;
  resumedBy?: string;
  currentStep?: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  executionTime?: number;
  stepResults?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: any;
}

export interface ExecutionProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  progress: number; // 0-100 percentage
  estimatedTimeRemaining?: number; // in milliseconds
}

export interface RetryConfig {
  maxAttempts: number;
  retryDelay: number; // base delay in milliseconds
  exponentialBackoff: boolean;
  maxRetryDelay: number; // maximum delay in milliseconds
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  recentExecutions: ExecutionState[];
}

export class ExecutionStateManager {
  private queueService: QueueService;
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    retryDelay: 5000, // 5 seconds
    exponentialBackoff: true,
    maxRetryDelay: 300000 // 5 minutes
  };

  constructor(queueService: QueueService) {
    this.queueService = queueService;
  }

  /**
   * Create a new execution record with enhanced state tracking
   */
  async createExecution(
    workflowId: string,
    userId: string,
    totalSteps: number,
    maxAttempts: number = 3,
    metadata?: any
  ): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        userId,
        status: 'PENDING',
        totalSteps,
        maxAttempts,
        metadata: metadata || {}
      }
    });

    logInfo('Created execution record', {
      executionId: execution.id,
      workflowId,
      userId,
      totalSteps,
      maxAttempts
    });

    return this.mapToExecutionState(execution);
  }

  /**
   * Update execution status with proper state transitions
   */
  async updateStatus(
    executionId: string,
    status: ExecutionState['status'],
    additionalData?: {
      currentStep?: number;
      completedSteps?: number;
      failedSteps?: number;
      error?: string;
      result?: any;
      stepResults?: Record<string, any>;
    }
  ): Promise<ExecutionState> {
    const updateData: any = { status };

    // Handle status-specific updates
    switch (status) {
      case 'RUNNING':
        updateData.startedAt = new Date();
        break;
      case 'COMPLETED':
      case 'FAILED':
      case 'CANCELLED':
        updateData.completedAt = new Date();
        if (status === 'COMPLETED' || status === 'FAILED') {
          updateData.executionTime = Date.now() - (await this.getExecutionStartTime(executionId));
        }
        break;
      case 'PAUSED':
        updateData.pausedAt = new Date();
        break;
      case 'RETRYING':
        updateData.attemptCount = { increment: 1 };
        updateData.retryAfter = await this.calculateRetryTime(executionId);
        break;
    }

    // Add additional data
    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: updateData
    });

    logInfo('Updated execution status', {
      executionId,
      status,
      currentStep: additionalData?.currentStep,
      completedSteps: additionalData?.completedSteps,
      failedSteps: additionalData?.failedSteps
    });

    return this.mapToExecutionState(execution);
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string, pausedBy: string): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        pausedBy
      }
    });

    // Cancel the queue job if it exists
    if (execution.queueJobId && execution.queueName) {
      try {
        await this.queueService.cancelJob(execution.queueName, execution.queueJobId);
        logInfo('Cancelled queue job for paused execution', {
          executionId,
          queueJobId: execution.queueJobId,
          queueName: execution.queueName
        });
      } catch (error) {
        logError('Failed to cancel queue job', error as Error, { executionId });
      }
    }

    logInfo('Paused execution', { executionId, pausedBy });
    return this.mapToExecutionState(execution);
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string, resumedBy: string): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'PENDING', // Reset to pending to requeue
        resumedAt: new Date(),
        resumedBy
      }
    });

    logInfo('Resumed execution', { executionId, resumedBy });
    return this.mapToExecutionState(execution);
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string, cancelledBy: string): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        result: { cancelled: true, cancelledAt: new Date(), cancelledBy }
      }
    });

    // Cancel the queue job if it exists
    if (execution.queueJobId && execution.queueName) {
      try {
        await this.queueService.cancelJob(execution.queueName, execution.queueJobId);
        logInfo('Cancelled queue job for cancelled execution', {
          executionId,
          queueJobId: execution.queueJobId,
          queueName: execution.queueName
        });
      } catch (error) {
        logError('Failed to cancel queue job', error as Error, { executionId });
      }
    }

    logInfo('Cancelled execution', { executionId, cancelledBy });
    return this.mapToExecutionState(execution);
  }

  /**
   * Update execution progress
   */
  async updateProgress(
    executionId: string,
    progress: {
      currentStep?: number;
      completedSteps?: number;
      failedSteps?: number;
      stepResults?: Record<string, any>;
    }
  ): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: progress
    });

    logDebug('Updated execution progress', {
      executionId,
      ...progress
    });

    return this.mapToExecutionState(execution);
  }

  /**
   * Set queue job information
   */
  async setQueueJob(
    executionId: string,
    queueJobId: string,
    queueName: string
  ): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        queueJobId,
        queueName
      }
    });

    logInfo('Set queue job for execution', {
      executionId,
      queueJobId,
      queueName
    });

    return this.mapToExecutionState(execution);
  }

  /**
   * Get execution state
   */
  async getExecutionState(executionId: string): Promise<ExecutionState | null> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId }
    });

    return execution ? this.mapToExecutionState(execution) : null;
  }

  /**
   * Get execution progress
   */
  async getExecutionProgress(executionId: string): Promise<ExecutionProgress | null> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      select: {
        currentStep: true,
        totalSteps: true,
        completedSteps: true,
        failedSteps: true,
        startedAt: true,
        status: true
      }
    });

    if (!execution) return null;

    const progress = (execution.completedSteps / execution.totalSteps) * 100;
    
    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (execution.status === 'RUNNING' && execution.currentStep !== null && execution.currentStep > 0) {
      const elapsed = Date.now() - execution.startedAt.getTime();
      const avgTimePerStep = elapsed / execution.currentStep;
      const remainingSteps = execution.totalSteps - execution.currentStep;
      estimatedTimeRemaining = avgTimePerStep * remainingSteps;
    }

    return {
      currentStep: execution.currentStep || 0,
      totalSteps: execution.totalSteps,
      completedSteps: execution.completedSteps,
      failedSteps: execution.failedSteps,
      progress: Math.round(progress),
      estimatedTimeRemaining
    };
  }

  /**
   * Check if execution should be retried with enhanced logic
   */
  async shouldRetry(executionId: string): Promise<boolean> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      select: {
        attemptCount: true,
        maxAttempts: true,
        retryAfter: true,
        status: true,
        error: true
      }
    });

    if (!execution) return false;

    // Check if we've exceeded max attempts
    if (execution.attemptCount >= execution.maxAttempts) {
      logInfo('Execution exceeded max attempts', {
        executionId,
        attemptCount: execution.attemptCount,
        maxAttempts: execution.maxAttempts
      });
      return false;
    }

    // Check if retry time has passed
    if (execution.retryAfter && execution.retryAfter > new Date()) {
      logDebug('Execution retry time not yet reached', {
        executionId,
        retryAfter: execution.retryAfter,
        currentTime: new Date()
      });
      return false;
    }

    // Only retry if status is FAILED and not cancelled
    if (execution.status !== 'FAILED') {
      return false;
    }

    // Check if error is retryable (not a permanent failure)
    if (execution.error && this.isPermanentError(execution.error)) {
      logInfo('Execution has permanent error, not retrying', {
        executionId,
        error: execution.error
      });
      return false;
    }

    return true;
  }

  /**
   * Get executions that need to be retried
   */
  async getRetryableExecutions(): Promise<ExecutionState[]> {
    const executions = await prisma.workflowExecution.findMany({
      where: {
        status: 'FAILED',
        retryAfter: { lte: new Date() }
      }
    });

    // Filter by attempt count and check for permanent errors
    const retryableExecutions = executions.filter(execution => {
      if (execution.attemptCount >= execution.maxAttempts) {
        return false;
      }
      
      if (execution.error && this.isPermanentError(execution.error)) {
        return false;
      }
      
      return true;
    });

    return retryableExecutions.map(execution => this.mapToExecutionState(execution));
  }

  /**
   * Get executions that are paused
   */
  async getPausedExecutions(): Promise<ExecutionState[]> {
    const executions = await prisma.workflowExecution.findMany({
      where: {
        status: 'PAUSED'
      }
    });

    return executions.map(execution => this.mapToExecutionState(execution));
  }

  /**
   * Get executions that are stuck (RUNNING for too long)
   */
  async getStuckExecutions(timeoutMinutes: number = 30): Promise<ExecutionState[]> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    const executions = await prisma.workflowExecution.findMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: timeoutDate }
      }
    });

    return executions.map(execution => this.mapToExecutionState(execution));
  }

  /**
   * Get execution metrics for monitoring
   */
  async getExecutionMetrics(
    workflowId?: string,
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ExecutionMetrics> {
    const whereClause: any = {};
    
    if (workflowId) whereClause.workflowId = workflowId;
    if (userId) whereClause.userId = userId;
    if (timeRange) {
      whereClause.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end
      };
    }

    const [totalExecutions, successfulExecutions, failedExecutions, recentExecutions] = await Promise.all([
      prisma.workflowExecution.count({ where: whereClause }),
      prisma.workflowExecution.count({ 
        where: { ...whereClause, status: 'COMPLETED' } 
      }),
      prisma.workflowExecution.count({ 
        where: { ...whereClause, status: 'FAILED' } 
      }),
      prisma.workflowExecution.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate average execution time
    const completedExecutions = await prisma.workflowExecution.findMany({
      where: { ...whereClause, status: 'COMPLETED', executionTime: { not: null } },
      select: { executionTime: true }
    });

    const totalExecutionTime = completedExecutions.reduce((sum, exec) => sum + (exec.executionTime || 0), 0);
    const averageExecutionTime = completedExecutions.length > 0 ? totalExecutionTime / completedExecutions.length : 0;

    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      successRate,
      recentExecutions: recentExecutions.map(exec => this.mapToExecutionState(exec))
    };
  }

  /**
   * Clean up old execution records
   */
  async cleanupOldExecutions(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.workflowExecution.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
      }
    });

    logInfo('Cleaned up old execution records', {
      deletedCount: result.count,
      retentionDays,
      cutoffDate
    });

    return result.count;
  }

  /**
   * Reset execution for retry
   */
  async resetExecutionForRetry(executionId: string): Promise<ExecutionState> {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
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

    logInfo('Reset execution for retry', { executionId });
    return this.mapToExecutionState(execution);
  }

  /**
   * Private helper methods
   */
  private async getExecutionStartTime(executionId: string): Promise<number> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      select: { startedAt: true }
    });

    return execution?.startedAt.getTime() || Date.now();
  }

  private async calculateRetryTime(executionId: string): Promise<Date> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      select: { attemptCount: true, maxAttempts: true }
    });

    if (!execution) {
      return new Date(Date.now() + this.defaultRetryConfig.retryDelay);
    }

    let delay = this.defaultRetryConfig.retryDelay;
    
    if (this.defaultRetryConfig.exponentialBackoff) {
      // Exponential backoff: 2^attempt * base delay
      delay = Math.min(
        Math.pow(2, execution.attemptCount) * this.defaultRetryConfig.retryDelay,
        this.defaultRetryConfig.maxRetryDelay
      );
    }

    const retryTime = new Date();
    retryTime.setTime(retryTime.getTime() + delay);
    
    logDebug('Calculated retry time', {
      executionId,
      attemptCount: execution.attemptCount,
      delay,
      retryTime
    });

    return retryTime;
  }

  private isPermanentError(error: string): boolean {
    // Define permanent errors that shouldn't be retried
    const permanentErrors = [
      'INVALID_API_KEY',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'INVALID_WORKFLOW',
      'USER_CANCELLED'
    ];

    return permanentErrors.some(permanentError => 
      error.toUpperCase().includes(permanentError)
    );
  }

  private mapToExecutionState(execution: any): ExecutionState {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      userId: execution.userId,
      status: execution.status,
      attemptCount: execution.attemptCount,
      maxAttempts: execution.maxAttempts,
      retryAfter: execution.retryAfter,
      queueJobId: execution.queueJobId,
      queueName: execution.queueName,
      pausedAt: execution.pausedAt,
      pausedBy: execution.pausedBy,
      resumedAt: execution.resumedAt,
      resumedBy: execution.resumedBy,
      currentStep: execution.currentStep,
      totalSteps: execution.totalSteps,
      completedSteps: execution.completedSteps,
      failedSteps: execution.failedSteps,
      executionTime: execution.executionTime,
      stepResults: execution.stepResults,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      error: execution.error,
      result: execution.result,
      metadata: execution.metadata
    };
  }
} 