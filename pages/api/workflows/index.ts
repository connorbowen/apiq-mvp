import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { logError, logInfo } from '../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { errorHandler } from '../../../src/middleware/errorHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    const userId = user.id;

    switch (req.method) {
      case 'GET':
        return await getWorkflows(req, res, userId);
      case 'POST':
        return await createWorkflow(req, res, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    logError('Workflows API error', error as Error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default errorHandler(handler);

async function getWorkflows(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    
    const where: any = { userId };
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          },
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: {
              steps: true,
              executions: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.workflow.count({ where })
    ]);

    const workflowsWithStats = workflows.map((workflow: any) => ({
      ...workflow,
      stepCount: workflow._count.steps,
      executionCount: workflow._count.executions,
      lastExecuted: workflow.executions[0]?.startedAt || null,
      _count: undefined,
      executions: undefined
    }));

    logInfo('Workflows retrieved', { userId, count: workflows.length });

    return res.status(200).json({
      success: true,
      data: {
        workflows: workflowsWithStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logError('Failed to get workflows', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve workflows' });
  }
}

async function createWorkflow(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { name, description, isPublic = false, steps = [] } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Workflow name is required' });
    }

    // Check if workflow with same name already exists for this user
    const existingWorkflow = await prisma.workflow.findFirst({
      where: { userId, name }
    });

    if (existingWorkflow) {
      return res.status(409).json({ success: false, error: 'Workflow with this name already exists' });
    }

    // Create workflow with steps in a transaction
    const workflow = await prisma.$transaction(async (tx) => {
      // Create the workflow
      const createdWorkflow = await tx.workflow.create({
        data: {
          userId,
          name,
          description,
          isPublic,
          status: 'ACTIVE'
        }
      });

      // Create workflow steps if provided
      if (steps && steps.length > 0) {
        const workflowSteps = steps.map((step: any, index: number) => ({
          workflowId: createdWorkflow.id,
          stepOrder: index + 1,
          name: step.name || `Step ${index + 1}`,
          description: step.description || '',
          method: step.method,
          endpoint: step.endpoint,
          apiConnectionId: step.apiConnectionId,
          parameters: step.parameters || {},
          isActive: true
        }));

        await tx.workflowStep.createMany({
          data: workflowSteps
        });
      }

          // Return the workflow with steps
    const workflowWithSteps = await tx.workflow.findUnique({
      where: { id: createdWorkflow.id },
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

    if (!workflowWithSteps) {
      throw new Error('Failed to retrieve created workflow');
    }

    return workflowWithSteps;
  });

  logInfo('Workflow created', { userId, workflowId: workflow.id, name, stepCount: steps.length });

    return res.status(201).json({
      success: true,
      data: {
        ...workflow,
        stepCount: workflow._count.steps,
        executionCount: workflow._count.executions,
        _count: undefined
      },
      message: 'Workflow created successfully'
    });
  } catch (error) {
    logError('Failed to create workflow', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to create workflow' });
  }
} 