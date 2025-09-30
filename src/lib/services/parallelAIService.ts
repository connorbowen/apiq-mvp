import { OpenAIService } from '../../services/openaiService';
import { HybridMessageClassificationService } from './hybridMessageClassificationService';
import { ConnectionGuidanceOrchestrator } from './connectionGuidanceOrchestrator';
import { OptimizedWorkflowService } from './optimizedWorkflowService';
import { AICacheService } from './aiCacheService';
import { PerformanceMonitor } from './performanceMonitor';
import { substituteUrlParameters, createSafeApiUrl } from '../utils/urlSubstitution';
import axios from 'axios';

/**
 * Parallel AI Service - Processes multiple AI operations simultaneously
 * to reduce total workflow generation time
 */
export class ParallelAIService {
  private openaiService: OpenAIService;
  private classificationService: HybridMessageClassificationService;
  // Removed ConnectionGuidanceService - using centralized orchestrator instead
  private workflowService: OptimizedWorkflowService;
  private cacheService: AICacheService;
  private performanceMonitor: PerformanceMonitor;

  constructor(apiKey: string) {
    this.openaiService = OpenAIService.createFromEnv();
    this.classificationService = new HybridMessageClassificationService(this.openaiService);
    // Removed ConnectionGuidanceService - using centralized orchestrator instead
    this.workflowService = new OptimizedWorkflowService(apiKey);
    this.cacheService = AICacheService.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * Process workflow request with parallel AI calls and caching
   */
  async processWorkflowRequest(
    message: string,
    userId: string,
    connections: any[],
    context: any[] = [],
    guidanceResponse?: any
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    processingTime?: number;
  }> {
    const startTime = Date.now();
    let classificationTime = 0;
    let connectionAnalysisTime = 0;
    let workflowGenerationTime = 0;
    
    try {
      console.log('🚀 Starting optimized parallel AI processing with caching...');

      // Check cache for workflow result first
      const cachedWorkflow = this.cacheService.getWorkflowResult(message, connections, context);
      if (cachedWorkflow) {
        console.log('🎯 Cache hit for workflow generation');
        this.performanceMonitor.recordRequest({
          duration: Date.now() - startTime,
          success: true,
          tokenUsage: 0, // Cached result
          breakdown: {
            classification: 0,
            connectionAnalysis: 0,
            workflowGeneration: 0
          }
        });
        
        return {
          success: true,
          data: cachedWorkflow,
          processingTime: Date.now() - startTime
        };
      }

      // Step 1: Parallel classification and connection analysis with caching
      const classificationStart = Date.now();
      console.log('🔍 Classifying message:', message);
      console.log('🔍 DEBUG: About to call classifyMessageWithCache for message:', message);
      const classification = await this.classifyMessageWithCache(message, connections);
      console.log('🔍 DEBUG: Classification completed for message:', message);
      console.log('🔍 DEBUG: Message classification result:', JSON.stringify(classification, null, 2));
      console.log('🔍 Classification result:', classification);
      classificationTime = Date.now() - classificationStart;

      const connectionStart = Date.now();
      const connectionGuidance = await this.analyzeConnectionsWithCentralizedOrchestrator(message, connections, userId, classification, context);
      connectionAnalysisTime = Date.now() - connectionStart;

      const parallelTime = Date.now() - startTime;
      console.log(`⚡ Parallel processing completed in ${parallelTime}ms`);

      // Step 2: Route based on results
      if (classification.type === 'connection_guidance') {
        // Handle direct connection guidance requests using centralized orchestrator
        console.log('🔍 ParallelAIService - Connection guidance classification detected');
        
        const orchestrator = new ConnectionGuidanceOrchestrator();
        const guidanceResponse = await orchestrator.processMessage({
          message,
          availableConnections: connections,
          userId,
          context: context
        });

        const result = {
          success: true,
          data: {
            type: 'connection_guidance',
            content: guidanceResponse.message,
            connectionGuidance: {
              requiresGuidance: guidanceResponse.shouldProvideGuidance,
              missingApis: guidanceResponse.details?.requiredApis || [],
              suggestedConnections: guidanceResponse.details?.requiredApis || [],
              guidanceMessage: guidanceResponse.message,
              setupInstructions: guidanceResponse.details?.requiredApis?.[0]?.setupInstructions || {}
            }
          },
          processingTime: Date.now() - startTime
        };

        this.performanceMonitor.recordRequest({
          duration: result.processingTime!,
          success: true,
          breakdown: {
            classification: classificationTime,
            connectionAnalysis: connectionAnalysisTime,
            workflowGeneration: 0
          }
        });

        return result;
      }

      if (classification.type === 'workflow') {
        if (connectionGuidance.requiresGuidance) {
          const result = {
            success: true,
            data: {
              type: 'connection_guidance',
              content: connectionGuidance.guidanceMessage,
              connectionGuidance: connectionGuidance
            },
            processingTime: Date.now() - startTime
          };

          this.performanceMonitor.recordRequest({
            duration: result.processingTime!,
            success: true,
            breakdown: {
              classification: classificationTime,
              connectionAnalysis: connectionAnalysisTime,
              workflowGeneration: 0
            }
          });

          return result;
        }

        // Generate workflow with optimized service
        const workflowStart = Date.now();
        const workflowResult = await this.workflowService.generateWorkflow({
          userDescription: message,
          userId,
          availableConnections: connections.map(conn => ({
            id: conn.id,
            name: conn.name,
            baseUrl: conn.baseUrl,
            endpoints: conn.endpoints.map((endpoint: any) => ({
              path: endpoint.path,
              method: endpoint.method,
              summary: endpoint.summary || '',
              parameters: Array.isArray(endpoint.parameters) ? endpoint.parameters : []
            }))
          })),
          context: '{}'
        });
        workflowGenerationTime = Date.now() - workflowStart;

        const result = {
          success: workflowResult.success,
          data: workflowResult.success ? {
            type: 'workflow',
            content: workflowResult.workflow?.explanation || 'Workflow generated successfully!',
            workflow: workflowResult.workflow,
            steps: workflowResult.workflow?.steps || []
          } : undefined,
          error: workflowResult.error,
          processingTime: Date.now() - startTime
        };

        // Cache successful workflow results
        if (workflowResult.success && workflowResult.workflow) {
          this.cacheService.setWorkflowResult(message, connections, result.data, undefined, context);
        }

        this.performanceMonitor.recordRequest({
          duration: result.processingTime!,
          success: workflowResult.success,
          error: workflowResult.error,
          breakdown: {
            classification: classificationTime,
            connectionAnalysis: connectionAnalysisTime,
            workflowGeneration: workflowGenerationTime
          }
        });

        return result;
      }

      // Handle other message types
      console.log('🔍 ParallelAIService: Checking classification type:', classification.type);
      console.log('🔍 ParallelAIService: Is DIRECT_API_CALL?', classification.type === 'direct_api_call' || classification.type === 'DIRECT_API_CALL');
      
      if (classification.type === 'direct_api_call' || classification.type === 'DIRECT_API_CALL') {
        console.log('🔍 ParallelAIService: Processing DIRECT_API_CALL for message:', message);
        // Generate direct API call parameters
        const directApiStart = Date.now();
        const directApiResult = await this.openaiService.executeDirectApiCall({
          message,
          availableConnections: connections.map(conn => ({
            id: conn.id,
            name: conn.name,
            baseUrl: conn.baseUrl,
            endpoints: conn.endpoints.map((endpoint: any) => ({
              path: endpoint.path,
              method: endpoint.method,
              summary: endpoint.summary || '',
              parameters: Array.isArray(endpoint.parameters) ? endpoint.parameters : []
            }))
          })),
          context: context,
          guidanceResponse: guidanceResponse
        });
        
        // If API call parameters were generated successfully, execute the actual API call
        let executedApiResult = null;
        console.log('🔍 ParallelAIService: Direct API result:', {
          success: directApiResult.success,
          intent: directApiResult.data?.intent,
          hasApiCallResult: !!directApiResult.data?.apiCallResult,
          apiCallResult: directApiResult.data?.apiCallResult
        });
        
        require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - ParallelAIService received: ${JSON.stringify(directApiResult, null, 2)}\n`);
        
        if (directApiResult.success && directApiResult.data?.intent === 'api_call' && directApiResult.data?.apiCallResult) {
          try {
            console.log('🔍 ParallelAIService: Executing API call with parameters:', directApiResult.data.apiCallResult);
            executedApiResult = await this.executeApiCall(directApiResult.data.apiCallResult, connections, userId);
            console.log('🔍 ParallelAIService: API call execution result:', executedApiResult);
          } catch (error) {
            console.error('Failed to execute API call:', error);
            executedApiResult = {
              success: false,
              data: { error: error instanceof Error ? error.message : 'API call execution failed' }
            };
          }
        } else {
          console.log('🔍 ParallelAIService: Skipping API call execution - conditions not met');
        }
        
        // Debug logging for URL substitution issue
        console.log('🔍 ParallelAIService: Creating result with executedApiResult:', {
          executedApiResultExists: !!executedApiResult,
          executedApiResultSuccess: executedApiResult?.success,
          executedApiResultUrl: executedApiResult?.data?.url,
          directApiResultUrl: directApiResult.data?.apiCallResult?.url,
          executedApiResultData: executedApiResult?.data,
          conditionMet: !!(executedApiResult && executedApiResult.data)
        });
        
        // Force output to console
        console.log('🔍 BROWSER DEBUG - executedApiResult exists:', !!executedApiResult);
        console.log('🔍 BROWSER DEBUG - executedApiResult.data exists:', !!executedApiResult?.data);
        console.log('🔍 BROWSER DEBUG - executedApiResult.data.url:', executedApiResult?.data?.url);
        console.log('🔍 BROWSER DEBUG - condition (executedApiResult && executedApiResult.data):', !!(executedApiResult && executedApiResult.data));
        console.log('🔍 BROWSER DEBUG - will use executedApiResult:', !!(executedApiResult && executedApiResult.data));
        
        // Force output to browser console
        if (typeof window !== 'undefined') {
          console.log('🔍 BROWSER DEBUG - executedApiResult:', executedApiResult);
          console.log('🔍 BROWSER DEBUG - condition met:', !!(executedApiResult && executedApiResult.data));
        }
        

        const result = {
          success: directApiResult.success,
          data: directApiResult.success ? {
            type: 'direct_api_call',
            content: directApiResult.data?.explanation || 'API call executed successfully!',
            apiCallResult: {
              method: executedApiResult?.data?.method || directApiResult.data?.apiCallResult?.method || 'GET',
              url: executedApiResult?.data?.url || directApiResult.data?.apiCallResult?.url || '/unknown', // Use the substituted URL from execution
              statusCode: executedApiResult?.data?.statusCode || 0,
              responseData: executedApiResult?.data?.responseData || null,
              responseHeaders: executedApiResult?.data?.responseHeaders || {},
              executionTime: executedApiResult?.data?.executionTime || 0,
              error: executedApiResult?.data?.error || null,
              connectionId: directApiResult.data?.apiCallResult?.connectionId, // Preserve connectionId
              parameters: directApiResult.data?.apiCallResult?.parameters // Preserve parameters
            },
            suggestedAction: directApiResult.data?.suggestedAction
          } : undefined,
          error: directApiResult.error,
          processingTime: Date.now() - startTime
        };
        
        // Debug logging for final result
        console.log('🔍 ParallelAIService: Final result construction:', {
          executedApiResultExists: !!executedApiResult,
          executedApiResultUrl: executedApiResult?.data?.url,
          finalResultUrl: result.data?.apiCallResult?.url,
          usingExecutedResult: !!(executedApiResult && executedApiResult.data)
        });

        // Debug logging for final result
        console.log('🔍 ParallelAIService: Final result apiCallResult.url:', result.data?.apiCallResult?.url);
        console.log('🔍 ParallelAIService: Using executedApiResult?', !!executedApiResult);
        console.log('🔍 ParallelAIService: executedApiResult.data.url:', executedApiResult?.data?.url);

        this.performanceMonitor.recordRequest({
          duration: result.processingTime!,
          success: directApiResult.success,
          error: directApiResult.error,
          breakdown: {
            classification: classificationTime,
            connectionAnalysis: connectionAnalysisTime,
            workflowGeneration: 0
          }
        });

        return result;
      }

      // Handle other message types (general_chat, etc.)
      console.log('🔍 ParallelAIService: No matching classification type, using fallback for type:', classification.type);
      const result = {
        success: true,
        data: {
          type: classification.type,
          content: this.getResponseForType(classification.type)
        },
        processingTime: Date.now() - startTime
      };

      this.performanceMonitor.recordRequest({
        duration: result.processingTime,
        success: true,
        breakdown: {
          classification: classificationTime,
          connectionAnalysis: connectionAnalysisTime,
          workflowGeneration: 0
        }
      });

      return result;

    } catch (error) {
      console.error('Parallel AI processing failed:', error);
      const result = {
        success: false,
        error: 'Failed to process request: ' + (error instanceof Error ? error.message : String(error)),
        processingTime: Date.now() - startTime
      };

      this.performanceMonitor.recordRequest({
        duration: result.processingTime!,
        success: false,
        error: result.error,
        breakdown: {
          classification: classificationTime,
          connectionAnalysis: connectionAnalysisTime,
          workflowGeneration: workflowGenerationTime
        }
      });

      return result;
    }
  }

  /**
   * Classify message with caching
   */
  private async classifyMessageWithCache(message: string, connections: any[] = []) {
    console.log('🔍 DEBUG: classifyMessageWithCache called for message:', message);
    // Check cache first
    const cached = this.cacheService.getClassificationResult(message);
    if (cached) {
      console.log('🎯 Cache hit for classification for message:', message);
      return cached;
    }
    console.log('🔍 DEBUG: No cache hit, proceeding with fresh classification for message:', message);

    try {
      const result = await Promise.race([
        this.classificationService.classifyMessage(message, {}, connections),
        this.timeoutPromise(30000, 'Classification timeout')
      ]);
      
      // Cache the result
      this.cacheService.setClassificationResult(message, result, 10 * 60 * 1000); // 10 minutes
      return result;
    } catch (error) {
      console.error('Classification failed:', error);
      // Fallback to rules-based classification
      const fallback = this.classificationService.applyRulesBasedFiltering(message);
      console.log('🔍 Using rules-based fallback classification:', fallback);
      
      // Cache fallback result for shorter time
      this.cacheService.setClassificationResult(message, fallback, 2 * 60 * 1000); // 2 minutes
      return fallback;
    }
  }

  /**
   * Analyze connections using centralized orchestrator
   */
  private async analyzeConnectionsWithCentralizedOrchestrator(message: string, connections: any[], userId: string, classification: any, context?: any[]) {
    // Check cache first
    const cached = this.cacheService.getConnectionAnalysisResult(message, connections, context);
    if (cached) {
      console.log('🎯 Cache hit for connection analysis');
      return cached;
    }

    try {
      // Fast path for direct API calls - bypass complex orchestration
      if (classification.type === 'direct_api_call' && connections.length > 0) {
        console.log('🔍 ParallelAIService - Using fast path for direct API call');
        console.log('🔍 ParallelAIService - Message:', message);
        console.log('🔍 ParallelAIService - Connections:', connections.length);
        
        // Use the first available connection for direct API calls
        const connection = connections[0];
        console.log('🔍 ParallelAIService - Using connection:', connection.name);
        
        // Create a simplified result for direct API calls
        const result = {
          shouldProvideGuidance: false,
          guidanceType: 'none',
          message: 'You have all the necessary connections. You can proceed with your request.',
          details: {
            requiredApis: [],
            suggestedWorkflow: 'Proceed with your workflow',
            userIntent: message
          }
        };
        
        console.log('🔍 ParallelAIService - Fast path result:', JSON.stringify(result, null, 2));
        
        // Convert to legacy format for compatibility
        const legacyResult = {
          requiresGuidance: result.shouldProvideGuidance,
          missingApis: result.details?.requiredApis || [],
          suggestedConnections: result.details?.requiredApis || [],
          guidanceMessage: result.message
        };
        
        // Cache the result with context to avoid stale results
        this.cacheService.setConnectionAnalysisResult(message, connections, legacyResult, 10 * 60 * 1000, context);
        console.log('🔍 ParallelAIService - Fast path result cached');
        
        return legacyResult;
      }
      
      console.log('🔍 ParallelAIService - Using centralized orchestrator');
      console.log('🔍 ParallelAIService - Message:', message);
      console.log('🔍 ParallelAIService - Connections:', connections.length);
      
      const orchestrator = new ConnectionGuidanceOrchestrator();
      const result = await Promise.race([
        orchestrator.processMessage({
          message,
          availableConnections: connections,
          userId,
          context: {}
        }),
        this.timeoutPromise(30000, 'Connection analysis timeout')
      ]);
      
      console.log('🔍 ParallelAIService - Centralized orchestrator result:', JSON.stringify(result, null, 2));
      
      // Convert to legacy format for compatibility
      const legacyResult = {
        requiresGuidance: result.shouldProvideGuidance,
        missingApis: result.details?.requiredApis || [],
        suggestedConnections: result.details?.requiredApis || [],
        guidanceMessage: result.message
      };
      
      // Cache the result
      this.cacheService.setConnectionAnalysisResult(message, connections, legacyResult, 10 * 60 * 1000); // 10 minutes
      return legacyResult;
    } catch (error) {
      console.error('Centralized connection analysis failed:', error);
      // Fallback to basic guidance
      const fallback = {
        requiresGuidance: false,
        missingApis: [],
        suggestedConnections: [],
        guidanceMessage: ''
      };
      
      // Cache fallback result for shorter time
      this.cacheService.setConnectionAnalysisResult(message, connections, fallback, 2 * 60 * 1000); // 2 minutes
      return fallback;
    }
  }

  /**
   * Analyze connections with caching (legacy method)
   */
  private async analyzeConnectionsWithCache(message: string, connections: any[]) {
    // Check cache first
    const cached = this.cacheService.getConnectionAnalysisResult(message, connections);
    if (cached) {
      console.log('🎯 Cache hit for connection analysis');
      return cached;
    }

    try {
      console.log('🔍 ParallelAIService - Calling ConnectionGuidanceService.analyzeRequest');
      console.log('🔍 ParallelAIService - Message:', message);
      console.log('🔍 ParallelAIService - Connections:', connections.length);
      
      // Legacy method - return fallback since we're using centralized orchestrator
      const result = {
        requiresGuidance: false,
        missingApis: [],
        suggestedConnections: [],
        guidanceMessage: ''
      };
      
      console.log('🔍 ParallelAIService - ConnectionGuidanceService result:', JSON.stringify(result, null, 2));
      
      // Cache the result
      this.cacheService.setConnectionAnalysisResult(message, connections, result, 10 * 60 * 1000); // 10 minutes
      return result;
    } catch (error) {
      console.error('Connection analysis failed:', error);
      // Fallback - assume guidance not needed
      const fallback = {
        requiresGuidance: false,
        missingApis: [],
        suggestedConnections: [],
        guidanceMessage: ''
      };
      
      // Cache fallback result for shorter time
      this.cacheService.setConnectionAnalysisResult(message, connections, fallback, 2 * 60 * 1000); // 2 minutes
      return fallback;
    }
  }

  /**
   * Get response content for different message types
   */
  private getResponseForType(type: string): string {
    switch (type) {
      case 'direct_api_call':
        return 'Direct API calls are not yet implemented. Please use workflow creation instead.';
      case 'connection_guidance':
        return 'I can help you set up API connections. Please go to the Connections tab to add new integrations.';
      default:
        return "I'm here to help you with API automation and workflow creation. You can ask me to create workflows, execute API calls, or help you connect to different services.";
    }
  }

  /**
   * Create a timeout promise
   */
  private timeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Execute an actual API call using the generated parameters
   */
  private async executeApiCall(apiCallData: any, connections: any[], userId: string) {
    const startTime = Date.now();
    
    console.log('🔍 executeApiCall - DEBUGGING CONNECTION LOOKUP:');
    console.log('🔍 executeApiCall - apiCallData:', JSON.stringify(apiCallData, null, 2));
    console.log('🔍 executeApiCall - available connections:', connections.map(c => ({ id: c.id, name: c.name, baseUrl: c.baseUrl })));
    console.log('🔍 executeApiCall - looking for connectionId:', apiCallData.connectionId);
    console.log('🔍 executeApiCall - userId:', userId);
    
    // Write debug info to file for E2E debugging
    require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - executeApiCall - connectionId: ${apiCallData.connectionId}, available: ${connections.map(c => c.id).join(',')}\n`);
    
    // Try to find connection by ID first
    let connection = connections.find(conn => conn.id === apiCallData.connectionId);
    
    // If not found by ID, try to find by name (fallback)
    if (!connection && apiCallData.connectionName) {
      connection = connections.find(conn => conn.name === apiCallData.connectionName);
      console.log('🔍 executeApiCall - Trying to find by name:', apiCallData.connectionName);
    }
    
    // If still not found, try to find the first available connection (last resort)
    if (!connection && connections.length > 0) {
      connection = connections[0];
      console.log('🔍 executeApiCall - Using first available connection as fallback:', connection.id);
    }
    
    if (!connection) {
      console.log('🔍 executeApiCall - ❌ Connection NOT FOUND for ID:', apiCallData.connectionId);
      console.log('🔍 executeApiCall - Available connection IDs:', connections.map(c => c.id));
      require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - CONNECTION NOT FOUND ERROR\n`);
      return {
        success: false,
        data: { error: 'Connection not found' }
      };
    }
    
    console.log('🔍 executeApiCall - ✅ Connection FOUND:', { id: connection.id, name: connection.name, baseUrl: connection.baseUrl });
    require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - Connection FOUND: ${connection.id}, baseUrl: ${connection.baseUrl}\n`);
    
    // Substitute path parameters in the URL using robust utility
    const urlSubstitutionResult = substituteUrlParameters({
      url: apiCallData.url,
      parameters: apiCallData.parameters || {},
      debug: true
    });
    
    const substitutedUrl = urlSubstitutionResult.substitutedUrl;
    
    console.log('🔍 executeApiCall - URL substitution result:', {
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
      console.error('🔍 executeApiCall - URL substitution validation failed:', safeUrlResult.errors);
      return {
        success: false,
        data: { 
          error: `URL substitution failed: ${safeUrlResult.errors.join(', ')}`,
          url: apiCallData.url,
          parameters: apiCallData.parameters
        }
      };
    }
    
    // Build URL with query parameters for GET requests
    const fullUrl = `${connection.baseUrl}${substitutedUrl}`;
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

    try {
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
      
      require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - Making API call to: ${fullUrl}\n`);

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
            method: apiCallData.method || 'GET',
            url: requestUrl, // Use the full URL with query parameters
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

      return {
        success: true,
        data: {
          method: apiCallData.method || 'GET', // Default to GET if method is undefined
          url: requestUrl, // Use the full URL with query parameters
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
        require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - API returned error: ${error.response.status} ${error.response.statusText}\n`);
        require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - Error response data: ${JSON.stringify(error.response.data)}\n`);
        
        return {
          success: true, // Still successful from our perspective
          data: {
            method: apiCallData.method || 'GET', // Default to GET if method is undefined
            url: requestUrl, // Use the full URL with query parameters
            statusCode: error.response.status,
            responseData: error.response.data,
            responseHeaders: error.response.headers as Record<string, string>,
            executionTime,
            error: `API Error: ${error.response.status} ${error.response.statusText}`
          }
        };
      } else {
        // Network or other error
        require('fs').appendFileSync('/tmp/e2e-debug.log', `${new Date().toISOString()} - Network/other error: ${error.message}\n`);
        
        return {
          success: false,
          data: {
            method: apiCallData.method || 'GET', // Default to GET if method is undefined
            url: requestUrl, // Use the full URL with query parameters
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

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      cacheSize: this.workflowService['systemPromptCache']?.size || 0,
      // Add more metrics as needed
    };
  }
}
