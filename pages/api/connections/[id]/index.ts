import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { handleApiError } from '../../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require authentication for all operations
    const user = await requireAuth(req, res);
    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid connection ID',
        code: 'VALIDATION_ERROR'
      });
    }

    if (req.method === 'GET') {
      // Get specific API connection with endpoints
      const connection = await prisma.apiConnection.findFirst({
        where: { 
          id,
          userId: user.id 
        },
        include: {
          endpoints: {
            where: { isActive: true },
            orderBy: { path: 'asc' }
          }
        }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'API connection not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Calculate computed fields
      const endpointCount = connection.endpoints.length;
      const lastUsed = connection.lastTested || connection.updatedAt;
      const status = connection.status;
      const ingestionStatus = connection.ingestionStatus;

      logInfo('Retrieved API connection', { 
        connectionId: id,
        userId: user.id,
        endpointCount
      });

      return res.status(200).json({
        success: true,
        data: {
          id: connection.id,
          name: connection.name,
          description: connection.description,
          baseUrl: connection.baseUrl,
          authType: connection.authType,
          authConfig: connection.authConfig, // Note: In production, this should be masked
          documentationUrl: connection.documentationUrl,
          status,
          ingestionStatus,
          endpoints: connection.endpoints.map(endpoint => ({
            id: endpoint.id,
            path: endpoint.path,
            method: endpoint.method,
            summary: endpoint.summary,
            description: endpoint.description
          })),
          // Computed fields
          endpointCount,
          lastUsed,
          // Metadata fields
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt
        }
      });

    } else if (req.method === 'PUT') {
      // Update API connection
      const updateData = req.body;

      // Check if connection exists and belongs to user
      const existingConnection = await prisma.apiConnection.findFirst({
        where: { 
          id,
          userId: user.id 
        }
      });

      if (!existingConnection) {
        return res.status(404).json({
          success: false,
          error: 'API connection not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Validate authType if provided
      if (updateData.authType) {
        const validAuthTypes = ['NONE', 'API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH2', 'CUSTOM'];
        if (!validAuthTypes.includes(updateData.authType)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid auth type. Must be one of: NONE, API_KEY, BEARER_TOKEN, BASIC_AUTH, OAUTH2, CUSTOM',
            code: 'VALIDATION_ERROR'
          });
        }
      }

      // Update the connection
      const updatedConnection = await prisma.apiConnection.update({
        where: { id },
        data: {
          name: updateData.name,
          description: updateData.description,
          baseUrl: updateData.baseUrl,
          authType: updateData.authType,
          authConfig: updateData.authConfig,
          documentationUrl: updateData.documentationUrl,
          status: updateData.status
        }
      });

      logInfo('Updated API connection', { 
        connectionId: id,
        userId: user.id,
        updatedFields: Object.keys(updateData)
      });

      return res.status(200).json({
        success: true,
        data: {
          id: updatedConnection.id,
          name: updatedConnection.name,
          description: updatedConnection.description,
          baseUrl: updatedConnection.baseUrl,
          authType: updatedConnection.authType,
          status: updatedConnection.status,
          updatedAt: updatedConnection.updatedAt
        },
        message: 'API connection updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Delete API connection
      const existingConnection = await prisma.apiConnection.findFirst({
        where: { 
          id,
          userId: user.id 
        }
      });

      if (!existingConnection) {
        return res.status(404).json({
          success: false,
          error: 'API connection not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Delete the connection (cascade will handle endpoints)
      await prisma.apiConnection.delete({
        where: { id }
      });

      logInfo('Deleted API connection', { 
        connectionId: id,
        userId: user.id,
        name: existingConnection.name
      });

      return res.status(200).json({
        success: true,
        message: 'API connection deleted successfully'
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