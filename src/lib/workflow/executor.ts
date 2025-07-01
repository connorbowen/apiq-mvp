import { Workflow, WorkflowStep } from '../../types';
import { ExecutionContext, StepResult } from './stepRunner';
import type { WorkflowExecution } from '../../../src/generated/prisma';
import { logError, logInfo, logDebug, logWorkflowExecution } from '../../utils/logger';
import { prisma } from '../../../lib/database/client';
import { stepRunner } from './stepRunner';

// Workflow execution configuration
export interface ExecutionConfig {
  maxConcurrency?: number;
  timeout?: number;
  enableRollback?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

// Workflow execution result
export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  results: Record<number, StepResult>;
  error?: string;
  metadata?: Record<string, any>;
}

// Workflow Executor
export class WorkflowExecutor {
  private config: ExecutionConfig;

  constructor(config: ExecutionConfig = {}) {
    this.config = {
      maxConcurrency: 1, // Sequential execution by default
      timeout: 300000, // 5 minutes
      enableRollback: true,
      retryOnFailure: true,
      maxRetries: 3,
      ...config
    };
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
    
    // Create execution record
    const execution = await this.createExecutionRecord(workflow.id, userId, parameters);
    
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
      await this.updateExecutionStatus(execution.id, 'RUNNING');

      // Execute steps
      const results = await this.executeSteps(steps, context);

      // Calculate execution summary
      const completedSteps = Object.values(results).filter(r => r.success).length;
      const failedSteps = Object.values(results).filter(r => !r.success).length;
      const totalDuration = Date.now() - startTime;

      // Determine final status
      const status = failedSteps === 0 ? 'COMPLETED' : 'FAILED';
      const success = status === 'COMPLETED';

      // Update execution record
      await this.updateExecutionRecord(execution.id, {
        status,
        completedAt: new Date(),
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
      await this.updateExecutionRecord(execution.id, {
        status: 'FAILED',
        completedAt: new Date(),
        error: errorMessage,
        result: {
          success: false,
          error: errorMessage,
          totalDuration
        }
      });

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
   * Execute workflow steps sequentially or with concurrency
   */
  private async executeSteps(steps: any[], context: ExecutionContext): Promise<Record<number, StepResult>> {
    const results: Record<number, StepResult> = {};

    if (this.config.maxConcurrency === 1) {
      // Sequential execution
      for (const step of steps) {
        const result = await this.executeStepWithRetry(step, context);
        results[step.stepOrder] = result;
        
        // Update context with step result
        context.stepResults[step.stepOrder] = result;
        
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
   * Execute a single step with retry logic
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
   * Create execution record in database
   */
  private async createExecutionRecord(
    workflowId: string,
    userId: string,
    parameters: Record<string, any>
  ): Promise<WorkflowExecution> {
    return await prisma.workflowExecution.create({
      data: {
        workflowId,
        userId,
        status: 'PENDING',
        metadata: { parameters }
      }
    });
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(executionId: string, status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'): Promise<void> {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status }
    });
  }

  /**
   * Update execution record with results
   */
  private async updateExecutionRecord(
    executionId: string,
    data: {
      status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
      completedAt: Date;
      error?: string;
      result?: any;
    }
  ): Promise<void> {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data
    });
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    logInfo('Cancelling workflow execution', { executionId });

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        result: { cancelled: true, cancelledAt: new Date() }
      }
    });
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    return await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        logs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });
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
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance with default configuration
export const workflowExecutor = new WorkflowExecutor(); 