import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../src/lib/auth/session';
import { prisma } from '../../lib/database/client';
import { logError, logInfo } from '../../src/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Require authentication
    const user = await requireAuth(req, res);
    const userId = user.id;

    if (req.method !== 'GET') {
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Get query parameters for filtering
    const { 
      limit = '50', 
      offset = '0', 
      action, 
      resource,
      startDate,
      endDate 
    } = req.query;

    // Build where clause for filtering
    const whereClause: any = {
      userId: userId
    };

    if (action && typeof action === 'string') {
      whereClause.action = action;
    }

    if (resource && typeof resource === 'string') {
      whereClause.resource = {
        contains: resource,
        mode: 'insensitive'
      };
    }

    if (startDate && typeof startDate === 'string') {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        gte: new Date(startDate)
      };
    }

    if (endDate && typeof endDate === 'string') {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: new Date(endDate)
      };
    }

    // Fetch audit logs with pagination
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({
      where: whereClause
    });

    // Transform logs to match expected format
    const transformedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      userId: log.userId,
      userEmail: log.user?.email || 'Unknown',
      timestamp: log.createdAt.toISOString(),
      details: log.details,
      ipAddress: log.ipAddress || 'Unknown',
      userAgent: log.userAgent
    }));

    logInfo('Audit logs fetched successfully', { userId, count: transformedLogs.length });

    return res.status(200).json({
      success: true,
      data: {
        logs: transformedLogs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: totalCount > parseInt(offset as string) + transformedLogs.length
        }
      }
    });

  } catch (error) {
    logError('Failed to fetch audit logs', error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      code: 'INTERNAL_ERROR'
    });
  }
} 