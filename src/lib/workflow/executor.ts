import { Workflow, WorkflowStep } from '../../types';
import { ExecutionContext, StepResult } from './stepRunner';
import type { WorkflowExecution } from '../../../src/generated/prisma';
import { logError, logInfo, logDebug, logWorkflowExecution } from '../../utils/logger';
import { prisma } from '../../../lib/database/client';
import { stepRunner } from './stepRunner';
import { ExecutionStateManager, ExecutionState, ExecutionMetrics } from './executionStateManager';
import { QueueService } from '../queue/queueService';

// Workflow execution configuration
export interface ExecutionConfig {
  maxConcurrency?: number;
  timeout?: number;
  enableRollback?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  useQueue?: boolean;
  queueName?: string;
  enableMonitoring?: boolean;
  stuckExecutionTimeout?: number; // minutes
}

// Workflow execution result
export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  results: Record<number, StepResult>;
  error?: string;
  metadata?: Record<string, any>;
  queueJobId?: string;
}

// Workflow Executor
export class WorkflowExecutor {
  private config: ExecutionConfig;
  private stateManager: ExecutionStateManager;
  private queueService: QueueService;

  constructor(
    config: ExecutionConfig = {},
    stateManager: ExecutionStateManager,
    queueService: QueueService
  ) {
    this.config = {
      maxConcurrency: 1, // Sequential execution by default
      timeout: 300000, // 5 minutes
      enableRollback: true,
      retryOnFailure: true,
      maxRetries: 3,
      useQueue: true,
      queueName: 'workflow-execution',
      enableMonitoring: true,
      stuckExecutionTimeout: 30, // 30 minutes
      ...config
    };
    this.stateManager = stateManager;
    this.queueService = queueService;
  }

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(
    workflow: any, // Accept any workflow type for flexibility
    steps: any[], // Accept any steps type for flexibility
    userId: string,
    parameters: Record<string, any> = {}
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    
    // Create execution record with enhanced state tracking
    const execution = await this.stateManager.createExecution(
      workflow.id,
      userId,
      steps.length,
      this.config.maxRetries,
      { parameters, workflowName: workflow.name }
    );
    
    logInfo('Workflow execution started', {
      workflowId: workflow.id,
      workflowName: workflow.name,
      executionId: execution.id,
      stepCount: steps.length,
      userId
    });

    try {
      // Initialize execution context
      const context: ExecutionContext = {
        executionId: execution.id,
        workflowId: workflow.id,
        userId,
        parameters,
        stepResults: {},
        globalVariables: {}
      };

      // Update execution status to RUNNING
      await this.stateManager.updateStatus(execution.id, 'RUNNING');

      // Execute steps with progress tracking
      const results = await this.executeStepsWithProgress(steps, context, execution.id);

      // Calculate execution summary
      const completedSteps = Object.values(results).filter(r => r.success).length;
      const failedSteps = Object.values(results).filter(r => !r.success).length;
      const totalDuration = Date.now() - startTime;

      // Determine final status
      const status = failedSteps === 0 ? 'COMPLETED' : 'FAILED';
      const success = status === 'COMPLETED';

      // Update execution record with final results
      await this.stateManager.updateStatus(execution.id, status, {
        completedSteps,
        failedSteps,
        result: {
          success,
          totalSteps: steps.length,
          completedSteps,
          failedSteps,
          totalDuration,
          results
        }
      });

      logInfo('Workflow execution completed', {
        workflowId: workflow.id,
        executionId: execution.id,
        status,
        completedSteps,
        failedSteps,
        totalDuration
      });

      return {
        success,
        executionId: execution.id,
        status,
        totalSteps: steps.length,
        completedSteps,
        failedSteps,
        totalDuration,
        results,
        metadata: {
          workflowName: workflow.name,
          userId
        }
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logError('Workflow execution failed', error as Error, {
        workflowId: workflow.id,
        executionId: execution.id,
        totalDuration
      });

      // Update execution record with error
      try {
        await this.stateManager.updateStatus(execution.id, 'FAILED', {
          error: errorMessage,
          result: {
            success: false,
            error: errorMessage,
            totalDuration
          }
        });
      } catch (updateError) {
        logError('Failed to update execution status after error', updateError as Error, {
          executionId: execution.id
        });
      }

      return {
        success: false,
        executionId: execution.id,
        status: 'FAILED',
        totalSteps: steps.length,
        completedSteps: 0,
        failedSteps: steps.length,
        totalDuration,
        results: {},
        error: errorMessage,
        metadata: {
          workflowName: workflow.name,
          userId
        }
      };
    }
  }

  /**
   * Execute workflow steps with progress tracking
   */
  private async executeStepsWithProgress(
    steps: any[], 
    context: ExecutionContext, 
    executionId: string
  ): Promise<Record<number, StepResult>> {
    const results: Record<number, StepResult> = {};
    let completedSteps = 0;
    let failedSteps = 0;

    if (this.config.maxConcurrency === 1) {
      // Sequential execution with progress tracking
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Update current step
        await this.stateManager.updateProgress(executionId, {
          currentStep: i,
          completedSteps,
          failedSteps
        });

        // Check if execution has been paused or cancelled
        const currentState = await this.stateManager.getExecutionState(executionId);
        if (currentState?.status === 'PAUSED') {
          logInfo('Execution paused', { executionId, currentStep: i });
          throw new Error('Execution paused by user');
        }
        if (currentState?.status === 'CANCELLED') {
          logInfo('Execution cancelled', { executionId, currentStep: i });
          throw new Error('Execution cancelled by user');
        }

        const result = await this.executeStepWithRetry(step, context);
        results[step.stepOrder] = result;
        
        // Update context with step result
        context.stepResults[step.stepOrder] = result;
        
        // Update progress
        if (result.success) {
          completedSteps++;
        } else {
          failedSteps++;
        }

        // Update step results
        await this.stateManager.updateProgress(executionId, {
          completedSteps,
          failedSteps,
          stepResults: { ...results }
        });
        
        // Check if we should continue on failure
        if (!result.success && !this.config.retryOnFailure) {
          break;
        }
      }
    } else {
      // Concurrent execution (future enhancement)
      throw new Error('Concurrent execution not yet implemented');
    }

    return results;
  }

