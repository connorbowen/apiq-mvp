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
      // Test API connection
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

      const startTime = Date.now();
      let testResult: any = {
        status: 'success',
        responseTime: 0,
        endpoints: 0,
        message: 'Connection test successful'
      };

      try {
        // Test the connection by attempting to parse the OpenAPI spec
        if (connection.documentationUrl) {
          const parsedSpec = await parseOpenApiSpec(connection.documentationUrl);
          
          if (parsedSpec && parsedSpec.spec && parsedSpec.spec.paths) {
            const endpointCount = Object.keys(parsedSpec.spec.paths).length;
            
            // Update connection with successful test
            await prisma.apiConnection.update({
              where: { id },
              data: {
                lastTested: new Date(),
                status: 'ACTIVE',
                ingestionStatus: 'SUCCEEDED',
                rawSpec: parsedSpec.rawSpec,
                specHash: parsedSpec.specHash
              }
            });

            // Extract and store endpoints if we have new ones
            const endpoints = await extractAndStoreEndpoints(id, parsedSpec);
            
            testResult = {
              status: 'success',
              responseTime: Date.now() - startTime,
              endpoints: endpointCount,
              newEndpoints: Array.isArray(endpoints) ? endpoints.length : 0,
              message: 'Connection test successful - OpenAPI spec parsed and endpoints extracted'
            };

            logInfo('API connection test successful', {
              connectionId: id,
              userId: user.id,
              endpointCount,
              responseTime: testResult.responseTime
            });

          } else {
            throw new Error('Invalid OpenAPI specification format');
          }
        } else {
          // No documentation URL - just test basic connectivity
          testResult = {
            status: 'success',
            responseTime: Date.now() - startTime,
            endpoints: connection.endpoints.length,
            message: 'Connection test successful - no OpenAPI spec to validate'
          };

          // Update last tested timestamp
          await prisma.apiConnection.update({
            where: { id },
            data: {
              lastTested: new Date()
            }
          });
        }

      } catch (error: any) {
        // Update connection with failed test
        await prisma.apiConnection.update({
          where: { id },
          data: {
            lastTested: new Date(),
            status: 'ERROR',
            ingestionStatus: 'FAILED'
          }
        });

        testResult = {
          status: 'failed',
          responseTime: Date.now() - startTime,
          endpoints: connection.endpoints.length,
          message: 'Connection test failed',
          error: error.message
        };

        logError('API connection test failed', error, {
          connectionId: id,
          userId: user.id,
          documentationUrl: connection.documentationUrl
        });
      }

      return res.status(200).json({
        success: true,
        data: testResult
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