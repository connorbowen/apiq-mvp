import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { CreateApiConnectionRequest } from '../../../src/types';
import { parseOpenApiSpec, ParseError } from '../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../src/lib/api/endpoints';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require authentication for all operations
    const user = await requireAuth(req, res);

    if (req.method === 'GET') {
      // Get all API connections for the authenticated user
      const connections = await prisma.apiConnection.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      logInfo('Retrieved API connections', { 
        userId: user.id, 
        count: connections.length 
      });

      return res.status(200).json({
        success: true,
        data: connections
      });

    } else if (req.method === 'POST') {
      // Create a new API connection
      const connectionData: CreateApiConnectionRequest = req.body;

      // Validate required fields
      if (!connectionData.name || !connectionData.baseUrl || !connectionData.authType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, baseUrl, authType'
        });
      }

      // Validate authType is a valid enum value
      const validAuthTypes = ['NONE', 'API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH2', 'CUSTOM'];
      if (!validAuthTypes.includes(connectionData.authType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid auth type. Must be one of: NONE, API_KEY, BEARER_TOKEN, BASIC_AUTH, OAUTH2, CUSTOM'
        });
      }

      // Check if connection with same name already exists for this user
      const existingConnection = await prisma.apiConnection.findFirst({
        where: {
          userId: user.id,
          name: connectionData.name
        }
      });

      if (existingConnection) {
        return res.status(409).json({
          success: false,
          error: 'API connection with this name already exists'
        });
      }

      // Create the API connection with PENDING ingestion status
      const newConnection = await prisma.apiConnection.create({
        data: {
          userId: user.id,
          name: connectionData.name,
          description: connectionData.description,
          baseUrl: connectionData.baseUrl,
          authType: connectionData.authType,
          authConfig: connectionData.authConfig || {},
          documentationUrl: connectionData.documentationUrl,
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      logInfo('Created API connection', { 
        connectionId: newConnection.id,
        userId: user.id,
        name: newConnection.name
      });

      // If documentation URL is provided, parse OpenAPI spec and extract endpoints
      if (connectionData.documentationUrl) {
        try {
          // Parse the OpenAPI specification
          const parsedSpec = await parseOpenApiSpec(connectionData.documentationUrl);
          
          // Update connection with parsed spec data
          await prisma.apiConnection.update({
            where: { id: newConnection.id },
            data: {
              rawSpec: parsedSpec.rawSpec,
              specHash: parsedSpec.specHash,
              ingestionStatus: 'SUCCEEDED'
            }
          });

          // Extract and store endpoints
          await extractAndStoreEndpoints(newConnection.id, parsedSpec);

          logInfo('Successfully processed OpenAPI spec and extracted endpoints', {
            connectionId: newConnection.id,
            endpointCount: Object.keys(parsedSpec.spec.paths).length
          });

        } catch (error: any) {
          // Update connection with FAILED status
          await prisma.apiConnection.update({
            where: { id: newConnection.id },
            data: {
              ingestionStatus: 'FAILED'
            }
          });

          // Log the error but don't fail the entire request
          logError('Failed to process OpenAPI spec', error, { 
            connectionId: newConnection.id,
            documentationUrl: connectionData.documentationUrl
          });

          // Return success with warning about spec processing
          return res.status(201).json({
            success: true,
            data: {
              ...newConnection,
              ingestionStatus: 'FAILED'
            },
            message: 'API connection created successfully, but OpenAPI spec processing failed',
            warning: error.message
          });
        }
      }

      // Get the updated connection with final ingestion status
      const finalConnection = await prisma.apiConnection.findUnique({
        where: { id: newConnection.id }
      });

      return res.status(201).json({
        success: true,
        data: finalConnection,
        message: 'API connection created successfully'
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