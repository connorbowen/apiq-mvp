import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { prisma } from '../../../lib/database/client';
import { logInfo, logError } from '../../../src/utils/logger';
import { OpenAIService } from '../../../src/services/openaiService';
import { ConnectionGuidanceService } from '../../../src/lib/services/connectionGuidanceService';
import { EnhancedErrorHandler } from '../../../src/lib/services/enhancedErrorHandler';
import { errorHandler } from '../../../src/middleware/errorHandler';
import axios from 'axios';

interface DirectApiCallResponse {
  success: boolean;
  data?: {
    intent: 'api_call' | 'workflow_creation' | 'general_chat';
    apiCallResult?: {
      method: string;
      url: string;
      statusCode: number;
      responseData: any;
      responseHeaders: Record<string, string>;
      executionTime: number;
      error?: string;
    };
    explanation: string;
    suggestedAction?: string;
    connectionGuidance?: {
      requiresGuidance: boolean;
      missingApis: Array<{
        name: string;
        displayName: string;
        description: string;
        authType: string;
        setupInstructions: {
          step1: string;
          step2: string;
          step3: string;
          additionalNotes?: string;
        };
        documentationUrl?: string;
        baseUrl?: string;
        commonEndpoints?: string[];
      }>;
      suggestedConnections: Array<{
        name: string;
        displayName: string;
        description: string;
        authType: string;
        setupInstructions: {
          step1: string;
          step2: string;
          step3: string;
          additionalNotes?: string;
        };
        documentationUrl?: string;
        baseUrl?: string;
        commonEndpoints?: string[];
      }>;
      guidanceMessage: string;
      setupInstructions?: {
        title: string;
        steps: string[];
      };
    };
  };
  error?: string;
}

