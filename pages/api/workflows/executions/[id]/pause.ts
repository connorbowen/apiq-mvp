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

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    return await pauseExecution(req, res, userId, id);
  } catch (error) {
    logError('Pause execution API error', error as Error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function pauseExecution(req: NextApiRequest, res: NextApiResponse, userId: string, executionId: string) {
  try {
    // Check if execution exists and belongs to user
    const execution = await prisma.workflowExecution.findFirst({
      where: { id: executionId, userId },
      include: {
        workflow: {
          select: { id: true, name: true }
        }
      }
    });

    if (!execution) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }

    // Check if execution can be paused
    if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot pause execution in status: ${execution.status}` 
      });
    }

    logInfo('Pausing workflow execution', { 
      userId, 
      executionId,
      workflowId: execution.workflowId,
      workflowName: execution.workflow.name
    });

    // Create dependencies
    const queueService = new QueueService();
    const stateManager = new ExecutionStateManager(queueService);
    const workflowExecutor = createWorkflowExecutor(stateManager, queueService);

    // Pause execution
    await workflowExecutor.pauseExecution(executionId, userId);

    return res.status(200).json({
      success: true,
      data: {
        executionId,
        status: 'PAUSED',
        pausedAt: new Date(),
        pausedBy: userId,
        workflow: {
          id: execution.workflow.id,
          name: execution.workflow.name
        }
      },
      message: 'Workflow execution paused successfully'
    });
  } catch (error) {
    logError('Failed to pause execution', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to pause execution' });
  }
}

export default errorHandler(handler); 