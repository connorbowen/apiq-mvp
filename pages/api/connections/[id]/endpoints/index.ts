import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/database/client';
import { handleApiError } from '../../../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../../../src/utils/logger';
import { getEndpointsForConnection, deleteEndpointsForConnection } from '../../../../../src/lib/api/endpoints';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../../../../src/lib/auth/session';
import { Role } from '../../../../../src/generated/prisma';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { id: connectionId } = req.query;

    if (!connectionId || typeof connectionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid connection ID'
      });
    }

    // Require authentication for all operations
    const user = await requireAuth(req, res);
    
    // Verify the API connection exists and belongs to the user
    const connection = await prisma.apiConnection.findFirst({
      where: {
        id: connectionId,
        userId: user.id
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'API connection not found'
      });
    }

    if (req.method === 'GET') {
      // Extract query parameters for filtering
      const { method, path, summary } = req.query;
      
      const filters: any = {};
      if (method && typeof method === 'string') {
        filters.method = method;
      }
      if (path && typeof path === 'string') {
        filters.path = path;
      }
      if (summary && typeof summary === 'string') {
        filters.summary = summary;
      }

      // Get endpoints for the connection with optional filtering
      const endpoints = await getEndpointsForConnection(connectionId, filters);

      logInfo('Retrieved endpoints for connection', {
        connectionId,
        endpointCount: endpoints.length,
        filters: Object.keys(filters).length > 0 ? filters : undefined
      });

      return res.status(200).json({
        success: true,
        data: endpoints
      });

    } else if (req.method === 'DELETE') {
      // RBAC: Check if user has permission to delete endpoints (ADMIN or SUPER_ADMIN)
      await requireRole([Role.ADMIN, Role.SUPER_ADMIN])(req, res);

      // Delete all endpoints for the connection
      await deleteEndpointsForConnection(connectionId);

      logInfo('Deleted endpoints for connection', { 
        connectionId,
        userId: user.id,
        userRole: user.role
      });

      return res.status(200).json({
        success: true,
        message: 'Endpoints deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 