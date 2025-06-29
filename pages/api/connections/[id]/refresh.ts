import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { handleApiError } from '../../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { parseOpenApiSpec } from '../../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../../src/lib/api/endpoints';

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

    if (req.method === 'POST') {
      // Refresh API connection OpenAPI spec
      const connection = await prisma.apiConnection.findFirst({
        where: { 
          id,
          userId: user.id 
        },
        include: {
          endpoints: {
            where: { isActive: true }
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

      if (!connection.documentationUrl) {
        return res.status(400).json({
          success: false,
          error: 'No documentation URL available for refresh',
          code: 'VALIDATION_ERROR'
        });
      }

      const startTime = Date.now();
      let refreshResult: any = {
        endpointsUpdated: 0,
        newEndpoints: 0,
        removedEndpoints: 0,
        message: 'API specification refreshed successfully'
      };

      try {
        // Parse the updated OpenAPI specification
        const parsedSpec = await parseOpenApiSpec(connection.documentationUrl);
        
        if (!parsedSpec || !parsedSpec.spec || !parsedSpec.spec.paths) {
          throw new Error('Invalid OpenAPI specification format');
        }

        // Check if spec has changed
        const specChanged = connection.specHash !== parsedSpec.specHash;
        
        if (specChanged) {
          // Get current endpoint count for comparison
          const currentEndpointCount = connection.endpoints.length;
          
          // Update connection with new spec data
          await prisma.apiConnection.update({
            where: { id },
            data: {
              rawSpec: parsedSpec.rawSpec,
              specHash: parsedSpec.specHash,
              ingestionStatus: 'SUCCEEDED',
              lastTested: new Date()
            }
          });

          // Extract and store new endpoints
          const newEndpoints = await extractAndStoreEndpoints(id, parsedSpec);
          const newEndpointCount = Array.isArray(newEndpoints) ? newEndpoints.length : 0;

          refreshResult = {
            endpointsUpdated: newEndpointCount,
            newEndpoints: Math.max(0, newEndpointCount - currentEndpointCount),
            removedEndpoints: Math.max(0, currentEndpointCount - newEndpointCount),
            specChanged: true,
            responseTime: Date.now() - startTime,
            message: 'API specification refreshed successfully - endpoints updated'
          };

          logInfo('API specification refreshed successfully', {
            connectionId: id,
            userId: user.id,
            endpointsUpdated: refreshResult.endpointsUpdated,
            newEndpoints: refreshResult.newEndpoints,
            removedEndpoints: refreshResult.removedEndpoints,
            responseTime: refreshResult.responseTime
          });

        } else {
          // No changes detected
          refreshResult = {
            endpointsUpdated: connection.endpoints.length,
            newEndpoints: 0,
            removedEndpoints: 0,
            specChanged: false,
            responseTime: Date.now() - startTime,
            message: 'API specification is up to date - no changes detected'
          };

          logInfo('API specification refresh - no changes detected', {
            connectionId: id,
            userId: user.id,
            responseTime: refreshResult.responseTime
          });
        }

      } catch (error: any) {
        // Update connection with failed refresh
        await prisma.apiConnection.update({
          where: { id },
          data: {
            ingestionStatus: 'FAILED',
            lastTested: new Date()
          }
        });

        refreshResult = {
          endpointsUpdated: 0,
          newEndpoints: 0,
          removedEndpoints: 0,
          specChanged: false,
          responseTime: Date.now() - startTime,
          message: 'API specification refresh failed',
          error: error.message
        };

        logError('API specification refresh failed', error, {
          connectionId: id,
          userId: user.id,
          documentationUrl: connection.documentationUrl
        });
      }

      return res.status(200).json({
        success: true,
        data: refreshResult
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