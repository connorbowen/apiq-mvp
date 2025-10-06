import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { ParallelAIService } from '../../../src/lib/services/parallelAIService';
import { ConnectionGuidanceOrchestrator } from '../../../src/lib/services/connectionGuidanceOrchestrator';
import { HybridMessageClassificationService } from '../../../src/lib/services/hybridMessageClassificationService';
import { AIApiDetectionService } from '../../../src/lib/services/aiApiDetectionService';
import { IntentAnalysisService } from '../../../src/lib/services/intentAnalysisService';
import { OpenAIService } from '../../../src/services/openaiService';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { prisma } from '../../../lib/database/client';
import { usageTrackingService } from '../../../src/lib/services/usageTrackingService';
import { UsageType } from '../../../src/generated/prisma';
import { substituteUrlParameters, createSafeApiUrl } from '../../../src/lib/utils/urlSubstitution';
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
    confidenceConfirmation?: {
      confidence: number;
      uncertaintyType: 'parameter' | 'connection' | 'data_mapping' | 'intent' | 'endpoint' | 'general';
      explanation: string;
      suggestions: Array<{
        option: string;
        description: string;
        confidence: number;
      }>;
      originalResponse: string;
    };
  };
  error?: string;
}

/**
 * Check confidence scores from all AI services and generate confidence confirmation if needed
 */
