import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { logInfo, logError } from '../../../src/utils/logger';
import { ApiSchemaEnhancementService } from '../../../src/lib/services/apiSchemaEnhancementService';
import { usageTrackingService } from '../../../src/lib/services/usageTrackingService';
import { UsageType } from '../../../src/generated/prisma';

interface ExecuteOperationRequest {
  endpointId: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  headers?: Record<string, string>;
}

interface ExecuteOperationResponse {
  success: boolean;
  data?: {
    executionId: string;
    status: string;
    responseData?: any;
    responseHeaders?: Record<string, string>;
    statusCode?: number;
    executionTime?: number;
    error?: string;
  };
  error?: string;
}

/**
 * Execute a single API operation
 * POST /api/operations/execute
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse<ExecuteOperationResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let user: any;
  try {
    user = await requireAuth(req, res);
    const { endpointId, parameters = {}, requestBody, headers = {} }: ExecuteOperationRequest = req.body;

    if (!endpointId) {
      return res.status(400).json({ success: false, error: 'Endpoint ID is required' });
    }

    // Check usage limits before executing direct API call
    const canExecute = await usageTrackingService.canPerformAction(user.id, 'direct_api_call');
    if (!canExecute.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Direct API call limit reached'
      });
    }

    // Get the endpoint and its connection
    const endpoint = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        isActive: true,
        apiConnection: {
          userId: user.id,
          status: 'ACTIVE'
        }
      },
      include: {
        apiConnection: {
          include: {
            secrets: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!endpoint) {
      return res.status(404).json({ success: false, error: 'Endpoint not found or not accessible' });
    }

    const connection = endpoint.apiConnection;
    if (!connection) {
      return res.status(404).json({ success: false, error: 'API connection not found' });
    }

    // Validate parameters using enhanced parameter schemas
    if (endpoint.parameters) {
      const enhancedEndpoint = await ApiSchemaEnhancementService.enhanceEndpoint(endpoint);
      const validationErrors: string[] = [];
      
      // Check required parameters
      const missingParams = (await enhancedEndpoint).parameters
        .filter((param: any) => param.required && !parameters[param.name])
        .map((param: any) => param.name);
      
      if (missingParams.length > 0) {
        validationErrors.push(`Missing required parameters: ${missingParams.join(', ')}`);
      }
      
      // Validate parameter values
      (await enhancedEndpoint).parameters.forEach((param: any) => {
        const value = parameters[param.name];
        if (value !== undefined && value !== null && value !== '') {
          // Type validation
          if (param.type === 'number' && isNaN(Number(value))) {
            validationErrors.push(`Parameter '${param.name}' must be a number`);
          }
          
          // Range validation
          if (param.type === 'number' && param.validation) {
            const numValue = Number(value);
            if (param.validation.min !== undefined && numValue < param.validation.min) {
              validationErrors.push(`Parameter '${param.name}' must be at least ${param.validation.min}`);
            }
            if (param.validation.max !== undefined && numValue > param.validation.max) {
              validationErrors.push(`Parameter '${param.name}' must be at most ${param.validation.max}`);
            }
          }
          
          // Enum validation
          if (param.validation?.enum && !param.validation.enum.includes(String(value))) {
            validationErrors.push(`Parameter '${param.name}' must be one of: ${param.validation.enum.join(', ')}`);
          }
          
          // Pattern validation
          if (param.validation?.pattern && !new RegExp(param.validation.pattern).test(String(value))) {
            validationErrors.push(`Parameter '${param.name}' format is invalid`);
          }
        }
      });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Parameter validation failed: ${validationErrors.join('; ')}`
        });
      }
    }

    // Create operation execution record
    const execution = await prisma.operationExecution.create({
      data: {
        operationId: endpointId, // Using endpointId as operationId for now
        userId: user.id,
        status: 'PENDING',
        requestData: {
          parameters,
          requestBody,
          headers,
          endpoint: endpoint.path,
          method: endpoint.method
        }
      }
    });

    const startTime = Date.now();

    try {
      // Build the request URL
      const baseUrl = connection.baseUrl.replace(/\/$/, ''); // Remove trailing slash
      const endpointPath = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
      const url = `${baseUrl}${endpointPath}`;

      // Build query parameters
      const urlObj = new URL(url);
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          urlObj.searchParams.append(key, String(value));
        }
      });

      // Prepare request headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'APIQ-SingleOperation/1.0',
        ...headers
      };

      // Add authentication headers
      if (connection.authType === 'API_KEY' && connection.authConfig) {
        const authConfig = connection.authConfig as any;
        if (authConfig.apiKey) {
          if (authConfig.headerName) {
            requestHeaders[authConfig.headerName] = authConfig.apiKey;
          } else {
            requestHeaders['X-API-Key'] = authConfig.apiKey;
          }
        }
      } else if (connection.authType === 'BEARER_TOKEN' && connection.authConfig) {
        const authConfig = connection.authConfig as any;
        if (authConfig.bearerToken) {
          requestHeaders['Authorization'] = `Bearer ${authConfig.bearerToken}`;
        }
      } else if (connection.authType === 'BASIC_AUTH' && connection.authConfig) {
        const authConfig = connection.authConfig as any;
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
          requestHeaders['Authorization'] = `Basic ${credentials}`;
        }
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers: requestHeaders,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      };

      // Add request body for POST, PUT, PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && requestBody) {
        requestOptions.body = JSON.stringify(requestBody);
      }

      // Execute the API call
      const response = await fetch(urlObj.toString(), requestOptions);
      const executionTime = Date.now() - startTime;

      // Get response data
      let responseData: any = null;
      const responseHeaders: Record<string, string> = {};
      
      // Copy response headers
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Try to parse response as JSON, fallback to text
      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // Update execution record with results
      await prisma.operationExecution.update({
        where: { id: execution.id },
        data: {
          status: response.ok ? 'COMPLETED' : 'FAILED',
          responseData,
          responseHeaders,
          statusCode: response.status,
          executionTime,
          completedAt: new Date(),
          error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
        }
      });

      // Track usage after successful API call
      if (response.ok) {
        await usageTrackingService.trackUsage(
          user.id,
          UsageType.DIRECT_API_CALL,
          endpointId,
          'direct_api_call',
          {
            endpoint: endpoint.path,
            method: endpoint.method,
            statusCode: response.status,
            executionTime,
            executionId: execution.id
          }
        );
      }

      logInfo('API operation executed successfully', {
        userId: user.id,
        endpointId,
        executionId: execution.id,
        statusCode: response.status,
        executionTime
      });

      return res.status(200).json({
        success: true,
        data: {
          executionId: execution.id,
          status: response.ok ? 'COMPLETED' : 'FAILED',
          responseData,
          responseHeaders,
          statusCode: response.status,
          executionTime,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        }
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Update execution record with error
      await prisma.operationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          executionTime,
          completedAt: new Date()
        }
      });

      logError('API operation execution failed', error as Error, {
        userId: user.id,
        endpointId,
        executionId: execution.id,
        executionTime
      });

      return res.status(500).json({
        success: false,
        data: {
          executionId: execution.id,
          status: 'FAILED',
          executionTime,
          error: errorMessage
        }
      });
    }

  } catch (error) {
    logError('Failed to execute API operation', error as Error, { userId: user?.id });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
