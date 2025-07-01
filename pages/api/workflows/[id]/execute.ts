import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { logError, logInfo } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { errorHandler } from '../../../../src/middleware/errorHandler';
import { workflowExecutor } from '../../../../src/lib/workflow/executor';

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

    logInfo('Starting workflow execution', { 
      userId, 
      workflowId, 
      stepCount: workflow.steps.length 
    });

    // Execute workflow using the executor
    const result = await workflowExecutor.executeWorkflow(
      workflow as any,
      workflow.steps as any,
      userId,
      parameters
    );

    return res.status(200).json({
      success: result.success,
      data: {
        executionId: result.executionId,
        status: result.status.toLowerCase(),
        startedAt: new Date(),
        completedAt: new Date(),
        workflow: {
          id: workflow.id,
          name: workflow.name,
          stepCount: workflow.steps.length
        },
        execution: {
          totalSteps: result.totalSteps,
          completedSteps: result.completedSteps,
          failedSteps: result.failedSteps,
          totalDuration: result.totalDuration
        }
      },
      message: result.success ? 'Workflow execution completed successfully' : `Workflow execution failed: ${result.error}`
    });
  } catch (error) {
    logError('Failed to execute workflow', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to execute workflow' });
  }
}

export default errorHandler(handler); 