async function checkConfidenceAndGenerateConfirmation(
  message: string,
  connections: any[],
  userId: string,
  context: any[]
): Promise<ProcessMessageResponse['data'] | null> {
  const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.6');
  
  try {
    console.log('🔍 Checking confidence scores from all AI services...');
    console.log('🔍 Input parameters:', { message, connectionsCount: connections.length, userId, contextLength: context.length });
    
    // Initialize AI services
    console.log('🔍 Initializing AI services...');
    const openaiService = OpenAIService.createFromEnv();
    const classificationService = new HybridMessageClassificationService(openaiService);
    const apiDetectionService = new AIApiDetectionService(openaiService);
    const intentAnalysisService = new IntentAnalysisService(openaiService);
    console.log('🔍 AI services initialized successfully');
    
    // Run all AI services in parallel to get confidence scores
    const [classificationResult, apiDetectionResult, intentResult] = await Promise.allSettled([
      classificationService.classifyMessage(message, context, connections),
      apiDetectionService.analyzeUserRequest(message, connections),
      intentAnalysisService.analyzeIntent({
        userMessage: message,
        availableConnections: connections.map(conn => ({
          id: conn.id,
          name: conn.name,
          baseUrl: conn.baseUrl,
          endpoints: conn.endpoints?.map((ep: any) => ({
            path: ep.path,
            method: ep.method,
            summary: ep.summary || ''
          })) || []
        })),
        context
      })
    ]);

    // Handle failed AI service calls
    const classification = classificationResult.status === 'fulfilled' ? classificationResult.value : { confidence: 0.5, type: 'general_chat' };
    const apiDetection = apiDetectionResult.status === 'fulfilled' ? apiDetectionResult.value : { requiredApis: [], confidence: 0.5 };
    const intent = intentResult.status === 'fulfilled' ? intentResult.value : { intent: { confidence: 0.5, guidanceType: 'general' } };

    if (classificationResult.status === 'rejected') {
      console.error('🔍 Classification service failed:', classificationResult.reason);
    }
    if (apiDetectionResult.status === 'rejected') {
      console.error('🔍 API detection service failed:', apiDetectionResult.reason);
    }
    if (intentResult.status === 'rejected') {
      console.error('🔍 Intent analysis service failed:', intentResult.reason);
    }
    
    console.log('🔍 AI Service Results:', {
      classification: { confidence: classification.confidence, type: classification.type },
      apiDetection: { confidence: apiDetection.requiredApis?.map(a => a.confidence) || [] },
      intent: { confidence: intent.intent?.confidence || 0, guidanceType: intent.intent?.guidanceType }
    });
    
    // Check for low confidence in any service
    const lowConfidenceIssues = [];
    
    // Check message classification confidence
    console.log('🔍 Checking classification confidence:', classification.confidence, 'vs threshold:', CONFIDENCE_THRESHOLD);
    if (classification.confidence < CONFIDENCE_THRESHOLD) {
      console.log('🔍 Low confidence detected in classification, adding to issues');
      lowConfidenceIssues.push({
        type: 'intent' as const,
        confidence: classification.confidence,
        message: `I'm not sure if you want a ${classification.type} or something else.`,
        suggestions: [
          { option: 'Create a workflow', description: 'Set up an automated process', confidence: 0.6 },
          { option: 'Make a direct API call', description: 'Execute a single API operation', confidence: 0.5 },
          { option: 'Get help with connections', description: 'Set up or manage API connections', confidence: 0.7 }
        ]
      });
    }
    
    // Check API detection confidence with special logic for different guidance types
    if (apiDetection.requiredApis && apiDetection.requiredApis.length > 0) {
      const guidanceType = intent.intent?.guidanceType;
      
      // Use single threshold but different logic based on guidance type
      const lowConfidenceApis = apiDetection.requiredApis.filter(api => api.confidence < CONFIDENCE_THRESHOLD);
      
      console.log('🔍 API detection - Guidance type:', guidanceType);
      console.log('🔍 API detection - API confidences:', apiDetection.requiredApis.map(api => ({ name: api.name, confidence: api.confidence })));
      console.log('🔍 API detection - Threshold:', CONFIDENCE_THRESHOLD);
      console.log('🔍 API detection - Low confidence APIs:', lowConfidenceApis.length);
      
      if (guidanceType === 'connection_setup') {
        // For connection setup: only check confidence if we're truly uncertain about which connections to set up
        // Skip confidence check if we have reasonable confidence about the connections needed
        const hasReasonableConfidence = apiDetection.requiredApis.some(api => api.confidence >= 0.8);
        
        if (lowConfidenceApis.length > 0 && !hasReasonableConfidence) {
          console.log('🔍 Low confidence detected for connection setup, generating confirmation');
          lowConfidenceIssues.push({
            type: 'connection' as const,
            confidence: Math.min(...lowConfidenceApis.map(api => api.confidence)),
            message: `I'm not sure which APIs you need to set up for this request.`,
            suggestions: lowConfidenceApis.map(api => ({
              option: api.displayName || api.name,
              description: api.reason || `Set up ${api.displayName || api.name} connection`,
              confidence: api.confidence
            }))
          });
        } else {
          console.log('🔍 High confidence for connection setup, proceeding with guidance');
        }
        
      } else if (guidanceType === 'api_specific') {
        // For API-specific guidance: check confidence normally
        if (lowConfidenceApis.length > 0) {
          console.log('🔍 Low confidence detected for API-specific guidance, generating confirmation');
          lowConfidenceIssues.push({
            type: 'connection' as const,
            confidence: Math.min(...lowConfidenceApis.map(api => api.confidence)),
            message: `I'm not sure which specific APIs you need help with for this request.`,
            suggestions: lowConfidenceApis.map(api => ({
              option: api.displayName || api.name,
              description: api.reason || `Get help with ${api.displayName || api.name} API`,
              confidence: api.confidence
            }))
          });
        } else {
          console.log('🔍 High confidence for API-specific guidance, proceeding with guidance');
        }
        
      } else if (guidanceType === 'none') {
        // For direct API calls and workflows: only check confidence if we're truly uncertain
        // Skip confidence check if we have reasonable confidence about the APIs needed
        const hasReasonableConfidence = apiDetection.requiredApis.some(api => api.confidence >= 0.8);
        
        if (lowConfidenceApis.length > 0 && !hasReasonableConfidence) {
          console.log('🔍 Low confidence detected for direct API/workflow, generating confirmation');
          lowConfidenceIssues.push({
            type: 'connection' as const,
            confidence: Math.min(...lowConfidenceApis.map(api => api.confidence)),
            message: `I'm not sure which APIs you need for this request.`,
            suggestions: lowConfidenceApis.map(api => ({
              option: api.displayName || api.name,
              description: api.reason || `Use ${api.displayName || api.name} API`,
              confidence: api.confidence
            }))
          });
        } else {
          console.log('🔍 High confidence for direct API/workflow, proceeding with execution');
        }
        
      } else {
        // For general guidance and other types: check confidence normally
        if (lowConfidenceApis.length > 0) {
          console.log('🔍 Low confidence detected for general guidance, generating confirmation');
          lowConfidenceIssues.push({
            type: 'connection' as const,
            confidence: Math.min(...lowConfidenceApis.map(api => api.confidence)),
            message: `I'm not sure which APIs you need for this request.`,
            suggestions: lowConfidenceApis.map(api => ({
              option: api.displayName || api.name,
              description: api.reason || `Connect to ${api.displayName || api.name}`,
              confidence: api.confidence
            }))
          });
        } else {
          console.log('🔍 High confidence for general guidance, proceeding with guidance');
        }
      }
    }
    
    // Check intent analysis confidence with special logic for different guidance types
    if (intent.intent && intent.intent.confidence < CONFIDENCE_THRESHOLD) {
      const guidanceType = intent.intent.guidanceType;
      
      console.log('🔍 Intent analysis - Guidance type:', guidanceType);
      console.log('🔍 Intent analysis - Confidence:', intent.intent.confidence);
      console.log('🔍 Intent analysis - Threshold:', CONFIDENCE_THRESHOLD);
      
      if (guidanceType === 'connection_setup') {
        // For connection setup: only check confidence if we're truly uncertain about the intent
        // Skip confidence check if we have reasonable confidence about the intent
        const hasReasonableIntentConfidence = intent.intent.confidence >= 0.8;
        
        if (!hasReasonableIntentConfidence) {
          console.log('🔍 Low confidence detected for connection setup intent, generating confirmation');
          lowConfidenceIssues.push({
            type: 'intent' as const,
            confidence: intent.intent.confidence,
            message: `I'm not sure what connections you need to set up.`,
            suggestions: [
              { option: 'GitHub', description: 'Set up GitHub API connection', confidence: 0.8 },
              { option: 'Slack', description: 'Set up Slack API connection', confidence: 0.8 },
              { option: 'Email', description: 'Set up email service connection', confidence: 0.7 },
              { option: 'Other', description: 'Tell me what API you need', confidence: 0.5 }
            ]
          });
        } else {
          console.log('🔍 High confidence for connection setup intent, proceeding with guidance');
        }
        
      } else if (guidanceType === 'api_specific') {
        // For API-specific guidance: check confidence normally
        console.log('🔍 Low confidence detected for API-specific intent, generating confirmation');
        lowConfidenceIssues.push({
          type: 'intent' as const,
          confidence: intent.intent.confidence,
          message: `I'm not sure which specific API you need help with.`,
          suggestions: [
            { option: 'GitHub API', description: 'Get help with GitHub API usage', confidence: 0.8 },
            { option: 'Slack API', description: 'Get help with Slack API usage', confidence: 0.8 },
            { option: 'Other API', description: 'Tell me which API you need help with', confidence: 0.5 }
          ]
        });
        
      } else if (guidanceType === 'none') {
        // For direct API calls and workflows: check confidence normally
        console.log('🔍 Low confidence detected for direct API/workflow intent, generating confirmation');
        lowConfidenceIssues.push({
          type: 'intent' as const,
          confidence: intent.intent.confidence,
          message: `I'm not entirely sure what you want to accomplish.`,
          suggestions: [
            { option: 'Create a workflow', description: 'Set up an automated process', confidence: 0.6 },
            { option: 'Make a direct API call', description: 'Execute a single API operation', confidence: 0.5 },
            { option: 'Get help with connections', description: 'Set up or manage API connections', confidence: 0.7 }
          ]
        });
        
      } else {
        // For general guidance and other types: check confidence normally
        console.log('🔍 Low confidence detected for general intent, generating confirmation');
        lowConfidenceIssues.push({
          type: 'intent' as const,
          confidence: intent.intent.confidence,
          message: `I'm not entirely sure what you're trying to accomplish.`,
          suggestions: [
            { option: 'Set up API connections', description: 'Connect to external services', confidence: 0.6 },
            { option: 'Create a workflow', description: 'Automate a process', confidence: 0.5 },
            { option: 'Make a direct API call', description: 'Execute a single operation', confidence: 0.4 },
            { option: 'Get general help', description: 'Learn about available features', confidence: 0.7 }
          ]
        });
      }
    }
    
    // If we have low confidence issues, return the most significant one
    if (lowConfidenceIssues.length > 0) {
      // Sort by confidence (lowest first) and take the most uncertain
      const primaryIssue = lowConfidenceIssues.sort((a, b) => a.confidence - b.confidence)[0];
      
      console.log('🔍 Low confidence detected, generating confirmation:', primaryIssue);
      
      return {
        type: 'general_chat',
        content: `I'd like to help you, but I need some clarification.`,
        confidenceConfirmation: {
          confidence: primaryIssue.confidence,
          uncertaintyType: primaryIssue.type,
          explanation: primaryIssue.message,
          suggestions: primaryIssue.suggestions,
          originalResponse: `I'll help you with your request once I understand exactly what you need.`
        }
      };
    }
    
    return null; // No confidence issues, proceed normally
    
  } catch (error) {
    console.error('🔍 Error checking confidence scores:', error);
    return null; // If confidence checking fails, proceed normally
  }
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
  
  // Substitute path parameters in the URL using robust utility
  const urlSubstitutionResult = substituteUrlParameters({
    url: apiCallData.url,
    parameters: apiCallData.parameters || {},
    debug: true
  });
  
  const substitutedUrl = urlSubstitutionResult.substitutedUrl;
  
  console.log('🔍 executeDirectApiCall - URL substitution result:', {
    originalUrl: apiCallData.url,
    substitutedUrl,
    substitutions: urlSubstitutionResult.substitutions,
    hasUnsubstitutedParams: urlSubstitutionResult.hasUnsubstitutedParams
  });
  
  // Validate the URL is safe to use
  const safeUrlResult = createSafeApiUrl({
    url: apiCallData.url,
    parameters: apiCallData.parameters || {},
    debug: true
  });
  
  if (!safeUrlResult.isValid) {
    console.error('🔍 executeDirectApiCall - URL substitution validation failed:', safeUrlResult.errors);
    return {
      success: false,
      data: { 
        error: `URL substitution failed: ${safeUrlResult.errors.join(', ')}`,
        url: apiCallData.url,
        parameters: apiCallData.parameters
      }
    };
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
    
    console.log('Executing API call', {
      method: apiCallData.method,
      originalUrl: apiCallData.url,
      substitutedUrl: substitutedUrl,
      fullUrl: fullUrl,
      parameters: apiCallData.parameters,
      connectionId: apiCallData.connectionId,
      userId
    });

    // Use fetch instead of axios to match workflow implementation
    // Build URL with query parameters for GET requests
    let requestUrl = fullUrl;
    if (apiCallData.parameters && Object.keys(apiCallData.parameters).length > 0) {
      const urlParams = new URLSearchParams();
      Object.entries(apiCallData.parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, String(value));
        }
      });
      requestUrl = `${fullUrl}?${urlParams.toString()}`;
    }

    const fetchResponse = await fetch(requestUrl, {
      method: apiCallData.method || 'GET',
      headers,
      body: apiCallData.requestBody ? JSON.stringify(apiCallData.requestBody) : undefined
    });

    if (!fetchResponse.ok) {
      // Handle HTTP error responses (4xx, 5xx) but still return the substituted URL
      const responseData = await fetchResponse.text().catch(() => null);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true, // Still successful from our perspective (we got a response)
        data: {
          method: apiCallData.method,
          url: substitutedUrl, // Use the substituted URL instead of template
          statusCode: fetchResponse.status,
          responseData: responseData,
          responseHeaders: Object.fromEntries(fetchResponse.headers.entries()),
          executionTime,
          error: `API call failed: ${fetchResponse.status} ${fetchResponse.statusText}`
        }
      };
    }

    const responseData = await fetchResponse.json();
    
    // Convert fetch response to axios-like format for compatibility
    response = {
      status: fetchResponse.status,
      data: responseData,
      headers: Object.fromEntries(fetchResponse.headers.entries())
    };
    
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

    // Check confidence scores from all AI services first
    console.log('🔍 Process endpoint: Checking confidence scores...');
    try {
      console.log('🔍 Process endpoint: About to call checkConfidenceAndGenerateConfirmation');
      const confidenceResult = await checkConfidenceAndGenerateConfirmation(message, connections, user.id, context);
      console.log('🔍 Process endpoint: Confidence check result:', confidenceResult);
      console.log('🔍 Process endpoint: Confidence check result type:', typeof confidenceResult);
      
      if (confidenceResult) {
        console.log('🔍 Process endpoint: Low confidence detected, returning confirmation');
        return res.status(200).json({
          success: true,
          data: confidenceResult
        });
      }
    } catch (error) {
      console.error('🔍 Process endpoint: Error in confidence checking:', error);
      console.error('🔍 Process endpoint: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }

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
      console.log('🔍 Process endpoint: About to call ParallelAIService.processWorkflowRequest');
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
    
    // DEBUG: Log the specific apiCallResult details
    if (result.data?.apiCallResult) {
      console.log('🔍 Process endpoint: apiCallResult details:', {
        method: result.data.apiCallResult.method,
        url: result.data.apiCallResult.url,
        statusCode: result.data.apiCallResult.statusCode,
        hasResponseData: !!result.data.apiCallResult.responseData,
        responseDataLength: result.data.apiCallResult.responseData?.length || 0,
        parameters: result.data.apiCallResult.parameters
      });
    }
    
    console.log(`⚡ Processing completed in ${result.processingTime}ms`);
    
    if (result.success) {
      // If it's a direct API call, check if it needs to be executed
      if (result.data?.type === 'direct_api_call' && result.data?.apiCallResult) {
        // Check if the API call has already been executed (has statusCode and responseData)
        const apiCallResult = result.data.apiCallResult;
        console.log('🔍 Process endpoint: Checking apiCallResult for execution:', {
          hasStatusCode: !!apiCallResult.statusCode,
          hasResponseData: !!apiCallResult.responseData,
          statusCode: apiCallResult.statusCode,
          responseData: apiCallResult.responseData,
          shouldExecute: !apiCallResult.statusCode && !apiCallResult.responseData
        });
        
        // Skip execution if the API call has already been executed by parallelAIService
        if (!apiCallResult.statusCode && !apiCallResult.responseData) {
          console.log('🔧 Executing direct API call...');
          const apiResult = await executeDirectApiCall(apiCallResult, connections, user.id);
          
          // Update the result with actual API call execution regardless of success/failure
          // Debug logging for URL substitution issue
          console.log('🔍 ExecuteDirectApiCall: Updating apiCallResult:', {
            originalUrl: apiCallResult.url,
            substitutedUrl: apiResult.data.url,
            apiResultSuccess: apiResult.success
          });

          // Substitute URL manually if executeDirectApiCall failed
          let substitutedUrl = apiResult.data.url;
          if (!substitutedUrl && apiCallResult.parameters) {
            substitutedUrl = apiCallResult.url.replace(/\{(\w+)\}/g, (match: string, paramName: string) => 
              apiCallResult.parameters[paramName] || match
            );
          }

          result.data.apiCallResult = {
            method: apiResult.data.method || apiCallResult.method,
            url: substitutedUrl || apiCallResult.url, // Use substituted URL or fallback to original
            statusCode: apiResult.data.statusCode || 0,
            responseData: apiResult.data.responseData || null,
            responseHeaders: apiResult.data.responseHeaders || {},
            executionTime: apiResult.data.executionTime || 0,
            error: apiResult.data.error || 'API call execution failed',
            connectionId: apiCallResult.connectionId, // Preserve the connectionId
            parameters: apiCallResult.parameters // Preserve the parameters
          };

          // Debug logging for final result
          console.log('🔍 ExecuteDirectApiCall: Updated apiCallResult.url:', result.data.apiCallResult.url);
          
          // Debug log to verify the URL is correct
          console.log('🔍 Process endpoint: Updated apiCallResult with substituted URL:', {
            originalUrl: apiCallResult.url,
            substitutedUrl: apiResult.data.url,
            finalUrl: result.data.apiCallResult.url
          });
        } else {
          console.log('🔧 API call already executed by parallelAIService, skipping execution');
          console.log('🔍 Process endpoint: API call result from parallelAIService:', {
            method: apiCallResult.method,
            url: apiCallResult.url,
            statusCode: apiCallResult.statusCode,
            hasResponseData: !!apiCallResult.responseData,
            executionTime: apiCallResult.executionTime
          });
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