async function executeApiCall(apiCallData: any, connections: any[], userId: string) {
  const startTime = Date.now();
  
  try {
    console.log('executeApiCall - apiCallData:', apiCallData);
    console.log('executeApiCall - connections:', connections.map(c => ({ id: c.id, name: c.name })));
    console.log('executeApiCall - looking for connectionId:', apiCallData.connectionId);
    
    const connection = connections.find(conn => conn.id === apiCallData.connectionId);
    if (!connection) {
      console.log('executeApiCall - Connection not found for ID:', apiCallData.connectionId);
      return {
        success: false,
        data: { error: 'Connection not found' }
      };
    }
    
    // Substitute path parameters in the URL
    let substitutedUrl = apiCallData.url;
    if (apiCallData.parameters) {
      for (const [key, value] of Object.entries(apiCallData.parameters)) {
        substitutedUrl = substitutedUrl.replace(`{${key}}`, String(value));
      }
    }
    
    const fullUrl = `${connection.baseUrl}${substitutedUrl}`;
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...apiCallData.headers
    };

    // Add authentication headers based on connection type
    if (connection.authType === 'API_KEY' && connection.authConfig?.apiKey) {
      headers['X-API-Key'] = connection.authConfig.apiKey;
    } else if (connection.authType === 'BEARER_TOKEN' && connection.authConfig?.token) {
      headers['Authorization'] = `Bearer ${connection.authConfig.token}`;
    } else if (connection.authType === 'NONE') {
      // No authentication required for this connection
      console.log('No authentication required for connection:', connection.name);
    }

    let response;
    const requestConfig = {
      method: apiCallData.method,
      url: fullUrl,
      headers,
      params: apiCallData.parameters,
      data: apiCallData.requestBody,
      timeout: 30000
    };

    logInfo('Executing API call', {
      method: apiCallData.method,
      originalUrl: apiCallData.url,
      substitutedUrl: substitutedUrl,
      fullUrl: fullUrl,
      parameters: apiCallData.parameters,
      connectionId: apiCallData.connectionId,
      userId
    });

    response = await axios(requestConfig);
    
    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        method: apiCallData.method,
        url: apiCallData.url,
        statusCode: response.status,
        responseData: response.data,
        responseHeaders: response.headers as Record<string, string>,
        executionTime
      }
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    if (error.response) {
      // API returned an error response
      return {
        success: true, // Still successful from our perspective
        data: {
          method: apiCallData.method,
          url: apiCallData.url,
          statusCode: error.response.status,
          responseData: error.response.data,
          responseHeaders: error.response.headers as Record<string, string>,
          executionTime,
          error: `API Error: ${error.response.status} ${error.response.statusText}`
        }
      };
    } else {
      // Network or other error
      return {
        success: false,
        data: {
          method: apiCallData.method,
          url: apiCallData.url,
          statusCode: 0,
          responseData: null,
          responseHeaders: {},
          executionTime,
          error: error.message || 'Network error'
        }
      };
    }
  }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<DirectApiCallResponse>) {
  console.log('🚀 EXECUTE DIRECT API HANDLER CALLED 🚀');
  
  // Declare variables at function scope
  let message: string = '';
  let context: any;
  let openaiService: OpenAIService | undefined;
  let enhancedErrorHandler: EnhancedErrorHandler | undefined;
  
  try {
    console.log('=== API endpoint - Starting execute-direct handler ===');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

    const body = req.body;
    message = body.message;
    context = body.context;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    console.log('API endpoint - Getting user from requireAuth');
    const user = await requireAuth(req, res);
    console.log('API endpoint - User from requireAuth:', user ? { id: user.id, email: user.email } : 'null');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log('API endpoint - Querying connections for user:', user.id);
    const connections = await prisma.apiConnection.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        endpoints: {
          where: { isActive: true }
        }
      }
    });
    console.log('API endpoint - Found connections:', connections.length);
    console.log('API endpoint - Connection details:', connections.map(c => ({ 
      id: c.id, 
      name: c.name, 
      userId: c.userId, 
      status: c.status,
      endpointCount: c.endpoints.length
    })));

    // Check if connection guidance is needed
    console.log('API endpoint - Checking connection guidance for message:', message);
    console.log('API endpoint - Available connections:', connections.map(conn => ({ name: conn.name, id: conn.id })));
    
    let connectionGuidance;
    try {
      connectionGuidance = await ConnectionGuidanceService.analyzeRequest(
        message,
        connections.map(conn => ({ 
          name: conn.name, 
          id: conn.id,
          baseUrl: conn.baseUrl,
          endpoints: conn.endpoints.map(endpoint => ({
            path: endpoint.path,
            method: endpoint.method,
            summary: endpoint.summary || ''
          }))
        }))
      );
    } catch (error) {
      console.error('API endpoint - Connection guidance error:', error);
      return res.status(500).json({
        success: false,
        error: 'Connection guidance service error'
      });
    }

    console.log('API endpoint - Connection guidance result:', connectionGuidance);

      if (connectionGuidance.requiresGuidance) {
        console.log('→ Connection guidance needed for:', connectionGuidance.missingApis.map(api => api.displayName));
        return res.status(200).json({
          success: true,
          data: {
            intent: 'general_chat',
            explanation: connectionGuidance.guidanceMessage,
            connectionGuidance: connectionGuidance
          }
        });
      }

    if (connections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active API connections found. Please create a connection first.' 
      });
    }

    // Create OpenAI service instance
    console.log('API endpoint - Creating OpenAI service');
    let useFallback = false;
    try {
      // Use system-wide OpenAI API key directly from environment variables
      // This is the primary method since we provide OpenAI for all customers
      openaiService = OpenAIService.createFromEnv();
      enhancedErrorHandler = new EnhancedErrorHandler(openaiService);
      console.log('API endpoint - OpenAI service created successfully with system API key');
    } catch (error) {
      console.log('API endpoint - OpenAI service creation failed, using fallback logic');
      console.log('API endpoint - Error details:', error);
      useFallback = true;
    }
    
    console.log('API endpoint - useFallback:', useFallback);
    if (useFallback) {
      console.log('API endpoint - Using fallback logic');
      // Fallback: Simple intent detection without OpenAI
      const isApiCall = message.toLowerCase().includes('get') || 
                       message.toLowerCase().includes('post') || 
                       message.toLowerCase().includes('put') || 
                       message.toLowerCase().includes('delete') ||
                       message.toLowerCase().includes('pet') ||
                       message.toLowerCase().includes('api');
      
      if (isApiCall && connections.length > 0) {
        const connection = connections[0];
        
        // Determine the appropriate endpoint and method based on the message
        let method = 'GET';
        let url = '/pet/findByStatus'; // Default to findByStatus for GET requests
        let parameters = { status: 'available' }; // Default to available pets
        let requestBody = {};
        
        if (message.toLowerCase().includes('create') || message.toLowerCase().includes('add')) {
          method = 'POST';
          url = '/pet';
          // Try to extract JSON data from the message
          const jsonMatch = message.match(/\{.*\}/);
          if (jsonMatch) {
            try {
              requestBody = JSON.parse(jsonMatch[0]);
            } catch (e) {
              // If JSON parsing fails, create a basic pet object
              requestBody = {
                name: 'Test Pet',
                status: 'available'
              };
            }
          }
        } else if (message.toLowerCase().includes('update') || message.toLowerCase().includes('put')) {
          method = 'PUT';
          url = '/pet';
          // Try to extract JSON data from the message
          const jsonMatch = message.match(/\{.*\}/);
          if (jsonMatch) {
            try {
              requestBody = JSON.parse(jsonMatch[0]);
            } catch (e) {
              requestBody = {
                name: 'Updated Pet',
                status: 'available'
              };
            }
          }
        } else if (message.toLowerCase().includes('delete')) {
          method = 'DELETE';
          url = '/pet/123'; // Default pet ID
        } else if (message.toLowerCase().includes('status') || message.toLowerCase().includes('available') || message.toLowerCase().includes('sold') || message.toLowerCase().includes('pending')) {
          method = 'GET';
          url = '/pet/findByStatus';
          // Extract status from message
          if (message.toLowerCase().includes('available')) {
            parameters = { status: 'available' };
          } else if (message.toLowerCase().includes('sold')) {
            parameters = { status: 'sold' };
          } else if (message.toLowerCase().includes('pending')) {
            parameters = { status: 'pending' };
          } else {
            // Default to available if no specific status mentioned
            parameters = { status: 'available' };
          }
        } else if (message.toLowerCase().includes('id')) {
          method = 'GET';
          // Extract ID from message
          const idMatch = message.match(/id\s+(\d+)/i);
          if (idMatch) {
            url = `/pet/${idMatch[1]}`;
          } else {
            url = '/pet/123'; // Default ID
          }
        }
        
        const result = {
          success: true,
          data: {
            intent: 'api_call' as const,
            method,
            url,
            parameters,
            requestBody,
            headers: {},
            connectionId: connection.id,
            explanation: `I'll help you ${method} data from ${connection.name}`,
            suggestedAction: 'You can now use this data to create workflows or perform other operations',
            apiCallResult: undefined as any
          }
        };
        
        console.log('API endpoint - Fallback result:', result);
        
        // Execute the API call
        const apiCallResult = {
          method: result.data.method,
          url: result.data.url,
          parameters: result.data.parameters,
          requestBody: result.data.requestBody,
          headers: result.data.headers,
          connectionId: result.data.connectionId
        };

        const apiResult = await executeApiCall(apiCallResult, connections, user.id);
        console.log('API endpoint - API call result:', apiResult);

        if (!apiResult.success) {
          return res.status(500).json({
            success: false,
            error: `API call failed: ${apiResult.data?.error || 'Unknown error'}` 
          });
        }

        // Add the actual API call result to the response
        result.data.apiCallResult = {
          method: apiResult.data.method,
          url: apiResult.data.url,
          statusCode: apiResult.data.statusCode,
          responseData: apiResult.data.responseData,
          responseHeaders: apiResult.data.responseHeaders,
          executionTime: apiResult.data.executionTime,
          error: apiResult.data.error
        };

        console.log('API endpoint - Fallback API call completed, returning result');
        return res.status(200).json({ success: true, data: result.data });
      } else {
        return res.status(400).json({
          success: false,
          error: 'No API call intent detected and OpenAI service unavailable'
        });
      }
    } else {
      // Normal OpenAI flow
      console.log('API endpoint - Using OpenAI service for intent detection');
      if (!openaiService) {
        return res.status(500).json({
          success: false,
          error: 'OpenAI service not available'
        });
      }
      const result = await openaiService.executeDirectApiCall({
        message,
        availableConnections: connections,
        context: context?.previousResults || []
      });

      console.log('API endpoint - OpenAI service result:', result);

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      // If it's an API call, execute it
      if (result.data?.intent === 'api_call') {
        console.log('API endpoint - Processing API call intent');
        const data = result.data as any;
        
        // Create API call parameters from the result
        const apiCallResult = {
          method: data.method || 'GET',
          url: data.url || '/pet',
          parameters: data.parameters || {},
          requestBody: data.requestBody,
          headers: data.headers || {},
          connectionId: data.connectionId || connections[0]?.id
        };

        console.log('API endpoint - Executing API call with parameters:', apiCallResult);

        try {
          const apiResult = await executeApiCall(apiCallResult, connections, user.id);
          console.log('API endpoint - API call result:', apiResult);

          if (apiResult.success) {
            // Add the actual API call result to the response
            result.data.apiCallResult = {
              method: apiResult.data.method,
              url: apiResult.data.url,
              parameters: apiCallResult.parameters || {},
              requestBody: apiCallResult.requestBody,
              headers: apiCallResult.headers || {},
              connectionId: apiCallResult.connectionId,
              statusCode: apiResult.data.statusCode,
              responseData: apiResult.data.responseData,
              responseHeaders: apiResult.data.responseHeaders,
              executionTime: apiResult.data.executionTime,
              error: apiResult.data.error
            };
          } else {
            // Add error result
            result.data.apiCallResult = { 
              method: apiCallResult.method,
              url: apiCallResult.url,
              parameters: apiCallResult.parameters || {},
              requestBody: apiCallResult.requestBody,
              headers: apiCallResult.headers || {},
              connectionId: apiCallResult.connectionId,
              statusCode: 500,
              responseData: null,
              responseHeaders: {},
              executionTime: 0,
              error: apiResult.data?.error || 'API call failed'
            };
          }
        } catch (error) {
          console.log('API endpoint - API call execution error:', error);
          // Add error result
          result.data.apiCallResult = { 
            method: apiCallResult.method,
            url: apiCallResult.url,
            parameters: apiCallResult.parameters || {},
            requestBody: apiCallResult.requestBody,
            headers: apiCallResult.headers || {},
            connectionId: apiCallResult.connectionId,
            statusCode: 500,
            responseData: null,
            responseHeaders: {},
            executionTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      } else {
        console.log('API endpoint - No API call intent detected, result:', result.data);
      }

      console.log('API endpoint - Returning success response');
      return res.status(200).json({ success: true, data: result.data as any });
    }

  } catch (error) {
    console.error('=== API endpoint - Error in execute-direct API ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    logError('Direct API call failed', error as Error, { userId: req.user?.id });
    
    // Use enhanced error handling if available
    if (enhancedErrorHandler) {
      try {
        const enhancedError = await enhancedErrorHandler.handleApiError(
          error as Error,
          {
            endpoint: 'unknown',
            method: 'unknown',
            userMessage: message || 'Unknown error'
          }
        );
        
        return res.status(500).json(enhancedError);
      } catch (enhanceError) {
        console.error('Enhanced error handling failed:', enhanceError);
      }
    }
    
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default errorHandler(handler);