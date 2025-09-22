import getOpenAIClient from '../lib/openaiWrapper';
import axios from 'axios';
import { logError, logInfo, logDebug } from '../utils/logger';
import { ParameterExtractionService } from '../lib/services/parameterExtractionService';
import { AIParameterExtractionService } from '../lib/services/aiParameterExtractionService';
import { 
  WorkflowGenerationRequest, 
  WorkflowGenerationResponse, 
  WorkflowStep, 
  ApiConnection,
  Workflow 
} from '../types';
import { secretsVault } from '../lib/secrets/secretsVault';

/**
 * OpenAI service for AI-powered workflow generation and execution
 * Uses function calling to generate and execute multi-step API workflows
 */

export class OpenAIService {
  private client: any;
  private model: string;
  private apiKey: string;

  private constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.client = getOpenAIClient(apiKey);
    this.model = model;
  }

  /**
   * Factory method to create an OpenAIService instance with API key from secrets vault
   * @param userId - The user ID whose secret to use (or 'system' for system-wide key)
   * @param secretName - The name of the secret storing the OpenAI API key
   */
  static async create(userId: string, secretName: string = 'OPENAI_API_KEY'): Promise<OpenAIService> {
    let apiKey: string | undefined;
    try {
      const secret = await secretsVault.getSecret(userId, secretName);
      apiKey = secret.value;
    } catch (e) {
      // Fallback to env for legacy support
      apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not found in secrets vault or environment variable');
      }
      logInfo('Falling back to OPENAI_API_KEY from environment variable');
    }
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    return new OpenAIService(apiKey, model);
  }

  /**
   * Factory method to create an OpenAIService instance with API key directly from environment variables
   * This bypasses the secrets vault entirely for system-wide usage
   */
  static createFromEnv(): OpenAIService {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    return new OpenAIService(apiKey, model);
  }

  /**
   * Generate a workflow from natural language description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResponse> {
    try {
      logInfo('Generating workflow from description', {
        description: request.description.substring(0, 100) + '...',
        apiConnectionsCount: request.apiConnections.length,
        hasParameters: !!request.parameters,
        parametersCount: request.parameters ? Object.keys(request.parameters).length : 0
      });

      const systemPrompt = await this.buildSystemPrompt(request.apiConnections);
      const userPrompt = this.buildUserPrompt(request.description, request.parameters);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: [
          {
            name: 'create_workflow',
            description: 'Create a new workflow with steps',
            parameters: {
              type: 'object',
              properties: {
                workflow: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: ['name']
                },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      stepOrder: { type: 'number' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      action: { type: 'string' },
                      apiConnectionId: { type: 'string' },
                      parameters: { type: 'object' },
                      conditions: { type: 'object' },
                      retryConfig: { type: 'object' },
                      timeout: { type: 'number' }
                    },
                    required: ['stepOrder', 'name', 'action']
                  }
                },
                explanation: { type: 'string' }
              },
              required: ['workflow', 'steps', 'explanation']
            }
          }
        ],
        function_call: { name: 'create_workflow' },
        temperature: 0.1,
        max_tokens: 2000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'create_workflow') {
        throw new Error('Failed to generate workflow: Invalid response from OpenAI');
      }

      const result = JSON.parse(functionCall.arguments);
      
      logInfo('Workflow generated successfully', {
        workflowName: result.workflow.name,
        stepsCount: result.steps.length,
        hasExplanation: !!result.explanation
      });

      return {
        workflow: result.workflow as Workflow,
        steps: result.steps as WorkflowStep[],
        explanation: result.explanation
      };

    } catch (error) {
      logError('Failed to generate workflow', error as Error, { 
        description: request.description?.substring(0, 100),
        apiConnectionsCount: request.apiConnections?.length,
        hasParameters: !!request.parameters
      });
      throw new Error(`Workflow generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a workflow step using AI guidance
   */
  async executeWorkflowStep(
    step: WorkflowStep,
    apiConnection: ApiConnection,
    previousResults: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<{ result?: any; nextStep?: string; error?: string }> {
    try {
      logDebug('Executing workflow step with AI guidance', {
        stepId: step.id,
        stepName: step.name,
        stepOrder: step.stepOrder,
        method: step.method,
        endpoint: step.endpoint,
        apiConnectionId: apiConnection.id,
        apiConnectionName: apiConnection.name,
        previousResultsCount: Object.keys(previousResults).length,
        contextCount: Object.keys(context).length
      });

      const systemPrompt = this.buildExecutionPrompt(apiConnection, step);
      const userPrompt = this.buildExecutionUserPrompt(step, previousResults, context);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: [
          {
            name: 'execute_api_call',
            description: 'Execute an API call with the specified parameters',
            parameters: {
              type: 'object',
              properties: {
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                url: { type: 'string' },
                headers: { type: 'object' },
                body: { type: 'object' },
                query: { type: 'object' }
              },
              required: ['method', 'url']
            }
          },
          {
            name: 'handle_error',
            description: 'Handle an error in workflow execution',
            parameters: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                shouldRetry: { type: 'boolean' },
                nextStep: { type: 'string' }
              },
              required: ['error']
            }
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall) {
        throw new Error('No function call returned from OpenAI');
      }

      const args = JSON.parse(functionCall.arguments);

      if (functionCall.name === 'execute_api_call') {
        // Execute the API call
        const apiResult = await this.executeApiCall(args, apiConnection);
        return { result: apiResult };
      } else if (functionCall.name === 'handle_error') {
        return { 
          error: args.error,
          nextStep: args.nextStep
        };
      }

      throw new Error('Unknown function call returned from OpenAI');

    } catch (error) {
      logError('Failed to execute workflow step', error as Error, { 
        stepId: step.id,
        stepName: step.name,
        apiConnectionId: apiConnection.id,
        apiConnectionName: apiConnection.name
      });
      return { 
        error: `Step execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Execute an actual API call
   */
  private async executeApiCall(
    callParams: any,
    apiConnection: ApiConnection
  ): Promise<any> {
    // Ensure proper URL construction
    const baseUrl = apiConnection.baseUrl.endsWith('/') 
      ? apiConnection.baseUrl.slice(0, -1) 
      : apiConnection.baseUrl;
    const path = callParams.url.startsWith('/') 
      ? callParams.url 
      : `/${callParams.url}`;
    const url = `${baseUrl}${path}`;
    
    const config = {
      method: callParams.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...callParams.headers
      },
      params: callParams.query,
      data: callParams.body
    };

    // Add authentication based on apiConnection.authType
    this.addAuthentication(config, apiConnection);

    const response = await axios(config);
    return response.data;
  }

  /**
   * Add authentication to API call
   */
  private addAuthentication(config: any, apiConnection: ApiConnection): void {
    switch (apiConnection.authType) {
      case 'API_KEY':
        config.headers['X-API-Key'] = apiConnection.authConfig.apiKey;
        break;
      case 'BEARER_TOKEN':
        config.headers['Authorization'] = `Bearer ${apiConnection.authConfig.token}`;
        break;
      case 'BASIC_AUTH':
        const credentials = Buffer.from(
          `${apiConnection.authConfig.username}:${apiConnection.authConfig.password}`
        ).toString('base64');
        config.headers['Authorization'] = `Basic ${credentials}`;
        break;
      // Add other auth types as needed
    }
  }

  /**
   * Build system prompt for workflow generation
   */
  private async buildSystemPrompt(apiConnections: any[]): Promise<string> {
    const connectionsInfo = await Promise.all(apiConnections.map(async conn => {
      const endpointsInfo = await Promise.all((conn.endpoints || []).map(async (endpoint: any) => {
        try {
          // Use enhanced endpoint for better parameter understanding
          const enhancedEndpoint = await ParameterExtractionService.enhanceEndpoint(endpoint);
          const paramInfo = enhancedEndpoint.parameters.length > 0 
            ? `\n  Parameters: ${enhancedEndpoint.parameters.map((p: any) => 
                `${p.name} (${p.naturalLanguageMappings?.join(', ') || p.name})${p.required ? ' *' : ''}`
              ).join(', ')}`
            : '';
          
          return `- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || endpoint.description || 'No description'}${paramInfo}`;
        } catch (error) {
          console.error('Failed to enhance endpoint:', error);
          return `- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || 'No description'}`;
        }
      }));

      return `**${conn.name}** 
CONNECTION ID: ${conn.id}
Base URL: ${conn.baseUrl}
${endpointsInfo}`;
    }));

    const connectionsText = connectionsInfo.join('\n\n');

    return `You are a helpful AI assistant that creates workflows to connect and orchestrate APIs. Your goal is to make complex API integrations simple and accessible through natural language.

Key Principles:
1. Be conversational and friendly - talk like a helpful colleague, not a technical manual
2. Explain things simply - avoid jargon unless necessary
3. Be encouraging and positive about what you can help with
4. When you create workflows, explain what each step does in plain English
5. Suggest improvements or alternatives when appropriate

Available API Connections:
${connectionsText}

When creating workflows:
1. Analyze the user's request to understand their intent
2. Identify which APIs are needed and in what order
3. Create a clear, step-by-step workflow
4. Provide a friendly explanation of what the workflow will do
5. Include any important considerations or limitations

Response Format:
- Use the create_workflow function to generate the workflow
- Provide a conversational explanation that helps the user understand what you've created
- Be encouraging and suggest next steps

Remember: You're helping someone automate their work, so be enthusiastic about making their life easier!`;
  }

  /**
   * Build user prompt for workflow generation
   */
  private buildUserPrompt(description: string, parameters?: Record<string, any>): string {
    let prompt = `Create a workflow for: ${description}`;
    
    if (parameters && Object.keys(parameters).length > 0) {
      prompt += `\n\nParameters: ${JSON.stringify(parameters, null, 2)}`;
    }
    
    return prompt;
  }

  /**
   * Build system prompt for workflow execution
   */
  private buildExecutionPrompt(apiConnection: ApiConnection, step: WorkflowStep): string {
    return `You are executing a workflow step for the API: ${apiConnection.name}

Step: ${step.name}
Description: ${step.description || 'No description'}
Method: ${step.method}
Endpoint: ${step.endpoint}

Your task is to:
1. Use the provided method and endpoint to determine the appropriate API call
2. Use the provided context and previous results to build the request
3. Execute the API call with proper parameters
4. Handle any errors gracefully
5. Return the result or indicate the next step

Available API endpoints and their documentation should be used to make the correct API calls.`;
  }

  /**
   * Build user prompt for workflow execution
   */
  private buildExecutionUserPrompt(
    step: WorkflowStep,
    previousResults: Record<string, any>,
    context: Record<string, any>
  ): string {
    return `Execute this step: ${step.name}

Step parameters: ${JSON.stringify(step.parameters, null, 2)}
Previous results: ${JSON.stringify(previousResults, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Please execute the appropriate API call and return the result.`;
  }

  /**
   * Execute direct API calls via chat interface
   * Uses AI to detect intent and execute appropriate API calls
   */
  async executeDirectApiCall(request: {
    message: string;
    availableConnections: any[];
    context: any[];
    guidanceResponse?: any;
  }): Promise<{
    success: boolean;
    data?: {
      intent: 'api_call' | 'workflow_creation' | 'general_chat';
      apiCallResult?: {
        method: string;
        url: string;
        parameters: Record<string, any>;
        requestBody?: any;
        headers?: Record<string, string>;
        connectionId: string;
        statusCode?: number;
        responseData?: any;
        responseHeaders?: Record<string, string>;
        executionTime?: number;
        error?: string;
      };
      explanation: string;
      suggestedAction?: string;
    };
    error?: string;
  }> {
    try {
      logInfo('Executing direct API call via chat', {
        messageLength: request.message.length,
        connectionsCount: request.availableConnections.length,
        hasContext: request.context.length > 0
      });

      const systemPrompt = await this.buildDirectApiCallSystemPrompt(request.availableConnections, request.guidanceResponse);
      const userPrompt = this.buildDirectApiCallUserPrompt(request.message, request.context);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: [
          {
            name: 'execute_api_call',
            description: 'Execute a direct API call based on user request',
            parameters: {
              type: 'object',
              properties: {
                intent: {
                  type: 'string',
                  enum: ['api_call', 'workflow_creation', 'general_chat'],
                  description: 'The detected intent of the user message'
                },
                method: {
                  type: 'string',
                  enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                  description: 'HTTP method for the API call'
                },
                url: {
                  type: 'string',
                  description: 'API endpoint path (relative to base URL)'
                },
                parameters: {
                  type: 'object',
                  description: 'Query parameters for the API call. CRITICAL: Extract ALL relevant parameters from the user message and map them to correct parameter names based on the available parameters listed in the system prompt above. If the user mentions filtering words like "available", "pending", "sold", "active", etc., these MUST be included as parameters. Only use empty object {} when NO filtering or specific values are mentioned in the user message.',
                  additionalProperties: true
                },
                requestBody: {
                  type: 'object',
                  description: 'Request body for POST/PUT/PATCH requests',
                  additionalProperties: true
                },
                headers: {
                  type: 'object',
                  description: 'Additional headers for the API call',
                  additionalProperties: { type: 'string' }
                },
                connectionId: {
                  type: 'string',
                  description: 'ID of the API connection to use (REQUIRED - must match one of the available connection IDs EXACTLY as shown in the Available API Connections section above)'
                },
                explanation: {
                  type: 'string',
                  description: 'A friendly, conversational explanation of what the API call will do and what the user can expect. Use natural language and be encouraging. Examples: "I\'ll help you find all active items from your API" or "Let me retrieve the latest data for you"'
                },
                suggestedAction: {
                  type: 'string',
                  description: 'A helpful suggestion for what the user can do next with the API response data. Be specific and actionable. Examples: "You can now create workflows using this data" or "Try filtering for specific items by status"'
                }
              },
              required: ['intent', 'explanation', 'parameters', 'connectionId']
            }
          }
        ],
        function_call: { name: 'execute_api_call' },
        temperature: 0.3,
        max_tokens: 1000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'execute_api_call') {
        return {
          success: false,
          error: 'Failed to generate API call parameters'
        };
      }

      const result = JSON.parse(functionCall.arguments);
      
      // Debug logging to see what the AI chose
      console.log('🔍 DEBUG: AI chose endpoint:', {
        method: result.method,
        url: result.url,
        connectionId: result.connectionId,
        parameters: result.parameters,
        intent: result.intent,
        explanation: result.explanation
      });
      console.log('🔍 DEBUG: User message:', request.message);
      console.log('🔍 DEBUG: Available connections:', request.availableConnections.length);
      
      
      // FALLBACK: If AI didn't include parameters but should have, add them manually
      // This is a generic fallback that works with any API by analyzing the endpoint parameters
      if ((!result.parameters || Object.keys(result.parameters).length === 0) && result.intent === 'api_call' && result.connectionId && result.url) {
        const connection = request.availableConnections.find(conn => conn.id === result.connectionId);
        if (connection) {
          const endpoint = connection.endpoints?.find((ep: any) => 
            ep.path === result.url && ep.method?.toUpperCase() === (result.method || 'GET').toUpperCase()
          );
          
          if (endpoint && endpoint.parameters && endpoint.parameters.length > 0) {
            const userMessage = request.message.toLowerCase();
            const fallbackParams: Record<string, any> = {};
            
            // Generic parameter extraction based on natural language mappings
            endpoint.parameters.forEach((param: any) => {
              if (param.naturalLanguageMappings && param.naturalLanguageMappings.length > 0) {
                const mappings = param.naturalLanguageMappings.map((m: string) => m.toLowerCase());
                const foundMapping = mappings.find((mapping: string) => userMessage.includes(mapping));
                if (foundMapping) {
                  // For status parameters, use the actual value from the user message, not the mapping word
                  if (param.name === 'status') {
                    // Look for specific status values in the user message
                    if (userMessage.includes('available')) {
                      fallbackParams[param.name] = 'available';
                    } else if (userMessage.includes('pending')) {
                      fallbackParams[param.name] = 'pending';
                    } else if (userMessage.includes('sold')) {
                      fallbackParams[param.name] = 'sold';
                    } else {
                      // Default to available if no specific status mentioned
                      fallbackParams[param.name] = 'available';
                    }
                  } else if (param.name === 'petId' && param.in === 'path') {
                    // For path parameters like petId, extract the ID from the user message
                    const idMatch = userMessage.match(/\b(\d+)\b/);
                    if (idMatch) {
                      fallbackParams[param.name] = idMatch[1];
                    }
                  } else {
                    // For other parameters, use the mapping word as the value
                    fallbackParams[param.name] = foundMapping;
                  }
                }
              }
            });
            
            if (Object.keys(fallbackParams).length > 0) {
              result.parameters = fallbackParams;
              console.log('🔍 DEBUG: Added fallback parameters:', result.parameters);
            }
          }
        }
      }
      
      // Debug available connections
      console.log('🔍 DEBUG: Available connection IDs:', request.availableConnections.map(conn => conn.id));
      console.log('🔍 DEBUG: AI selected connection ID:', result.connectionId);
      
      // Validate connection ID
      if (result.intent === 'api_call' && result.connectionId) {
        const validConnectionIds = new Set(request.availableConnections.map(conn => conn.id));
        if (!validConnectionIds.has(result.connectionId)) {
          console.log('🔍 DEBUG: Invalid connection ID detected!');
          console.log('🔍 DEBUG: AI selected:', result.connectionId);
          console.log('🔍 DEBUG: Valid IDs:', Array.from(validConnectionIds));
          return {
            success: false,
            error: 'Invalid connection ID provided by AI'
          };
        }
      }

      // If this is an API call, enhance parameter extraction using AI
      if (result.intent === 'api_call' && result.connectionId && result.url) {
        try {
          const enhancedParams = await this.enhanceParameterExtraction(
            request.message,
            result.connectionId,
            result.url,
            result.method || 'GET',
            request.availableConnections,
            request.context
          );
          
          if (enhancedParams && Object.keys(enhancedParams).length > 0) {
            console.log('🔍 DEBUG: Using enhanced parameters');
            console.log('🔍 DEBUG: Original parameters:', result.parameters);
            console.log('🔍 DEBUG: Enhanced parameters:', enhancedParams);
            result.parameters = enhancedParams;
            logInfo('Enhanced parameter extraction completed', {
              originalParams: result.parameters,
              enhancedParams: enhancedParams
            });
          } else {
            console.log('🔍 DEBUG: Enhanced parameters empty, trying fallback extraction');
            // Try fallback parameter extraction
            const fallbackParams = this.extractFallbackParameters(request.message, result.url);
            if (fallbackParams && Object.keys(fallbackParams).length > 0) {
              console.log('🔍 DEBUG: Using fallback parameters:', fallbackParams);
              result.parameters = fallbackParams;
            } else {
              console.log('🔍 DEBUG: No fallback parameters found, keeping original:', result.parameters);
            }
          }
        } catch (error) {
          console.log('🔍 DEBUG: Parameter enhancement failed, trying fallback extraction');
          logError('Parameter enhancement failed, trying fallback', error as Error);
          
          // Try fallback parameter extraction
          const fallbackParams = this.extractFallbackParameters(request.message, result.url);
          if (fallbackParams && Object.keys(fallbackParams).length > 0) {
            console.log('🔍 DEBUG: Using fallback parameters after error:', fallbackParams);
            result.parameters = fallbackParams;
          }
        }
      }

      logInfo('Direct API call parameters generated', {
        intent: result.intent,
        hasApiCall: result.intent === 'api_call',
        connectionId: result.connectionId
      });

      return {
        success: true,
        data: {
          intent: result.intent,
          apiCallResult: result.intent === 'api_call' ? {
            method: result.method || 'GET', // Default to GET if method is undefined
            url: result.url,
            parameters: result.parameters,
            requestBody: result.requestBody,
            headers: result.headers,
            connectionId: result.connectionId
          } : undefined,
          explanation: result.explanation,
          suggestedAction: result.suggestedAction
        }
      };

    } catch (error) {
      logError('Failed to execute direct API call', error as Error);
      return {
        success: false,
        error: 'Failed to process API call request'
      };
    }
  }

  /**
   * Build system prompt for direct API call execution
   */
  private async buildDirectApiCallSystemPrompt(connections: any[], guidanceResponse?: any): Promise<string> {
    const connectionsInfo = await Promise.all(connections.map(async conn => {
      const endpointsInfo = await Promise.all(conn.endpoints.map(async (endpoint: any) => {
        try {
          // Use enhanced endpoint if available, otherwise fall back to basic info
          const enhancedEndpoint = await ParameterExtractionService.enhanceEndpoint(endpoint);
          const paramInfo = enhancedEndpoint.parameters.length > 0 
            ? `\n  Parameters: ${enhancedEndpoint.parameters.map((p: any) => 
                `${p.name} (${p.naturalLanguageMappings?.join(', ') || p.name})${p.required ? ' *' : ''}`
              ).join(', ')}`
            : '';
          
          return `- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || endpoint.description || 'No description'}${paramInfo}`;
        } catch (error) {
          console.error('Failed to enhance endpoint:', error);
          return `- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || 'No description'}`;
        }
      }));

      return `**${conn.name}** 
CONNECTION ID: ${conn.id}
Base URL: ${conn.baseUrl}
${endpointsInfo}`;
    }));

    const connectionsText = connectionsInfo.join('\n\n');
    
    // Debug logging to see what endpoints are being provided
    console.log('🔍 DEBUG: Available endpoints for AI:', JSON.stringify(connectionsInfo, null, 2));

    return `You are a friendly AI assistant that helps users execute API calls through natural language. Be conversational, encouraging, and helpful.

CRITICAL EXAMPLE: If a user says "Get all available items" and you have an endpoint "/items/findByStatus" with a "status" parameter that accepts "available", you MUST include parameters: {"status": "available"} in your response.

Available API Connections:
${connectionsText}

🚨 CRITICAL: You MUST use the exact CONNECTION ID provided above. Do NOT modify or guess connection IDs. Copy them exactly as shown.

${guidanceResponse && guidanceResponse.details && guidanceResponse.details.requiredApis ? `
🚨 CRITICAL GUIDANCE FROM CONNECTION SERVICE 🚨
The connection guidance service has analyzed this request and suggests the following endpoints:
${guidanceResponse.details.requiredApis.map((api: any) => 
  `- ${api.displayName}: ${api.suggestedEndpoints.join(', ')} (${api.reason})`
).join('\n')}

🚨🚨🚨 MANDATORY INSTRUCTION - FOLLOW THIS EXACTLY 🚨🚨🚨
You MUST use the suggested endpoints above as your primary choice. The guidance service has already determined the best endpoints for this request. 

CRITICAL: If the user asks for a specific item by ID (like "Get pet by ID 123"), you MUST use the endpoint with path parameters like "/pet/{petId}", NOT the general listing endpoint like "/pet/findByStatus".

ABSOLUTELY CRITICAL: When the guidance service suggests "/pet/{petId}" for "Get pet by ID 123", you MUST use "/pet/{petId}", NOT "/pet/findByStatus".

DO NOT choose other endpoints unless the suggested ones are not available. The guidance service is more accurate than your own analysis.

FAILURE TO FOLLOW THIS GUIDANCE WILL RESULT IN INCORRECT API CALLS.
` : ''}

Your task is to:
1. Analyze the user's message to determine their intent
2. If they want to execute an API call, determine the appropriate endpoint and parameters
   - CRITICAL: Carefully analyze ALL available endpoints listed above to find the best match
   - Look for endpoints that match the user's intent (GET for retrieving data, POST for creating, PUT for updating, DELETE for removing)
   - For "get all" or "find" requests, look for endpoints with "find", "list", "get", or "search" in the path or description
   - For specific item requests, look for endpoints with path parameters like {id}, {petId}, etc.
   - CRITICAL: Extract parameters from the user's natural language and map them to the actual parameter names from the chosen endpoint
   - CRITICAL: Use the natural language mappings provided for each parameter to understand what the user means
   - CRITICAL: When the user mentions filtering words (like "available", "pending", "sold", "active", etc.), ALWAYS include them as parameters
   - Only include parameters that are actually available for the chosen endpoint
   - CRITICAL: Always include the connectionId from the available connections above
   - CRITICAL: Choose the endpoint that best matches the user's intent, not just the first one listed
3. If they want to create a workflow, suggest workflow creation instead
4. If it's general chat, respond conversationally

Intent Detection:
- "Get all users", "Show me data", "Add a new record", "Find items with status active" → api_call
- "Now get all sold pets", "Get me the pending items", "Show me different status" → api_call (NEW API CALL)
- "Create a workflow that...", "Build an automation that..." → workflow_creation  
- "Hello", "How are you?", "What can you do?" → general_chat

CRITICAL: When a user asks for data with different parameters (like "sold pets" after getting "available pets"), this is ALWAYS a new API call request, not a follow-up question. Always make a new API call when the user requests different data or different parameters.

Endpoint Selection Examples:
- "Get all items" or "Show me data" → Look for GET endpoints like "/items", "/users", "/products"
- "Find items that are active" → Look for GET endpoints with status parameters like "/items/findByStatus"
- "Get item with ID 123" → Look for GET endpoints with path parameters like "/items/{id}" or "/items/123"
- "Get pet by ID 123" → Look for GET endpoints with path parameters like "/pet/{petId}" or "/pet/123"
- "Find pet by ID 456" → Look for GET endpoints with path parameters like "/pet/{petId}" or "/pet/456"
- "Add a new item" → Look for POST endpoints like "/items", "/users", "/products"
- "Update item 123" → Look for PUT endpoints like "/items" or "/items/{id}"
- "Delete item 123" → Look for DELETE endpoints like "/items/{id}"

CRITICAL: When a user asks for a specific item by ID (like "Get pet by ID 123", "Find pet by ID 456"), ALWAYS use the endpoint with path parameters like "/pet/{petId}", NOT the general listing endpoint like "/pet/findByStatus".

Parameter Extraction Examples:
- "Get all items" → parameters: {} (no parameters needed, only if no filtering is specified)
- "Show me all users" → parameters: {} (no parameters needed)
- "Find items with status active" → parameters: {"status": "active"}
- "Find items with status inactive" → parameters: {"status": "inactive"}
- "Get available items" → parameters: {"status": "available"}
- "Get all available items" → parameters: {"status": "available"}
- "Show me pending items" → parameters: {"status": "pending"}
- "Find sold items" → parameters: {"status": "sold"}
- "Get item by ID 123" → parameters: {"id": "123"}
- "Get pet by ID 123" → parameters: {"petId": "123"}
- "Find pet by ID 456" → parameters: {"petId": "456"}
- "Find items by category" → parameters: {"category": "electronics"}
- "Search for users by email" → parameters: {"email": "user@example.com"}
- "Filter products by price range" → parameters: {"minPrice": "100", "maxPrice": "500"}

CRITICAL: When a user asks for a specific item by ID, extract the ID number and map it to the correct parameter name from the endpoint (like "petId" for "/pet/{petId}" endpoint).

CRITICAL: When a user mentions words that match parameter natural language mappings (like "available", "pending", "sold"), ALWAYS include those as parameters even if they say "get all". The key is to look for filtering words in the user's message.

For API calls:
- CRITICAL: Analyze ALL available endpoints and choose the one that best matches the user's intent. If CRITICAL GUIDANCE is provided, prioritize those suggested endpoints.
- ABSOLUTELY CRITICAL: When guidance suggests "/pet/{petId}" for "Get pet by ID 123", use "/pet/{petId}", NOT "/pet/findByStatus"
- Use the most appropriate endpoint from available connections (not just the first one)
- ALWAYS use the exact connection ID provided in the connection info above
- Extract parameters from the user's natural language and map them to the correct parameter names
- For query parameters, look for words like "status", "id", "name", "email", etc. in the user's message
- Choose the correct HTTP method based on the action
- Provide friendly, conversational explanations that make the user feel confident

🚨 CRITICAL ENDPOINT SELECTION RULES:
- If user asks for a specific item by ID (like "Get pet by ID 123"), use "/pet/{petId}" NOT "/pet/findByStatus"
- If user asks for items with a status (like "Get pets with status sold"), use "/pet/findByStatus" with status parameter
- ALWAYS prioritize the guidance from the connection service if provided
- For ID-based requests, the URL should be the template with path parameters (e.g., "/pet/{petId}")
- The actual substitution will happen during execution (e.g., "/pet/{petId}" becomes "/pet/123")

Explanation Guidelines:
- Use "I'll help you..." or "Let me..." to start explanations
- Be encouraging and positive
- Explain what the user will get back in simple terms
- Use natural language, not technical jargon
- Make the user feel like they're working with a helpful assistant

Security Guidelines:
- Never suggest calls to internal/localhost endpoints
- Validate all parameters before suggesting API calls
- Don't expose sensitive information in explanations
- Use appropriate HTTP methods for the intended action

Always be helpful, friendly, and provide clear next steps.`;
  }

  /**
   * Build user prompt for direct API call execution
   */
  private buildDirectApiCallUserPrompt(message: string, context: any[]): string {
    let prompt = `User request: "${message}"`;

    if (context.length > 0) {
      prompt += `\n\nPrevious API call results for context:`;
      context.forEach((result, index) => {
        prompt += `\n${index + 1}. ${result.method} ${result.url} - Status: ${result.statusCode}`;
        if (result.responseData) {
          prompt += `\n   Response: ${JSON.stringify(result.responseData).substring(0, 200)}...`;
        }
      });
      
      prompt += `\n\nIMPORTANT: If the user is asking for different data or different parameters (like "sold pets" after getting "available pets"), this is a NEW API call request. Do NOT just respond with the previous data - make a new API call with the different parameters.`;
    }

    return prompt;
  }

  /**
   * Enhance parameter extraction using AI parameter extraction service
   */
  private async enhanceParameterExtraction(
    message: string,
    connectionId: string,
    url: string,
    method: string,
    availableConnections: any[],
    context: any[] = []
  ): Promise<Record<string, any> | null> {
    try {
      console.log('🔍 enhanceParameterExtraction: Starting parameter enhancement');
      console.log('🔍 enhanceParameterExtraction: message:', message);
      console.log('🔍 enhanceParameterExtraction: connectionId:', connectionId);
      console.log('🔍 enhanceParameterExtraction: url:', url);
      console.log('🔍 enhanceParameterExtraction: method:', method);
      console.log('🔍 enhanceParameterExtraction: availableConnections:', availableConnections.map(c => ({ 
        id: c.id, 
        name: c.name, 
        endpointCount: c.endpoints?.length || 0 
      })));

      // Find the connection and endpoint
      const connection = availableConnections.find(conn => conn.id === connectionId);
      if (!connection) {
        console.log('🔍 enhanceParameterExtraction: Connection not found for ID:', connectionId);
        logError('Connection not found for parameter enhancement', new Error('Connection not found'), { connectionId });
        return null;
      }

      console.log('🔍 enhanceParameterExtraction: Found connection:', { 
        id: connection.id, 
        name: connection.name,
        endpointCount: connection.endpoints?.length || 0
      });

      // Look for endpoint with more flexible matching
      let endpoint = connection.endpoints?.find((ep: any) => 
        ep.path === url && ep.method?.toUpperCase() === method.toUpperCase()
      );
      
      // If exact match fails, try more flexible matching
      if (!endpoint) {
        console.log('🔍 enhanceParameterExtraction: Exact match failed, trying flexible matching');
        console.log('🔍 enhanceParameterExtraction: Available endpoints:', connection.endpoints?.map((ep: any) => ({
          path: ep.path,
          method: ep.method,
          summary: ep.summary
        })));
        
        // Try matching by path only (for cases where method might be undefined)
        endpoint = connection.endpoints?.find((ep: any) => ep.path === url);
        
        // If still no match, try partial path matching
        if (!endpoint) {
          endpoint = connection.endpoints?.find((ep: any) => 
            url.includes(ep.path) || ep.path.includes(url)
          );
        }
      }
      
      if (!endpoint) {
        console.log('🔍 enhanceParameterExtraction: Endpoint not found after all attempts');
        console.log('🔍 enhanceParameterExtraction: Looking for:', { url, method });
        console.log('🔍 enhanceParameterExtraction: Available endpoints:', connection.endpoints?.map((ep: any) => ({
          path: ep.path,
          method: ep.method,
          summary: ep.summary
        })));
        
        logError('Endpoint not found for parameter enhancement', new Error('Endpoint not found'), { 
          connectionId, 
          url, 
          method,
          availableEndpoints: connection.endpoints?.map((ep: any) => ({ path: ep.path, method: ep.method })) || []
        });
        return null;
      }

      console.log('🔍 enhanceParameterExtraction: Found endpoint:', {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        hasParameters: !!endpoint.parameters,
        parameterCount: endpoint.parameters?.length || 0
      });

      // Enhance the endpoint with parameter intelligence
      const enhancedEndpoint = await ParameterExtractionService.enhanceEndpoint(endpoint, this);
      
      // Build context for parameter extraction
      const contextForExtraction = this.buildContextForParameterExtraction(context, message);
      
      // Use AI parameter extraction service
      const aiExtractionService = new AIParameterExtractionService(this);
      const extractionResult = await aiExtractionService.extractParametersFromNaturalLanguage(
        message,
        enhancedEndpoint,
        { conversationHistory: context }
      );

      console.log('🔍 enhanceParameterExtraction: AI extraction result:', {
        extractedCount: Object.keys(extractionResult.parameters).length,
        confidence: extractionResult.confidence,
        parameters: extractionResult.parameters
      });

      logInfo('AI parameter extraction completed', {
        message: message.substring(0, 100),
        endpointId: endpoint.id,
        extractedCount: Object.keys(extractionResult.parameters).length,
        confidence: extractionResult.confidence,
        mappings: extractionResult.mappings.length,
        contextUsed: Object.keys(contextForExtraction).length
      });

      return extractionResult.parameters;

    } catch (error) {
      console.error('🔍 enhanceParameterExtraction: Error during parameter enhancement:', error);
      logError('Failed to enhance parameter extraction', error as Error, {
        message: message.substring(0, 100),
        connectionId,
        url,
        method
      });
      return null;
    }
  }

  /**
   * Fallback parameter extraction using simple pattern matching
   */
  private extractFallbackParameters(message: string, url: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    try {
      console.log('🔍 extractFallbackParameters: Extracting parameters from message:', message);
      console.log('🔍 extractFallbackParameters: For URL:', url);
      
      // Common parameter patterns
      const patterns = [
        // Status parameters
        { pattern: /(?:status|state|condition)\s*[=:]\s*["']?(\w+)["']?/i, param: 'status' },
        { pattern: /(?:available|pending|sold)\s+(?:pets?|items?|records?)/i, param: 'status', value: 'available' },
        { pattern: /(?:get|find|search)\s+(?:all\s+)?(available|pending|sold)/i, param: 'status' },
        
        // ID parameters
        { pattern: /(?:id|identifier)\s*[=:]\s*["']?(\w+)["']?/i, param: 'id' },
        { pattern: /(?:pet|item|record)\s+(?:with\s+)?(?:id|identifier)\s+(\w+)/i, param: 'petId' },
        { pattern: /(?:get|find|retrieve)\s+(?:pet|item|record)\s+(?:with\s+)?(?:id\s+)?(\w+)/i, param: 'petId' },
        
        // General parameters
        { pattern: /(?:name|title)\s*[=:]\s*["']?([^"']+)["']?/i, param: 'name' },
        { pattern: /(?:limit|count|size)\s*[=:]\s*(\d+)/i, param: 'limit' },
        { pattern: /(?:offset|skip)\s*[=:]\s*(\d+)/i, param: 'offset' }
      ];
      
      // Apply patterns
      for (const { pattern, param, value } of patterns) {
        const match = message.match(pattern);
        if (match) {
          const extractedValue = value || match[1];
          if (extractedValue) {
            params[param] = extractedValue;
            console.log('🔍 extractFallbackParameters: Extracted parameter:', param, '=', extractedValue);
          }
        }
      }
      
      // Special handling for common endpoints
      if (url.includes('/findByStatus') || url.includes('/findBy')) {
        // Look for status-related keywords
        if (message.toLowerCase().includes('available')) {
          params.status = 'available';
        } else if (message.toLowerCase().includes('pending')) {
          params.status = 'pending';
        } else if (message.toLowerCase().includes('sold')) {
          params.status = 'sold';
        }
      }
      
      if (url.includes('/{petId}') || url.includes('/pet/')) {
        // Look for ID patterns
        const idMatch = message.match(/(\d+)/);
        if (idMatch) {
          params.petId = idMatch[1];
        }
      }
      
      console.log('🔍 extractFallbackParameters: Final extracted parameters:', params);
      return params;
      
    } catch (error) {
      console.error('🔍 extractFallbackParameters: Error during fallback extraction:', error);
      return {};
    }
  }

  /**
   * Build context for parameter extraction from conversation history
   */
  private buildContextForParameterExtraction(context: any[], currentMessage: string): Record<string, any> {
    const contextData: Record<string, any> = {
      conversationHistory: context,
      currentMessage,
      extractedValues: {},
      previousApiCalls: []
    };

    // Extract values from previous API calls in context
    context.forEach((item, index) => {
      if (item.type === 'direct_api_call' && item.apiCallResult) {
        contextData.previousApiCalls.push({
          index,
          method: item.apiCallResult.method,
          url: item.apiCallResult.url,
          parameters: item.apiCallResult.parameters,
          responseData: item.apiCallResult.responseData
        });

        // Extract useful values from previous responses
        if (item.apiCallResult.responseData) {
          const responseData = item.apiCallResult.responseData;
          if (Array.isArray(responseData) && responseData.length > 0) {
            // Extract IDs from previous responses
            responseData.forEach((item: any) => {
              if (item.id) {
                contextData.extractedValues[`previous_${item.id}`] = item;
              }
            });
          } else if (responseData.id) {
            contextData.extractedValues[`previous_${responseData.id}`] = responseData;
          }
        }
      }
    });

    return contextData;
  }

  /**
   * Validate OpenAI configuration
   */
  validateConfig(): boolean {
    if (!this.apiKey) {
      logError('OpenAI API key not configured');
      return false;
    }
    return true;
  }
} 