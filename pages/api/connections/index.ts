import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { encryptData } from '../../../src/utils/encryption';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { parseOpenApiSpec } from '../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../src/lib/api/endpoints';
import { logInfo, logError } from '../../../src/utils/logger';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);

    if (req.method === 'GET') {
      // Get all connections for the user
      console.log('🔍 [DEBUG] GET /api/connections - User ID:', user.id);
      
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

      console.log('🔍 [DEBUG] GET /api/connections - Found connections:', connections.length);
      console.log('🔍 [DEBUG] GET /api/connections - Connection details:', connections.map(c => ({
        id: c.id,
        name: c.name,
        ingestionStatus: c.ingestionStatus
      })));

      return res.status(200).json({
        success: true,
        data: { connections }
      });
    }

    if (req.method === 'POST') {
      const { name, description, authType, baseUrl, authConfig, documentationUrl } = req.body;

      console.log('🔍 [DEBUG] POST /api/connections - User ID:', user.id);
      console.log('🔍 [DEBUG] POST /api/connections - Connection data:', {
        name,
        authType,
        baseUrl,
        documentationUrl
      });

      if (!name || !authType) {
        return res.status(400).json({ error: 'Missing required fields' });
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

      console.log('🔍 [DEBUG] POST /api/connections - Created connection:', {
        id: connection.id,
        name: connection.name,
        userId: connection.userId
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