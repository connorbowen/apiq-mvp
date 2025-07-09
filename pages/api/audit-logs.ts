import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/database/client';
import { handleApiError } from '../../src/middleware/errorHandler';
import { logInfo, logError } from '../../src/utils/logger';
import { requireAdmin, AuthenticatedRequest } from '../../src/lib/auth/session';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require admin authentication for audit log access
    const user = await requireAdmin(req, res);

    if (req.method === 'GET') {
      // Get audit logs with filtering and pagination
      const { 
        page = '1', 
        limit = '50', 
        action, 
        userId, 
        connectionId, 
        provider,
        startDate,
        endDate,
        severity 
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;

      // Build where clause for filtering
      const whereClause: any = {};

      if (action) {
        whereClause.action = action as string;
      }

      if (userId) {
        whereClause.userId = userId as string;
      }

      if (connectionId) {
        whereClause.resourceId = connectionId as string;
      }

      if (provider) {
        whereClause.resource = {
          contains: provider as string,
          mode: 'insensitive'
        };
      }

      if (severity) {
        // Note: AuditLog doesn't have severity field, we'll filter by action instead
        whereClause.action = severity as string;
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt.lte = new Date(endDate as string);
        }
      }

      // Get audit logs with pagination
      const [auditLogs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        }),
        prisma.auditLog.count({ where: whereClause })
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      logInfo('Audit logs retrieved', {
        requestedBy: user.id,
        filters: { action, userId, connectionId, provider, severity, startDate, endDate },
        results: auditLogs.length,
        totalCount,
        page: pageNum,
        totalPages
      });

      return res.status(200).json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        },
        message: 'Audit logs retrieved successfully'
      });

    } else if (req.method === 'POST') {
      // Create audit log entry (for internal use)
      const { 
        action, 
        userId: targetUserId, 
        connectionId, 
        provider, 
        details, 
        severity = 'INFO',
        ipAddress,
        userAgent 
      } = req.body;

      // Validate required fields
      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Action is required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Create audit log entry
      const auditLog = await prisma.auditLog.create({
        data: {
          action,
          userId: targetUserId,
          resource: provider || 'oauth2',
          resourceId: connectionId,
          details: {
            ...details,
            provider,
            severity,
            ipAddress: ipAddress || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
            userAgent: userAgent || req.headers['user-agent']
          },
          ipAddress: ipAddress || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
          userAgent: userAgent || req.headers['user-agent']
        }
      });

      logInfo('Audit log created', {
        createdBy: user.id,
        auditLogId: auditLog.id,
        action,
        targetUserId,
        connectionId,
        provider,
        severity
      });

      return res.status(201).json({
        success: true,
        data: auditLog,
        message: 'Audit log created successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 