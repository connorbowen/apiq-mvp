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

interface OperationExecutionResponse {
  success: boolean;
  data?: {
    id: string;
    operationId: string;
    status: string;
    requestData: any;
    responseData?: any;
    responseHeaders?: Record<string, string>;
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
  };
  error?: string;
}

/**
 * Get a specific operation execution result
 * GET /api/operations/[id]
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse<OperationExecutionResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req, res);
    const executionId = req.query.id as string;

    if (!executionId) {
      return res.status(400).json({ success: false, error: 'Execution ID is required' });
    }

    // Get the execution with related data
    const execution = await prisma.operationExecution.findFirst({
      where: {
        id: executionId,
        userId: user.id
      },
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

    if (!execution) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }

    // Transform the data
    const transformedExecution = {
      id: execution.id,
      operationId: execution.operationId,
      status: execution.status,
      requestData: execution.requestData,
      responseData: execution.responseData,
      responseHeaders: execution.responseHeaders,
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
    };

    logInfo('Retrieved operation execution details', {
      userId: user.id,
      executionId,
      status: execution.status
    });

    return res.status(200).json({
      success: true,
      data: transformedExecution
    });

  } catch (error) {
    logError('Failed to retrieve operation execution', error, { 
      userId: user?.id,
      executionId: req.query.id 
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
