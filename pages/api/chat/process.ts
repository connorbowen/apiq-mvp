import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { ParallelAIService } from '../../../src/lib/services/parallelAIService';
import { ConnectionGuidanceOrchestrator } from '../../../src/lib/services/connectionGuidanceOrchestrator';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { prisma } from '../../../lib/database/client';
import { usageTrackingService } from '../../../src/lib/services/usageTrackingService';
import { UsageType } from '../../../src/generated/prisma';
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
  
  console.log('executeDirectApiCall - apiCallData:', apiCallData);
  console.log('executeDirectApiCall - connections:', connections.map(c => ({ id: c.id, name: c.name })));
  console.log('executeDirectApiCall - looking for connectionId:', apiCallData.connectionId);
  
  // Check usage limits before executing direct API call
  const canExecute = await usageTrackingService.canPerformAction(userId, 'direct_api_call');
  if (!canExecute.allowed) {
    console.log('executeDirectApiCall - Usage limit reached:', canExecute.reason);
    return {
      success: false,
      data: { 
        error: 'Direct API call limit reached',
        details: canExecute.reason,
        code: 'USAGE_LIMIT_REACHED'
      }
    };
  }
  
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
  
  try {
    
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

    // Track usage after successful API call
    await usageTrackingService.trackUsage(
      userId,
      UsageType.DIRECT_API_CALL,
      apiCallData.connectionId,
      'direct_api_call',
      {
        method: apiCallData.method,
        url: apiCallData.url,
        statusCode: response.status,
        executionTime,
        connectionName: connection.name
      }
    );

    return {
      success: true,
      data: {
        method: apiCallData.method,
        url: substitutedUrl, // Use the substituted URL instead of template
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
          url: substitutedUrl, // Use the substituted URL instead of template
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
          url: substitutedUrl, // Use the substituted URL instead of template
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
  console.log('🚀🚀🚀 CHAT PROCESS HANDLER CALLED - REQUEST RECEIVED 🚀🚀🚀');
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

    // Use optimized parallel AI service
    const parallelAIService = new ParallelAIService(process.env.OPENAI_API_KEY!);
    
    // Check if connection guidance is needed (regardless of whether connections exist)
    // Use centralized connection guidance orchestrator
    console.log('🔍 Process endpoint: Using centralized connection guidance orchestrator');
    const orchestrator = new ConnectionGuidanceOrchestrator();
    
    const guidanceResponse = await orchestrator.processMessage({
      message,
      availableConnections: connections.map(conn => ({ 
        name: conn.name, 
        id: conn.id,
        baseUrl: conn.baseUrl,
        endpoints: conn.endpoints.map(endpoint => ({
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary || ''
        }))
      })),
      userId: user.id,
      context: context
    });

    console.log('🔍 Process endpoint: Centralized guidance response:', guidanceResponse);
    console.log('🔍 Process endpoint: shouldProvideGuidance:', guidanceResponse.shouldProvideGuidance);
    console.log('🔍 Process endpoint: guidanceType:', guidanceResponse.guidanceType);

    // If guidance is needed, return it instead of processing
    if (guidanceResponse.shouldProvideGuidance) {
      console.log('→ Centralized guidance needed:', guidanceResponse.guidanceType);
      console.log('🔍 Process endpoint: Returning centralized guidance response');
      
      // Transform the API response to match frontend expectations
      const requiredApis = guidanceResponse.details?.requiredApis || [];
      console.log('🔍 Process endpoint: requiredApis from guidance:', JSON.stringify(requiredApis, null, 2));
      
      // If no APIs detected by the guidance system, try to detect them from the message
      let transformedMissingApis = requiredApis.map(api => ({
        name: api.name?.toLowerCase() || 'unknown',
        displayName: api.displayName || api.name || 'Unknown API',
        description: (api as any).reason || `Connect to ${api.displayName || api.name} to enable this functionality`,
        authType: api.authType || 'API_KEY',
        setupInstructions: {
          step1: `Get your ${api.displayName || api.name} API key`,
          step2: `Navigate to your ${api.displayName || api.name} dashboard`,
          step3: `Copy your API key and paste it below`,
          additionalNotes: (api as any).reason || `This API is required for your workflow`
        },
        documentationUrl: `https://docs.${api.name?.toLowerCase() || 'api'}.com`,
        baseUrl: api.baseUrl || `https://api.${api.name?.toLowerCase() || 'api'}.com`,
        commonEndpoints: (api as any).suggestedEndpoints || [`/api/v1/endpoint`]
      }));
      
      // Fallback: If no APIs were detected by the guidance system, try to detect them from the message
      if (transformedMissingApis.length === 0) {
        console.log('🔍 Process endpoint: No APIs detected by guidance system, trying fallback detection');
        const messageText = req.body.message.toLowerCase();
        
        // Simple API detection patterns
        const apiPatterns = [
          { name: 'slack', displayName: 'Slack', keywords: ['slack', 'message', 'notification', 'team', 'chat'] },
          { name: 'github', displayName: 'GitHub', keywords: ['github', 'repository', 'issue', 'pull request', 'commit'] },
          { name: 'google-drive', displayName: 'Google Drive', keywords: ['google drive', 'drive', 'file', 'document', 'sync'] },
          { name: 'stripe', displayName: 'Stripe', keywords: ['stripe', 'payment', 'billing', 'subscription'] },
          { name: 'openai', displayName: 'OpenAI', keywords: ['openai', 'gpt', 'ai', 'chatgpt'] },
          { name: 'airtable', displayName: 'Airtable', keywords: ['airtable', 'database', 'table', 'record'] },
          { name: 'notion', displayName: 'Notion', keywords: ['notion', 'page', 'database', 'block'] }
        ];
        
        for (const pattern of apiPatterns) {
          if (pattern.keywords.some(keyword => messageText.includes(keyword))) {
            transformedMissingApis.push({
              name: pattern.name,
              displayName: pattern.displayName,
              description: `Connect to ${pattern.displayName} to enable this functionality`,
              authType: pattern.name === 'slack' || pattern.name === 'github' || pattern.name === 'notion' ? 'BEARER_TOKEN' : 'API_KEY',
              setupInstructions: {
                step1: `Get your ${pattern.displayName} API key`,
                step2: `Navigate to your ${pattern.displayName} dashboard`,
                step3: `Copy your API key and paste it below`,
                additionalNotes: `This API is required for your workflow`
              },
              documentationUrl: `https://docs.${pattern.name}.com`,
              baseUrl: `https://api.${pattern.name}.com`,
              commonEndpoints: [`/api/v1/endpoint`]
            });
          }
        }
      }
      
      const responseData: ProcessMessageResponse = {
        success: true,
        data: {
          type: 'connection_guidance' as const,
          content: guidanceResponse.message,
          connectionGuidance: {
            requiresGuidance: true,
            missingApis: transformedMissingApis,
            suggestedConnections: transformedMissingApis,
            guidanceMessage: guidanceResponse.message,
            setupInstructions: transformedMissingApis[0]?.setupInstructions || {}
          }
        }
      };
      
      console.log('🔍 Process endpoint: Final response data being sent to frontend:', JSON.stringify(responseData, null, 2));
      console.log('🔍 Process endpoint: transformedMissingApis:', JSON.stringify(transformedMissingApis, null, 2));
      
      return res.status(200).json(responseData);
    } else {
      console.log('🔍 Process endpoint: No guidance needed, proceeding with normal processing');
    }

    // Process with parallel AI service
    console.log('🚀 Starting optimized parallel AI processing...');
    console.log('🔍 Process endpoint: About to call ParallelAIService.processWorkflowRequest');
    console.log('🔍 Process endpoint: Message:', message);
    console.log('🔍 Process endpoint: User ID:', user.id);
    console.log('🔍 Process endpoint: Connections count:', connections.length);
    console.log('🔍 Process endpoint: Context:', context);
    console.log('🔍 Process endpoint: Guidance response:', guidanceResponse);
    
    // Pass the guidance response to the AI service so it can use the suggested endpoints
    const result = await parallelAIService.processWorkflowRequest(message, user.id, connections, context, guidanceResponse);
    console.log('🔍 Process endpoint: ParallelAIService result:', result);
    
    console.log(`⚡ Processing completed in ${result.processingTime}ms`);
    
    if (result.success) {
      // If it's a direct API call, check if it needs to be executed
      if (result.data?.type === 'direct_api_call' && result.data?.apiCallResult) {
        // Check if the API call has already been executed (has statusCode and responseData)
        const apiCallResult = result.data.apiCallResult;
        if (!apiCallResult.statusCode && !apiCallResult.responseData) {
          console.log('🔧 Executing direct API call...');
          const apiResult = await executeDirectApiCall(apiCallResult, connections, user.id);
          
          if (apiResult.success) {
            // Update the result with actual API call execution
            result.data.apiCallResult = {
              method: apiResult.data.method,
              url: apiResult.data.url,
              statusCode: apiResult.data.statusCode,
              responseData: apiResult.data.responseData,
              responseHeaders: apiResult.data.responseHeaders,
              executionTime: apiResult.data.executionTime,
              error: apiResult.data.error,
              connectionId: apiCallResult.connectionId // Preserve the connectionId
            };
          } else {
            // Handle API execution error
            apiCallResult.error = apiResult.data?.error || 'API call failed';
          }
        } else {
          console.log('🔧 API call already executed, skipping execution');
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
    
    // Ensure response is not already sent
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  }
}

export default errorHandler(handler);
