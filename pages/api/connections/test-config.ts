import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { parseOpenApiSpec } from '../../../src/lib/api/parser';

interface TestConnectionConfigRequest {
  name: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  documentationUrl?: string;
  authConfig?: {
    apiKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scope?: string;
    provider?: string;
  };
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require authentication
    const user = await requireAuth(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    const config: TestConnectionConfigRequest = req.body;

    // Validate required fields
    if (!config.name || !config.baseUrl || !config.authType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, baseUrl, authType',
        code: 'VALIDATION_ERROR'
      });
    }

    const startTime = Date.now();
    let testResult: any = {
      status: 'success',
      responseTime: 0,
      message: 'Connection configuration test successful'
    };

    try {
      // Test 1: Validate base URL format
      try {
        new URL(config.baseUrl);
      } catch {
        throw new Error('Invalid base URL format');
      }

      // Test 2: Validate auth configuration based on auth type
      switch (config.authType) {
        case 'API_KEY':
          if (!config.authConfig?.apiKey) {
            throw new Error('API Key is required for API_KEY authentication');
          }
          break;
        case 'BEARER_TOKEN':
          if (!config.authConfig?.bearerToken) {
            throw new Error('Bearer Token is required for BEARER_TOKEN authentication');
          }
          break;
        case 'BASIC_AUTH':
          if (!config.authConfig?.username || !config.authConfig?.password) {
            throw new Error('Username and Password are required for BASIC_AUTH authentication');
          }
          break;
        case 'OAUTH2':
          if (!config.authConfig?.clientId || !config.authConfig?.clientSecret || !config.authConfig?.redirectUri) {
            throw new Error('Client ID, Client Secret, and Redirect URI are required for OAuth2 authentication');
          }
          break;
      }

      // Test 3: Test OpenAPI specification if provided
      if (config.documentationUrl) {
        try {
          const parsedSpec = await parseOpenApiSpec(config.documentationUrl);
          
          if (parsedSpec && parsedSpec.spec && parsedSpec.spec.paths) {
            const endpointCount = Object.keys(parsedSpec.spec.paths).length;
            
            testResult = {
              status: 'success',
              responseTime: Date.now() - startTime,
              endpoints: endpointCount,
              message: `Connection configuration test successful - OpenAPI spec parsed with ${endpointCount} endpoints`
            };

            logInfo('Connection configuration test successful', {
              userId: user.id,
              connectionName: config.name,
              endpointCount,
              responseTime: testResult.responseTime
            });
          } else {
            throw new Error('Invalid OpenAPI specification format');
          }
        } catch (error: any) {
          throw new Error(`OpenAPI specification test failed: ${error.message}`);
        }
      } else {
        // No documentation URL - just validate configuration
        testResult = {
          status: 'success',
          responseTime: Date.now() - startTime,
          message: 'Connection configuration test successful - no OpenAPI spec to validate'
        };

        logInfo('Connection configuration test successful', {
          userId: user.id,
          connectionName: config.name,
          responseTime: testResult.responseTime
        });
      }

    } catch (error: any) {
      testResult = {
        status: 'failed',
        responseTime: Date.now() - startTime,
        message: 'Connection configuration test failed',
        error: error.message
      };

      logError('Connection configuration test failed', error, {
        userId: user.id,
        connectionName: config.name,
        baseUrl: config.baseUrl,
        authType: config.authType
      });
    }

    return res.status(200).json({
      success: true,
      data: testResult
    });

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 