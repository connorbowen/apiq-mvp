// TODO: [connorbowen] 2025-06-29 - This file is approaching the 200-300 line threshold (currently 242 lines).
// Consider extracting connection creation logic into a service layer to improve maintainability.
// Priority: Low - not urgent for current functionality.

// TODO: [SECRETS-FIRST-REFACTOR] Phase 4: Connection API Migration
// - Update connection creation to use secrets instead of direct authConfig storage
// - Add secret creation during connection setup
// - Add connection-secret linking and validation
// - Add rollback mechanisms for failed secret creation
// - Update connection retrieval to include secret information
// - Add connection status updates based on secret health
// - Add migration logic for existing connections
// - Add connection-secret dependency validation
// - Add audit logging for connection-secret operations
// - Consider adding connection-secret bulk operations

console.log('LOADED /api/connections handler');

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { CreateApiConnectionRequest } from '../../../src/types';
import { parseOpenApiSpecData, ParseError } from '../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../src/lib/api/endpoints';
import { requireAdmin, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { openApiService } from '../../../src/services/openApiService';
import { ConnectionStatus } from '../../../src/generated/prisma';
import { validateOpenApiConnection, validateOpenApiSpec } from '../../../src/lib/api/validation';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  console.log('🔍 Handler called with method:', req.method);
  console.log('🚨 CONNECTIONS API HANDLER EXECUTED - METHOD:', req.method, 'URL:', req.url);
  try {
    // Require admin authentication for all operations
    const user = await requireAdmin(req, res);
    console.log('🔍 User authenticated:', user.id);

    if (req.method === 'GET') {
      console.log('🔍 GET branch entered');
      // Get all API connections for the authenticated user
      const connections = await prisma.apiConnection.findMany({
        where: { userId: user.id },
        include: {
          endpoints: {
            where: { isActive: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Debug: Log userId and returned connection IDs (apiConnection)
      console.log('🔵 GET result for', user.id, '=>', connections.map(c => c.id));

      // Add computed fields to each connection
      const connectionsWithComputedFields = connections.map(connection => ({
        id: connection.id,
        name: connection.name,
        description: connection.description,
        baseUrl: connection.baseUrl,
        authType: connection.authType,
        documentationUrl: connection.documentationUrl,
        status: connection.status,
        connectionStatus: connection.connectionStatus,
        ingestionStatus: connection.ingestionStatus,
        // Computed fields
        endpointCount: connection.endpoints.length,
        lastUsed: connection.lastTested || connection.updatedAt,
        // Metadata fields
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt
      }));

      logInfo('Retrieved API connections', { 
        userId: user.id, 
        count: connections.length 
      });

      return res.status(200).json({
        success: true,
        data: {
          connections: connectionsWithComputedFields,
          // Summary metadata
          total: connections.length,
          active: connections.filter(c => c.status === 'ACTIVE').length,
          failed: connections.filter(c => c.ingestionStatus === 'FAILED').length
        }
      });

    } else if (req.method === 'POST') {
      console.log('🔍 POST branch entered');
      // Create a new API connection
      const connectionData: CreateApiConnectionRequest = req.body;

      // Validate required fields
      if (!connectionData.name || !connectionData.baseUrl || !connectionData.authType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, baseUrl, authType',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate OpenAPI connection data
      const connectionValidation = await validateOpenApiConnection(
        connectionData.name,
        connectionData.baseUrl,
        connectionData.documentationUrl
      );

      if (!connectionValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: connectionValidation.error,
          code: connectionValidation.code || 'VALIDATION_ERROR'
        });
      }

      // Validate authType is a valid enum value
      const validAuthTypes = ['NONE', 'API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH2', 'CUSTOM'];
      if (!validAuthTypes.includes(connectionData.authType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid auth type. Must be one of: NONE, API_KEY, BEARER_TOKEN, BASIC_AUTH, OAUTH2, CUSTOM',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate OAuth2-specific requirements
      if (connectionData.authType === 'OAUTH2') {
        if (!connectionData.authConfig) {
          return res.status(400).json({
            success: false,
            error: 'OAuth2 configuration is required for OAuth2 authentication type',
            code: 'VALIDATION_ERROR'
          });
        }

        const oauth2Config = connectionData.authConfig;
        const requiredFields = ['clientId', 'clientSecret', 'redirectUri'];
        const missingFields = requiredFields.filter(field => !oauth2Config[field]);

        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Missing required OAuth2 fields: ${missingFields.join(', ')}`,
            code: 'VALIDATION_ERROR'
          });
        }

        // Validate OAuth2 provider if specified
        if (oauth2Config.provider) {
          const validProviders = ['github', 'google', 'slack', 'discord', 'test', 'custom'];
          if (!validProviders.includes(oauth2Config.provider)) {
            return res.status(400).json({
              success: false,
              error: `Invalid OAuth2 provider. Must be one of: ${validProviders.join(', ')}`,
              code: 'VALIDATION_ERROR'
            });
          }
        }
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
          error: 'API connection with this name already exists',
          code: 'RESOURCE_CONFLICT'
        });
      }

      // Create the API connection with PENDING ingestion status
      let newConnection: any;
      let endpointCount: number = 0;

      try {
        // Use a transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
          // Determine initial connection status based on auth type
          const initialConnectionStatus = connectionData.authType === 'OAUTH2' 
            ? ConnectionStatus.disconnected 
            : ConnectionStatus.connected;

          // Create the API connection
          newConnection = await tx.apiConnection.create({
            data: {
              userId: user.id,
              name: connectionData.name,
              description: connectionData.description,
              baseUrl: connectionData.baseUrl,
              authType: connectionData.authType,
              authConfig: connectionData.authConfig || {},
              documentationUrl: connectionData.documentationUrl,
              status: 'ACTIVE',
              connectionStatus: initialConnectionStatus,
              ingestionStatus: 'PENDING'
            }
          });

          // Debug: Log after persisting the apiConnection
          console.log('🟢 POST persisted', {
            userId: user.id,
            connId: newConnection.id,
            name: newConnection.name,
          });

          logInfo('Created API connection', { 
            connectionId: newConnection.id,
            userId: user.id,
            name: newConnection.name
          });

          // If documentation URL is provided, parse OpenAPI spec and extract endpoints
          if (connectionData.documentationUrl) {
            try {
              // Use the new OpenAPI service with caching
              const fetchResult = await openApiService.fetchSpec(connectionData.documentationUrl);
              
              if (!fetchResult.success) {
                throw new Error(fetchResult.error || 'Failed to fetch OpenAPI spec');
              }

              // Validate the OpenAPI specification
              const specValidation = validateOpenApiSpec(fetchResult.spec);
              if (!specValidation.isValid) {
                throw new Error(`Invalid OpenAPI specification: ${specValidation.error}`);
              }

              // Parse the OpenAPI specification using the fetched spec data
              const parsedSpec = await parseOpenApiSpecData(fetchResult.spec, connectionData.documentationUrl);
              
              // Validate that parsedSpec has the required properties
              if (!parsedSpec || !parsedSpec.rawSpec || !parsedSpec.specHash) {
                throw new Error('Invalid parsed specification - missing required properties');
              }
              
              // Update connection with parsed spec data within the same transaction
              await tx.apiConnection.update({
                where: { id: newConnection.id },
                data: {
                  rawSpec: parsedSpec.rawSpec,
                  specHash: parsedSpec.specHash,
                  ingestionStatus: 'SUCCEEDED'
                }
              });

              // Extract and store endpoints
              const endpoints = await extractAndStoreEndpoints(newConnection.id, parsedSpec, tx);
              endpointCount = Array.isArray(endpoints) ? endpoints.length : 0;

              logInfo('Successfully processed OpenAPI spec and extracted endpoints', {
                connectionId: newConnection.id,
                endpointCount: Object.keys(parsedSpec.spec.paths).length,
                cached: fetchResult.cached,
                duration: fetchResult.duration
              });

            } catch (error: any) {
              // Log the error
              logError('Failed to process OpenAPI spec', error, { 
                connectionId: newConnection.id,
                documentationUrl: connectionData.documentationUrl
              });

              // Rollback the transaction by throwing the error
              // This will prevent the connection from being created if OpenAPI validation fails
              throw error;
            }
          }
        });

        // Get the final connection state
        const finalConnection = await prisma.apiConnection.findUnique({
          where: { id: newConnection.id }
        });

        return res.status(201).json({
          success: true,
          data: {
            id: finalConnection?.id,
            userId: finalConnection?.userId,
            name: finalConnection?.name,
            description: finalConnection?.description,
            baseUrl: finalConnection?.baseUrl,
            authType: finalConnection?.authType,
            authConfig: finalConnection?.authConfig,
            documentationUrl: finalConnection?.documentationUrl,
            status: finalConnection?.status,
            ingestionStatus: finalConnection?.ingestionStatus,
            rawSpec: finalConnection?.rawSpec,
            specHash: finalConnection?.specHash,
            lastTested: finalConnection?.lastTested,
            createdAt: finalConnection?.createdAt,
            updatedAt: finalConnection?.updatedAt,
            endpointCount,
            lastUsed: finalConnection?.updatedAt
          },
          message: 'API connection created successfully'
        });

      } catch (error: any) {
        // Log the error
        logError('API connection creation failed', error, { 
          name: connectionData.name, 
          userId: user.id,
          documentationUrl: connectionData.documentationUrl 
        });

        // Return appropriate error response based on the error type
        if (error.message?.includes('Invalid OpenAPI specification')) {
          return res.status(400).json({
            success: false,
            error: error.message,
            code: 'INVALID_OPENAPI_SPEC'
          });
        }

        if (error.message?.includes('Failed to fetch OpenAPI spec')) {
          return res.status(400).json({
            success: false,
            error: error.message,
            code: 'OPENAPI_FETCH_FAILED'
          });
        }

        // For other errors, return a generic error
        return res.status(500).json({
          success: false,
          error: 'Failed to create API connection',
          code: 'CONNECTION_CREATION_FAILED',
          details: error.message || 'Unknown error occurred'
        });
      }

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