import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { requireAuth } from '../../../src/lib/auth/session';
import { logInfo, logError } from '../../../src/utils/logger';

interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface OperationHistoryResponse {
  success: boolean;
  data?: {
    executions: Array<{
      id: string;
      operationId: string;
      status: string;
      statusCode?: number;
      executionTime?: number;
      error?: string;
      startedAt: string;
      completedAt?: string;
      endpoint?: {
        path: string;
        method: string;
        summary?: string;
      };
      connection?: {
        name: string;
        baseUrl: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

/**
 * Get operation execution history
 * GET /api/operations/history?page=1&limit=20&endpointId=xxx&status=xxx
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse<OperationHistoryResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req, res);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
    const endpointId = req.query.endpointId as string;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      userId: user.id
    };

    if (endpointId) {
      whereClause.operationId = endpointId;
    }

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    // Get total count
    const total = await prisma.operationExecution.count({
      where: whereClause
    });

    // Get executions with related data
    const executions = await prisma.operationExecution.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      include: {
        operation: {
          include: {
            endpoint: {
              include: {
                apiConnection: {
                  select: {
                    name: true,
                    baseUrl: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Transform the data
    const transformedExecutions = executions.map(execution => ({
      id: execution.id,
      operationId: execution.operationId,
      status: execution.status,
      statusCode: execution.statusCode,
      executionTime: execution.executionTime,
      error: execution.error,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt?.toISOString(),
      endpoint: execution.operation?.endpoint ? {
        path: execution.operation.endpoint.path,
        method: execution.operation.endpoint.method,
        summary: execution.operation.endpoint.summary
      } : undefined,
      connection: execution.operation?.endpoint?.apiConnection ? {
        name: execution.operation.endpoint.apiConnection.name,
        baseUrl: execution.operation.endpoint.apiConnection.baseUrl
      } : undefined
    }));

    const totalPages = Math.ceil(total / limit);

    logInfo('Retrieved operation execution history', {
      userId: user.id,
      count: executions.length,
      page,
      limit,
      total
    });

    return res.status(200).json({
      success: true,
      data: {
        executions: transformedExecutions,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    logError('Failed to retrieve operation history', error, { userId: user?.id });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
