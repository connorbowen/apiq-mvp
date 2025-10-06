import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { logInfo, logError } from '../../../../src/utils/logger';
import { ApplicationError } from '../../../../src/lib/errors';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  let user: any = null;
  
  try {
    user = await requireAuth(req, res);
    const { id } = req.query;

    if (req.method === 'GET') {
      // Get catalog entry with full details - only select public fields
      const catalogEntry = await prisma.apiCatalog.findUnique({
        where: { id: id as string },
        select: {
          id: true,
          name: true,
          description: true,
          baseUrl: true,
          documentationUrl: true,
          logoUrl: true,
          category: true,
          tags: true,
          authTypes: true, // Supported auth types, not actual credentials
          status: true,
          isVerified: true,
          popularity: true,
          lastUpdated: true,
          createdAt: true,
          updatedAt: true,
          specVersion: true,
          endpointCount: true,
          endpoints: {
            select: {
              id: true,
              path: true,
              method: true,
              summary: true,
              description: true,
              parameters: true,
              requestBody: true,
              responses: true,
              successSchema: true,
              tags: true,
              isDeprecated: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: [
              { path: 'asc' },
              { method: 'asc' }
            ]
          },
          _count: {
            select: {
              connections: true
            }
          }
          // Explicitly exclude: rawSpec, specHash, and any other sensitive fields
        }
      });

      if (!catalogEntry) {
        return res.status(404).json({
          success: false,
          error: 'Catalog entry not found'
        });
      }

      // Check if user has already connected this API
      const userConnection = await prisma.apiConnection.findFirst({
        where: {
          userId: user.id,
          catalogId: id as string
        },
        select: {
          id: true,
          name: true,
          connectionStatus: true,
          createdAt: true
        }
      });

      logInfo('Retrieved catalog entry details', {
        userId: user.id,
        catalogId: id,
        endpointCount: catalogEntry.endpoints.length
      });

      return res.status(200).json({
        success: true,
        data: {
          ...catalogEntry,
          userConnection
        }
      });
    }

    if (req.method === 'PUT') {
      // Only admin users can update catalog entries
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to update catalog entries'
        });
      }

      const {
        name,
        description,
        baseUrl,
        documentationUrl,
        logoUrl,
        category,
        tags,
        authTypes,
        status,
        isVerified,
        rawSpec,
        specVersion
      } = req.body;

      // Check if catalog entry exists
      const existing = await prisma.apiCatalog.findUnique({
        where: { id: id as string }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Catalog entry not found'
        });
      }

      // Generate spec hash if rawSpec provided
      let specHash = existing.specHash;
      if (rawSpec) {
        const crypto = require('crypto');
        specHash = crypto.createHash('sha256').update(rawSpec).digest('hex');
      }

      // Update catalog entry
      const updatedEntry = await prisma.apiCatalog.update({
        where: { id: id as string },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(baseUrl && { baseUrl }),
          ...(documentationUrl !== undefined && { documentationUrl }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(category !== undefined && { category }),
          ...(tags && { tags }),
          ...(authTypes && { authTypes }),
          ...(status && { status }),
          ...(isVerified !== undefined && { isVerified }),
          ...(rawSpec && { rawSpec }),
          ...(specVersion && { specVersion }),
          ...(specHash && { specHash }),
          lastUpdated: new Date()
        }
      });

      logInfo('Updated API catalog entry', {
        userId: user.id,
        catalogId: id,
        name: updatedEntry.name
      });

      return res.status(200).json({
        success: true,
        data: updatedEntry
      });
    }

    if (req.method === 'DELETE') {
      // Only admin users can delete catalog entries
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to delete catalog entries'
        });
      }

      // Check if catalog entry exists
      const existing = await prisma.apiCatalog.findUnique({
        where: { id: id as string }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Catalog entry not found'
        });
      }

      // Check if there are any user connections to this catalog entry
      const connectionCount = await prisma.apiConnection.count({
        where: { catalogId: id as string }
      });

      if (connectionCount > 0) {
        return res.status(409).json({
          success: false,
          error: 'Cannot delete catalog entry with existing user connections'
        });
      }

      // Delete catalog entry (endpoints will be cascade deleted)
      await prisma.apiCatalog.delete({
        where: { id: id as string }
      });

      logInfo('Deleted API catalog entry', {
        userId: user.id,
        catalogId: id,
        name: existing.name
      });

      return res.status(200).json({
        success: true,
        message: 'Catalog entry deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    // Handle ApplicationError instances (like authentication errors) properly
    if (error.name === 'ApplicationError') {
      logError('API catalog entry operation failed', error, {
        method: req.method,
        catalogId: req.query.id,
        userId: user?.id
      });

      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }

    // Handle other errors as internal server errors
    logError('API catalog entry operation failed', error, {
      method: req.method,
      catalogId: req.query.id,
      userId: user?.id
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
