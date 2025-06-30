import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { logError, logInfo } from '../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { errorHandler } from '../../../src/middleware/errorHandler';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    const userId = user.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Workflow ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await getWorkflow(req, res, userId, id);
      case 'PUT':
        return await updateWorkflow(req, res, userId, id);
      case 'DELETE':
        return await deleteWorkflow(req, res, userId, id);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    logError('Workflow API error', error as Error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getWorkflow(req: NextApiRequest, res: NextApiResponse, userId: string, workflowId: string) {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            apiConnection: {
              select: { id: true, name: true, baseUrl: true }
            }
          }
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            steps: true,
            executions: true
          }
        }
      }
    });

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    logInfo('Workflow retrieved', { userId, workflowId });

    return res.status(200).json({
      success: true,
      data: {
        ...workflow,
        stepCount: workflow._count.steps,
        executionCount: workflow._count.executions,
        _count: undefined
      }
    });
  } catch (error) {
    logError('Failed to get workflow', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve workflow' });
  }
}

async function updateWorkflow(req: NextApiRequest, res: NextApiResponse, userId: string, workflowId: string) {
  try {
    const { name, description, status, isPublic } = req.body;

    // Check if workflow exists and belongs to user
    const existingWorkflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId }
    });

    if (!existingWorkflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    // Check if name is being changed and if it conflicts with another workflow
    if (name && name !== existingWorkflow.name) {
      const nameConflict = await prisma.workflow.findFirst({
        where: { userId, name, id: { not: workflowId } }
      });

      if (nameConflict) {
        return res.status(409).json({ success: false, error: 'Workflow with this name already exists' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: updateData,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        _count: {
          select: {
            steps: true,
            executions: true
          }
        }
      }
    });

    logInfo('Workflow updated', { userId, workflowId, updates: Object.keys(updateData) });

    return res.status(200).json({
      success: true,
      data: {
        ...workflow,
        stepCount: workflow._count.steps,
        executionCount: workflow._count.executions,
        _count: undefined
      },
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    logError('Failed to update workflow', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to update workflow' });
  }
}

async function deleteWorkflow(req: NextApiRequest, res: NextApiResponse, userId: string, workflowId: string) {
  try {
    // Check if workflow exists and belongs to user
    const existingWorkflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId }
    });

    if (!existingWorkflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    // Delete workflow (cascade will handle steps and executions)
    await prisma.workflow.delete({
      where: { id: workflowId }
    });

    logInfo('Workflow deleted', { userId, workflowId });

    return res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    logError('Failed to delete workflow', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to delete workflow' });
  }
}

export default errorHandler(handler); 