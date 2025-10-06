import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { encryptData } from '../../../../src/utils/encryption';
import { parseOpenApiSpecData } from '../../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../../src/lib/api/endpoints';
import { usageTrackingService } from '../../../../src/lib/services/usageTrackingService';
import { logInfo, logError } from '../../../../src/utils/logger';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  let user: any = null;
  
  try {
    user = await requireAuth(req, res);
    const { id } = req.query;

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    const { 
      connectionName, 
      authType, 
      authConfig,
      description 
    } = req.body;

    if (!connectionName || !authType) {
      return res.status(400).json({
        success: false,
        error: 'Connection name and auth type are required'
      });
    }

    // Get catalog entry
    const catalogEntry = await prisma.apiCatalog.findUnique({
      where: { id: id as string },
      include: {
        endpoints: true
      }
    });

    if (!catalogEntry) {
      return res.status(404).json({
        success: false,
        error: 'Catalog entry not found'
      });
    }

    if (catalogEntry.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `This API is currently ${catalogEntry.status.toLowerCase()}`
      });
    }

    // Check if user already has a connection to this catalog API
    const existingConnection = await prisma.apiConnection.findFirst({
      where: {
        userId: user.id,
        catalogId: id as string
      }
    });

    if (existingConnection) {
      return res.status(409).json({
        success: false,
        error: 'You already have a connection to this API',
        data: { existingConnectionId: existingConnection.id }
      });
    }

    // Check usage limits before creating connection
    const canCreate = await usageTrackingService.canPerformAction(user.id, 'api_connection');
    if (!canCreate.allowed) {
      return res.status(403).json({
        success: false,
        error: 'API connection limit reached',
        details: canCreate.reason,
        code: 'USAGE_LIMIT_REACHED'
      });
    }

    // Encrypt auth config if provided
    const encryptedAuthConfig = authConfig ? await encryptData(authConfig) : {};

    // Create user connection linked to catalog
    const connection = await prisma.apiConnection.create({
      data: {
        name: connectionName,
        description: description || catalogEntry.description || '',
        baseUrl: catalogEntry.baseUrl,
        authType,
        authConfig: encryptedAuthConfig,
        documentationUrl: catalogEntry.documentationUrl,
        userId: user.id,
        catalogId: catalogEntry.id,
        // Copy spec data from catalog
        rawSpec: catalogEntry.rawSpec,
        specHash: catalogEntry.specHash,
        ingestionStatus: 'SUCCEEDED' // Already processed in catalog
      }
    });

    // Copy endpoints from catalog to user's connection
    if (catalogEntry.endpoints.length > 0) {
      const endpointData = catalogEntry.endpoints.map(endpoint => ({
        apiConnectionId: connection.id,
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary,
        description: endpoint.description,
        parameters: endpoint.parameters as any,
        requestBody: endpoint.requestBody as any,
        responses: endpoint.responses as any,
        successSchema: endpoint.successSchema as any,
        tags: endpoint.tags,
        isDeprecated: endpoint.isDeprecated
      }));

      await prisma.endpoint.createMany({
        data: endpointData
      });
    }

    // Update catalog popularity
    await prisma.apiCatalog.update({
      where: { id: catalogEntry.id },
      data: {
        popularity: {
          increment: 1
        }
      }
    });

    // Record usage
    await usageTrackingService.trackUsage(user.id, 'API_CONNECTION', connection.id);

    logInfo('User connected to catalog API', {
      userId: user.id,
      catalogId: catalogEntry.id,
      connectionId: connection.id,
      apiName: catalogEntry.name,
      endpointCount: catalogEntry.endpoints.length
    });

    return res.status(201).json({
      success: true,
      data: {
        connection: {
          id: connection.id,
          name: connection.name,
          description: connection.description,
          baseUrl: connection.baseUrl,
          authType: connection.authType,
          connectionStatus: connection.connectionStatus,
          ingestionStatus: connection.ingestionStatus,
          endpointCount: catalogEntry.endpoints.length,
          createdAt: connection.createdAt
        },
        catalog: {
          id: catalogEntry.id,
          name: catalogEntry.name,
          description: catalogEntry.description,
          category: catalogEntry.category,
          tags: catalogEntry.tags
        }
      }
    });

  } catch (error: any) {
    logError('Failed to connect to catalog API', error, {
      catalogId: req.query.id,
      userId: user?.id
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