  /**
   * Execute a single step with enhanced retry logic
   */
  private async executeStepWithRetry(step: any, context: ExecutionContext): Promise<StepResult> {
    let lastResult: StepResult | null = null;
    const maxRetries = this.config.maxRetries || 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logDebug('Executing workflow step', {
          stepId: step.id,
          stepName: step.name,
          stepOrder: step.stepOrder,
          attempt: attempt + 1,
          maxRetries
        });

        const result = await stepRunner.executeStep(step, context);
        lastResult = result;

        if (result.success) {
          return result;
        }

        // If step failed and we have retries left, continue
        if (attempt < maxRetries) {
          logInfo('Step failed, retrying', {
            stepId: step.id,
            stepName: step.name,
            attempt: attempt + 1,
            maxRetries,
            error: result.error
          });
          
          // Wait before retry (exponential backoff)
          await this.sleep(Math.pow(2, attempt) * 1000);
        }

      } catch (error) {
        logError('Step execution error', error as Error, {
          stepId: step.id,
          stepName: step.name,
          attempt: attempt + 1,
          maxRetries
        });

        if (attempt === maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: 0,
            retryCount: attempt
          };
        }

        // Wait before retry
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    return lastResult || {
      success: false,
      error: 'Step execution failed after all retries',
      duration: 0,
      retryCount: maxRetries
    };
  }

  /**
   * Submit workflow for queue execution
   */
  async submitWorkflowForExecution(
    workflow: any,
    steps: any[],
    userId: string,
    parameters: Record<string, any> = {}
  ): Promise<{ executionId: string; queueJobId: string }> {
    if (!this.config.useQueue) {
      throw new Error('Queue execution is disabled');
    }

    // Create execution record
    const execution = await this.stateManager.createExecution(
      workflow.id,
      userId,
      steps.length,
      this.config.maxRetries,
      { parameters, workflowName: workflow.name }
    );

    // Submit job to queue
    const queueName = this.config.queueName || 'workflow-execution';
    const jobData = {
      executionId: execution.id,
      workflowId: workflow.id,
      userId,
      steps,
      parameters,
      config: this.config
    };

    const { jobId } = await this.queueService.submitJob({
      queueName,
      name: 'execute-workflow',
      data: jobData,
      retryLimit: this.config.maxRetries,
      retryDelay: 5000,
      timeout: this.config.timeout
    });

    // Update execution with queue job info
    await this.stateManager.setQueueJob(execution.id, jobId, queueName);

    logInfo('Submitted workflow for queue execution', {
      executionId: execution.id,
      queueJobId: jobId,
      queueName,
      workflowId: workflow.id,
      userId
    });

    return { executionId: execution.id, queueJobId: jobId };
  }

  /**
   * Pause workflow execution
   */
  async pauseExecution(executionId: string, pausedBy: string): Promise<void> {
    await this.stateManager.pauseExecution(executionId, pausedBy);
  }

  /**
   * Resume workflow execution
   */
  async resumeExecution(executionId: string, resumedBy: string): Promise<void> {
    const execution = await this.stateManager.resumeExecution(executionId, resumedBy);
    
    // Re-queue the job if queue execution is enabled
    if (this.config.useQueue && execution.queueName) {
      // This would typically involve re-queuing the job
      // For now, we'll just update the status
      logInfo('Execution resumed, ready for re-queuing', { executionId });
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string, cancelledBy: string): Promise<void> {
    await this.stateManager.cancelExecution(executionId, cancelledBy);
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionState | null> {
    return await this.stateManager.getExecutionState(executionId);
  }

  /**
   * Get execution progress
   */
  async getExecutionProgress(executionId: string): Promise<any> {
    return await this.stateManager.getExecutionProgress(executionId);
  }

  /**
   * Get execution logs
   */
  async getExecutionLogs(executionId: string): Promise<any[]> {
    return await prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' }
    });
  }

  /**
   * Get execution metrics for monitoring
   */
  async getExecutionMetrics(
    workflowId?: string,
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ExecutionMetrics> {
    return await this.stateManager.getExecutionMetrics(workflowId, userId, timeRange);
  }

  /**
   * Get stuck executions that need attention
   */
  async getStuckExecutions(timeoutMinutes?: number): Promise<ExecutionState[]> {
    const timeout = timeoutMinutes || this.config.stuckExecutionTimeout || 30;
    return await this.stateManager.getStuckExecutions(timeout);
  }

  /**
   * Get retryable executions
   */
  async getRetryableExecutions(): Promise<ExecutionState[]> {
    return await this.stateManager.getRetryableExecutions();
  }

  /**
   * Get paused executions
   */
  async getPausedExecutions(): Promise<ExecutionState[]> {
    return await this.stateManager.getPausedExecutions();
  }

  /**
   * Reset execution for retry
   */
  async resetExecutionForRetry(executionId: string): Promise<ExecutionState> {
    return await this.stateManager.resetExecutionForRetry(executionId);
  }

  /**
   * Clean up old execution records
   */
  async cleanupOldExecutions(retentionDays: number = 30): Promise<number> {
    return await this.stateManager.cleanupOldExecutions(retentionDays);
  }

  /**
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function to create WorkflowExecutor with dependencies
export function createWorkflowExecutor(
  stateManager: ExecutionStateManager,
  queueService: QueueService,
  config: ExecutionConfig = {}
): WorkflowExecutor {
  return new WorkflowExecutor(config, stateManager, queueService);
}

// TODO: Remove this singleton export once all consumers are updated to use dependency injection
// For now, we'll create a placeholder that throws an error to prevent usage
export const workflowExecutor = new Proxy({} as WorkflowExecutor, {
  get() {
    throw new Error(
      'workflowExecutor singleton is deprecated. Use createWorkflowExecutor() with dependencies instead.'
    );
  }
}); 