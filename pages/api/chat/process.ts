import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { ParallelAIService } from '../../../src/lib/services/parallelAIService';
import { ConnectionGuidanceService } from '../../../src/lib/services/connectionGuidanceService';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { prisma } from '../../../lib/database/client';
import axios from 'axios';

interface ProcessMessageResponse {
  success: boolean;
  data?: {
    type: 'workflow' | 'direct_api_call' | 'connection_guidance' | 'general_chat';
    content: string;
    workflow?: any;
    steps?: any[];
    apiCallResult?: any;
    connectionGuidance?: any;
    suggestedAction?: string;
  };
  error?: string;
}

async function executeDirectApiCall(apiCallData: any, connections: any[], userId: string) {
  const startTime = Date.now();
  
  try {
    console.log('executeDirectApiCall - apiCallData:', apiCallData);
    console.log('executeDirectApiCall - connections:', connections.map(c => ({ id: c.id, name: c.name })));
    console.log('executeDirectApiCall - looking for connectionId:', apiCallData.connectionId);
    
    const connection = connections.find(conn => conn.id === apiCallData.connectionId);
    if (!connection) {
      console.log('executeDirectApiCall - Connection not found for ID:', apiCallData.connectionId);
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

    console.log('Executing API call', {
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

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ProcessMessageResponse>) {
  try {
    console.log('🔍 Process endpoint: Request received', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { message, context = [] } = req.body;
    console.log('🔍 Process endpoint: Received message:', message);
    console.log('🔍 Process endpoint: Received context:', context);
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const user = await requireAuth(req, res);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user's API connections
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

    console.log('🔍 [DEBUG] Connections found for workflow generation:', {
      connectionCount: connections.length,
      connections: connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        endpointCount: conn.endpoints.length,
        ingestionStatus: conn.ingestionStatus
      }))
    });

    // Use optimized parallel AI service
    const parallelAIService = new ParallelAIService(process.env.OPENAI_API_KEY!);
    
    // Check if connection guidance is needed (regardless of whether connections exist)
    console.log('🔍 Process endpoint: Checking connection guidance for message:', message);
    console.log('🔍 Process endpoint: Available connections:', connections.map(conn => ({ name: conn.name, id: conn.id })));
    
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
      console.error('🔍 Process endpoint: Connection guidance error:', error);
      // Continue with normal processing if guidance fails
      connectionGuidance = {
        requiresGuidance: false,
        missingApis: [],
        suggestedConnections: [],
        guidanceMessage: ''
      };
    }

    console.log('🔍 Process endpoint: Connection guidance result:', connectionGuidance);

    // If connection guidance is needed, return guidance instead of processing
    if (connectionGuidance.requiresGuidance) {
      console.log('→ Connection guidance needed for:', connectionGuidance.missingApis.map(api => api.displayName));
      console.log('🔍 Process endpoint: Returning connection guidance response');
      return res.status(200).json({
        success: true,
        data: {
          type: 'connection_guidance',
          content: connectionGuidance.guidanceMessage,
          connectionGuidance: connectionGuidance
        }
      });
    } else {
      console.log('🔍 Process endpoint: No connection guidance needed, proceeding with normal processing');
    }

    // Process with parallel AI service
    console.log('🚀 Starting optimized parallel AI processing...');
    console.log('🔍 Process endpoint: About to call ParallelAIService.processWorkflowRequest');
    console.log('🔍 Process endpoint: Message:', message);
    console.log('🔍 Process endpoint: User ID:', user.id);
    console.log('🔍 Process endpoint: Connections count:', connections.length);
    console.log('🔍 Process endpoint: Context:', context);
    const result = await parallelAIService.processWorkflowRequest(message, user.id, connections, context);
    console.log('🔍 Process endpoint: ParallelAIService result:', result);
    
    console.log(`⚡ Processing completed in ${result.processingTime}ms`);
    
    if (result.success) {
      // If it's a direct API call, execute it
      if (result.data?.type === 'direct_api_call' && result.data?.apiCallResult) {
        console.log('🔧 Executing direct API call...');
        const apiResult = await executeDirectApiCall(result.data.apiCallResult, connections, user.id);
        
        if (apiResult.success) {
          // Update the result with actual API call execution
          result.data.apiCallResult = {
            method: apiResult.data.method,
            url: apiResult.data.url,
            statusCode: apiResult.data.statusCode,
            responseData: apiResult.data.responseData,
            responseHeaders: apiResult.data.responseHeaders,
            executionTime: apiResult.data.executionTime,
            error: apiResult.data.error
          };
        } else {
          // Handle API execution error
          result.data.apiCallResult.error = apiResult.data?.error || 'API call failed';
        }
      }
      
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to process message'
      });
    }

  } catch (error) {
    console.error('AI Orchestrator error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
}

export default errorHandler(handler);
