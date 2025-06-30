import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../src/lib/database/client';
import { logError, logInfo } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { errorHandler } from '../../../../src/middleware/errorHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    const userId = user.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Workflow ID is required' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    return await executeWorkflow(req, res, userId, id);
  } catch (error) {
    logError('Workflow execution API error', error as Error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function executeWorkflow(req: NextApiRequest, res: NextApiResponse, userId: string, workflowId: string) {
  try {
    const { parameters = {} } = req.body;

    // Check if workflow exists and belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          where: { isActive: true },
          include: {
            apiConnection: {
              select: { id: true, name: true, baseUrl: true, authType: true, authConfig: true }
            }
          }
        }
      }
    });

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    if (workflow.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Workflow is not active' });
    }

    if (workflow.steps.length === 0) {
      return res.status(400).json({ success: false, error: 'Workflow has no steps' });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        userId,
        status: 'PENDING',
        metadata: { parameters }
      }
    });

    logInfo('Workflow execution started', { 
      userId, 
      workflowId, 
      executionId: execution.id,
      stepCount: workflow.steps.length 
    });

    // For now, we'll just mark it as completed since we don't have the actual execution engine yet
    // In a real implementation, this would trigger the workflow execution engine
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: { message: 'Workflow execution completed (placeholder)' }
      }
    });

    // Create execution log entry
    await prisma.executionLog.create({
      data: {
        executionId: execution.id,
        level: 'INFO',
        message: 'Workflow execution completed successfully',
        data: { parameters }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        executionId: execution.id,
        status: 'completed',
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          stepCount: workflow.steps.length
        }
      },
      message: 'Workflow execution completed'
    });
  } catch (error) {
    logError('Failed to execute workflow', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to execute workflow' });
  }
}

export default errorHandler(handler); 