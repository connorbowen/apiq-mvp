import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { logError, logInfo } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { errorHandler } from '../../../../src/middleware/errorHandler';
import { createWorkflowExecutor } from '../../../../src/lib/workflow/executor';
import { ExecutionStateManager } from '../../../../src/lib/workflow/executionStateManager';
import { QueueService } from '../../../../src/lib/queue/queueService';

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
    
    console.log('🔍 [executeWorkflow] Starting execution for workflow:', workflowId);
    console.log('🔍 [executeWorkflow] User ID:', userId);
    console.log('🔍 [executeWorkflow] Parameters:', parameters);

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

    console.log('🔍 [executeWorkflow] Found workflow:', workflow ? {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      stepCount: workflow.steps.length
    } : 'NOT FOUND');

    if (!workflow) {
      console.log('❌ [executeWorkflow] Workflow not found');
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    if (workflow.status !== 'ACTIVE') {
      console.log('❌ [executeWorkflow] Workflow is not active, status:', workflow.status);
      return res.status(400).json({ success: false, error: 'Workflow is not active' });
    }

    if (workflow.steps.length === 0) {
      console.log('❌ [executeWorkflow] Workflow has no steps');
      return res.status(400).json({ success: false, error: 'Workflow has no steps' });
    }

    console.log('🔍 [executeWorkflow] Workflow steps:', workflow.steps.map(step => ({
      id: step.id,
      name: step.name,
      method: step.method,
      endpoint: step.endpoint,
      apiConnectionId: step.apiConnectionId,
      parameters: step.parameters
    })));

    logInfo('Starting workflow execution', { 
      userId, 
      workflowId, 
      stepCount: workflow.steps.length 
    });

    // Create dependencies
    console.log('🔍 [executeWorkflow] Creating dependencies...');
    const queueService = new QueueService();
    const stateManager = new ExecutionStateManager(queueService);
    
    // Create workflow executor with dependencies
    console.log('🔍 [executeWorkflow] Creating workflow executor...');
    const workflowExecutor = createWorkflowExecutor(stateManager, queueService);

    // Execute workflow using the executor
    console.log('🔍 [executeWorkflow] Executing workflow...');
    const result = await workflowExecutor.executeWorkflow(
      workflow as any,
      workflow.steps as any,
      userId,
      parameters
    );

    console.log('🔍 [executeWorkflow] Execution result:', result);

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
    console.error('❌ [executeWorkflow] Error during execution:', error);
    console.error('❌ [executeWorkflow] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [executeWorkflow] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });
    logError('Failed to execute workflow', error as Error);
    return res.status(500).json({ 
      success: false, 
      error: `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
}

export default errorHandler(handler); 