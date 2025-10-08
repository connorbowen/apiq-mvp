import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { logInfo, logError } from '../../../../src/utils/logger';
import { ApplicationError } from '../../../../src/lib/errors';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  let user: any = null;
  
  try {
    user = await requireAuth(req, res);

    if (req.method === 'GET') {
      const { 
        category, 
        search, 
        isActive = 'true',
        sortBy = 'sortOrder',
        sortOrder = 'asc'
      } = req.query;

      // Build where clause
      const where: any = {};
      
      if (isActive === 'true') {
        where.isActive = true;
      }

      if (category) {
        where.category = category as string;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Build orderBy clause
      const orderBy: any = {};
      if (sortBy === 'sortOrder') {
        orderBy.sortOrder = sortOrder as string;
      } else if (sortBy === 'name') {
        orderBy.name = sortOrder as string;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder as string;
      }

      // Get providers with their APIs
      const providers = await prisma.apiProvider.findMany({
        where,
        orderBy,
        include: {
          apis: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              name: true,
              description: true,
              baseUrl: true,
              logoUrl: true,
              category: true,
              tags: true,
              authTypes: true,
              status: true,
              isVerified: true,
              popularity: true,
              endpointCount: true,
              _count: {
                select: {
                  connections: true
                }
              }
            }
          }
        }
      });

      logInfo('Retrieved API providers', {
        userId: user.id,
        providerCount: providers.length,
        filters: { category, search, isActive }
      });

      return res.status(200).json({
        success: true,
        data: {
          providers
        }
      });
    }

    if (req.method === 'POST') {
      // Only admin users can create providers
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to create providers'
        });
      }

      const {
        name,
        description,
        logoUrl,
        websiteUrl,
        category,
        isActive = true,
        sortOrder = 0
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Provider name is required'
        });
      }

      // Check if provider already exists
      const existing = await prisma.apiProvider.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Provider with this name already exists'
        });
      }

      // Create provider
      const provider = await prisma.apiProvider.create({
        data: {
          name,
          description,
          logoUrl,
          websiteUrl,
          category,
          isActive,
          sortOrder
        }
      });

      logInfo('Created API provider', {
        userId: user.id,
        providerId: provider.id,
        name: provider.name
      });

      return res.status(201).json({
        success: true,
        data: provider
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
