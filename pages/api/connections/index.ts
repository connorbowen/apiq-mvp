import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { encryptData } from '../../../src/utils/encryption';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { parseOpenApiSpec } from '../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../src/lib/api/endpoints';
import { logInfo, logError } from '../../../src/utils/logger';
import { usageTrackingService } from '../../../src/lib/services/usageTrackingService';
import { UsageType } from '../../../src/generated/prisma';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);

    if (req.method === 'GET') {
      // Get all connections for the user
      
      const connections = await prisma.apiConnection.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          description: true,
          authType: true,
          baseUrl: true,
          status: true,
          connectionStatus: true,
          ingestionStatus: true,
          lastTested: true,
          createdAt: true,
          updatedAt: true,
          authConfig: true,
          documentationUrl: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: { connections }
      });
    }

    if (req.method === 'POST') {
      const { name, description, authType, baseUrl, authConfig, documentationUrl } = req.body;

      if (!name || !authType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check usage limits before creating connection
      const canCreate = await usageTrackingService.canPerformAction(user.id, 'api_connection');
      if (!canCreate.allowed) {
        return res.status(403).json({
          success: false,
          error: 'API connection limit reached',
          details: canCreate.reason,
          code: 'USAGE_LIMIT_REACHED',
          timestamp: new Date()
        });
      }

      // Encrypt auth config if provided
      const encryptedAuthConfig = authConfig ? await encryptData(authConfig) : {};

      // Create connection
      const connection = await prisma.apiConnection.create({
        data: {
          name,
          description: description || '',
          authType,
          baseUrl: baseUrl || '',
          authConfig: encryptedAuthConfig,
          documentationUrl: documentationUrl || null,
          userId: user.id,
        }
      });

      let ingestionStatus = 'PENDING';
      let endpointCount = 0;
      let warning = null;

      // Handle OpenAPI specification ingestion if documentationUrl is provided
      if (documentationUrl) {
        try {
          logInfo('Processing OpenAPI specification for new connection', {
            connectionId: connection.id,
            userId: user.id,
            documentationUrl
          });

          const parsedSpec = await parseOpenApiSpec(documentationUrl);
          
          if (parsedSpec && parsedSpec.spec && parsedSpec.spec.paths) {
            // Update connection with parsed spec data
            await prisma.apiConnection.update({
              where: { id: connection.id },
              data: {
                rawSpec: parsedSpec.rawSpec,
                specHash: parsedSpec.specHash,
                ingestionStatus: 'SUCCEEDED',
                lastTested: new Date()
              }
            });

            // Extract and store endpoints
            const endpoints = await extractAndStoreEndpoints(connection.id, parsedSpec);
            endpointCount = Array.isArray(endpoints) ? endpoints.length : 0;
            ingestionStatus = 'SUCCEEDED';

            logInfo('Successfully processed OpenAPI specification', {
              connectionId: connection.id,
              userId: user.id,
              endpointCount,
              documentationUrl
            });
          } else {
            throw new Error('Invalid OpenAPI specification format');
          }
        } catch (error: any) {
          logError('Failed to process OpenAPI specification', error, {
            connectionId: connection.id,
            userId: user.id,
            documentationUrl
          });

          // Update connection with failed status
          await prisma.apiConnection.update({
            where: { id: connection.id },
            data: {
              ingestionStatus: 'FAILED'
            }
          });

          ingestionStatus = 'FAILED';
          warning = `OpenAPI specification processing failed: ${error.message}`;
        }
      }

      // Track usage after successful connection creation
      await usageTrackingService.trackUsage(
        user.id,
        UsageType.API_CONNECTION,
        connection.id,
        'api_connection',
        {
          name: connection.name,
          authType: connection.authType,
          baseUrl: connection.baseUrl
        }
      );

      return res.status(201).json({
        success: true,
        data: {
          id: connection.id,
          name: connection.name,
          description: connection.description,
          authType: connection.authType,
          baseUrl: connection.baseUrl,
          status: connection.status,
          ingestionStatus,
          endpointCount,
          createdAt: connection.createdAt
        },
        warning
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error creating connection:', error);
    return res.status(500).json({ 
      error: 'Failed to create connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 