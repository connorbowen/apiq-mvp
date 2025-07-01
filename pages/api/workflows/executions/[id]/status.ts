import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/database/client';
import { logError, logInfo } from '../../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../../src/lib/auth/session';
import { errorHandler } from '../../../../../src/middleware/errorHandler';
import { createWorkflowExecutor } from '../../../../../src/lib/workflow/executor';
import { ExecutionStateManager } from '../../../../../src/lib/workflow/executionStateManager';
import { QueueService } from '../../../../../src/lib/queue/queueService';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    const userId = user.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Execution ID is required' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    return await getExecutionStatus(req, res, userId, id);
  } catch (error) {
    logError('Get execution status API error', error as Error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getExecutionStatus(req: NextApiRequest, res: NextApiResponse, userId: string, executionId: string) {
  try {
    // Check if execution exists and belongs to user
    const execution = await prisma.workflowExecution.findFirst({
      where: { id: executionId, userId },
      include: {
        workflow: {
          select: { id: true, name: true, description: true }
        },
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 10 // Get last 10 logs
        }
      }
    });

    if (!execution) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }

    // Create dependencies
    const queueService = new QueueService(prisma);
    const stateManager = new ExecutionStateManager(prisma, queueService);
    const workflowExecutor = createWorkflowExecutor(stateManager, queueService);

    // Get execution progress
    const progress = await workflowExecutor.getExecutionProgress(executionId);

    // Get queue job status if available
    let queueJobStatus = null;
    if (execution.queueJobId && execution.queueName) {
      try {
        queueJobStatus = await queueService.getJobStatus(execution.queueName, execution.queueJobId);
      } catch (error) {
        logError('Failed to get queue job status', error as Error, { executionId });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        execution: {
          id: execution.id,
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
          metadata: execution.metadata,
          createdAt: execution.createdAt,
          updatedAt: execution.updatedAt
        },
        workflow: {
          id: execution.workflow.id,
          name: execution.workflow.name,
          description: execution.workflow.description
        },
        progress,
        queueJobStatus,
        recentLogs: execution.logs.map(log => ({
          id: log.id,
          level: log.level,
          message: log.message,
          data: log.data,
          timestamp: log.timestamp
        }))
      }
    });
  } catch (error) {
    logError('Failed to get execution status', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to get execution status' });
  }
}

export default errorHandler(handler); 