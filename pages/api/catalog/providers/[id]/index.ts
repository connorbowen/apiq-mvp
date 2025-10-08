import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../../../src/lib/auth/session';
import { logInfo, logError } from '../../../../../src/utils/logger';
import { ApplicationError } from '../../../../../src/lib/errors';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  let user: any = null;
  
  try {
    user = await requireAuth(req, res);
    const { id } = req.query;

    if (req.method === 'GET') {
      // Get provider with its APIs
      const provider = await prisma.apiProvider.findUnique({
        where: { id: id as string },
        include: {
          apis: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              name: true,
              description: true,
              baseUrl: true,
              documentationUrl: true,
              logoUrl: true,
              category: true,
              tags: true,
              authTypes: true,
              status: true,
              isVerified: true,
              popularity: true,
              endpointCount: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  connections: true
                }
              }
            },
            orderBy: {
              popularity: 'desc'
            }
          }
        }
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
      }

      logInfo('Retrieved API provider details', {
        userId: user.id,
        providerId: provider.id,
        name: provider.name,
        apiCount: provider.apis.length
      });

      return res.status(200).json({
        success: true,
        data: {
          provider: provider
        }
      });
    }

    if (req.method === 'PUT') {
      // Only admin users can update providers
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to update providers'
        });
      }

      const {
        name,
        description,
        logoUrl,
        websiteUrl,
        category,
        isActive,
        sortOrder
      } = req.body;

      // Check if provider exists
      const existing = await prisma.apiProvider.findUnique({
        where: { id: id as string }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
      }

      // Update provider
      const updatedProvider = await prisma.apiProvider.update({
        where: { id: id as string },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(websiteUrl !== undefined && { websiteUrl }),
          ...(category !== undefined && { category }),
          ...(isActive !== undefined && { isActive }),
          ...(sortOrder !== undefined && { sortOrder }),
          updatedAt: new Date()
        }
      });

      logInfo('Updated API provider', {
        userId: user.id,
        providerId: updatedProvider.id,
        name: updatedProvider.name
      });

      return res.status(200).json({
        success: true,
        data: updatedProvider
      });
    }

    if (req.method === 'DELETE') {
      // Only admin users can delete providers
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to delete providers'
        });
      }

      // Check if provider exists
      const existing = await prisma.apiProvider.findUnique({
        where: { id: id as string },
        include: {
          apis: true
        }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
      }

      // Check if provider has APIs
      if (existing.apis.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete provider with associated APIs. Remove APIs first.'
        });
      }

      // Delete provider
      await prisma.apiProvider.delete({
        where: { id: id as string }
      });

      logInfo('Deleted API provider', {
        userId: user.id,
        providerId: id,
        name: existing.name
      });

      return res.status(200).json({
        success: true,
        message: 'Provider deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    console.error('Provider API error:', error);
    
    if (error.name === 'ApplicationError') {
      logError('API provider operation failed', error, {
        method: req.method,
        userId: user?.id || 'unknown'
      });

      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }

    logError('API provider operation failed', error, {
      method: req.method,
      userId: user?.id || 'unknown'
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
