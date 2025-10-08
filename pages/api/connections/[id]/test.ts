import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { handleApiError } from '../../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { parseOpenApiSpec } from '../../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../../src/lib/api/endpoints';

/**
 * Categorize error types for better user guidance
 */
function getErrorType(error: any): string {
  if (error.message?.includes('timeout')) return 'TIMEOUT';
  if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
  if (error.message?.includes('404')) return 'NOT_FOUND';
  if (error.message?.includes('401') || error.message?.includes('403')) return 'AUTHENTICATION';
  if (error.message?.includes('5')) return 'SERVER_ERROR';
  if (error.message?.includes('SSL') || error.message?.includes('certificate')) return 'SSL_ERROR';
  return 'UNKNOWN';
}

/**
 * Extract HTTP status from error message
 */
function getHttpStatus(error: any): number | null {
  const match = error.message?.match(/HTTP (\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Generate troubleshooting tips based on error type
 */
function getTroubleshootingTips(error: any, baseUrl: string): string[] {
  const errorType = getErrorType(error);
  const tips: string[] = [];
  
  switch (errorType) {
    case 'TIMEOUT':
      tips.push('The server took too long to respond (>10 seconds)');
      tips.push('Check if the server is experiencing high load');
      tips.push('Verify the URL is correct and accessible');
      break;
      
    case 'CONNECTION_REFUSED':
      tips.push('The server is not responding or is down');
      tips.push('Check if the URL is correct: ' + baseUrl);
      tips.push('Verify the server is running and accessible');
      break;
      
    case 'NOT_FOUND':
      tips.push('The endpoint returned a 404 Not Found error');
      tips.push('Verify the base URL is correct: ' + baseUrl);
      tips.push('Check if the API endpoint exists and is accessible');
      break;
      
    case 'AUTHENTICATION':
      tips.push('Authentication failed (401/403 error)');
      tips.push('Check your API credentials and authentication method');
      tips.push('Verify the API key or token is valid and not expired');
      break;
      
    case 'SERVER_ERROR':
      tips.push('The server returned a 5xx error');
      tips.push('This indicates a server-side issue');
      tips.push('Try again later or contact the API provider');
      break;
      
    case 'SSL_ERROR':
      tips.push('SSL/TLS certificate issue detected');
      tips.push('Check if the server has a valid SSL certificate');
      tips.push('Verify the URL uses HTTPS correctly');
      break;
      
    default:
      tips.push('An unexpected error occurred');
      tips.push('Check the connection details and try again');
      break;
  }
  
  return tips;
}

/**
 * Test basic connectivity to a connection's base URL
 */
async function testConnectionConnectivity(
  baseUrl: string, 
  authType: string, 
  authConfig: any
): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Prepare headers based on auth type
    const headers: Record<string, string> = {
      'User-Agent': 'ApiQ-Connection-Test/1.0',
      'Accept': 'application/json, text/plain, */*'
    };

    // Add authentication headers if configured
    if (authType === 'API_KEY' && authConfig?.apiKey) {
      const apiKeyHeader = authConfig.apiKeyHeader || 'X-API-Key';
      headers[apiKeyHeader] = authConfig.apiKey;
    } else if (authType === 'BEARER' && authConfig?.token) {
      headers['Authorization'] = `Bearer ${authConfig.token}`;
    } else if (authType === 'BASIC' && authConfig?.username && authConfig?.password) {
      const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Make a HEAD request first (faster), fallback to GET if HEAD fails
    let response: Response;
    try {
      response = await fetch(baseUrl, {
        method: 'HEAD',
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
    } catch (headError) {
      // If HEAD fails, try GET request
      response = await fetch(baseUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
    }

    const responseTime = Date.now() - startTime;

    // Check if response is successful (2xx status codes)
    if (response.ok) {
      return {
        success: true,
        responseTime
      };
    } else {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        responseTime,
        error: 'Connection timeout - server did not respond within 10 seconds'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        responseTime,
        error: `Connection failed - unable to reach ${baseUrl}`
      };
    } else {
      return {
        success: false,
        responseTime,
        error: error.message || 'Unknown connection error'
      };
    }
  }
}

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
        message: 'Connection validation completed successfully'
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
              message: 'Connection validation completed successfully - OpenAPI spec parsed and endpoints extracted'
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
          // No documentation URL - test basic connectivity by making HTTP request
          const connectivityTest = await testConnectionConnectivity(connection.baseUrl, connection.authType, connection.authConfig);
          
          if (connectivityTest.success) {
            // Update connection with successful test
            await prisma.apiConnection.update({
              where: { id },
              data: {
                lastTested: new Date(),
                status: 'ACTIVE'
              }
            });

            testResult = {
              status: 'success',
              responseTime: connectivityTest.responseTime,
              endpoints: connection.endpoints.length,
              message: 'Connection validation completed successfully - basic connectivity verified'
            };

            logInfo('API connection basic connectivity test successful', {
              connectionId: id,
              userId: user.id,
              baseUrl: connection.baseUrl,
              responseTime: connectivityTest.responseTime
            });
          } else {
            throw new Error(`Connection test failed: ${connectivityTest.error}`);
          }
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
          message: 'Connection validation failed',
          error: error.message,
          errorDetails: {
            type: getErrorType(error),
            httpStatus: getHttpStatus(error),
            troubleshooting: getTroubleshootingTips(error, connection.baseUrl),
            timestamp: new Date().toISOString(),
            connectionInfo: {
              baseUrl: connection.baseUrl,
              authType: connection.authType,
              hasDocumentation: !!connection.documentationUrl
            }
          }
        };

        logError('API connection test failed', error, {
          connectionId: id,
          userId: user.id,
          documentationUrl: connection.documentationUrl
        });
      }

      return res.status(200).json({
        success: testResult.status === 'success',
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