import getOpenAIClient from '../lib/openaiWrapper';
import axios from 'axios';
import { logError, logInfo, logDebug } from '../utils/logger';
import { ParameterExtractionService } from '../lib/services/parameterExtractionService';
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

      const systemPrompt = this.buildSystemPrompt(request.apiConnections);
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
  private buildSystemPrompt(apiConnections: ApiConnection[]): string {
    const connectionsInfo = apiConnections.map(conn => {
      const endpointsInfo = conn.endpoints.map((endpoint: any) => {
        // Use enhanced endpoint for better parameter understanding
        const enhancedEndpoint = ParameterExtractionService.enhanceEndpoint(endpoint);
        const paramInfo = enhancedEndpoint.parameters.length > 0 
          ? `\n  Parameters: ${enhancedEndpoint.parameters.map(p => 
              `${p.name} (${p.naturalLanguageMappings?.join(', ') || p.name})${p.required ? ' *' : ''}`
            ).join(', ')}`
          : '';
        
        return `- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || 'No description'}${paramInfo}`;
      }).join('\n');

      return `**${conn.name}** (ID: ${conn.id}, Base URL: ${conn.baseUrl})
${endpointsInfo}`;
    }).join('\n\n');

    return `You are a helpful AI assistant that creates workflows to connect and orchestrate APIs. Your goal is to make complex API integrations simple and accessible through natural language.

Key Principles:
1. Be conversational and friendly - talk like a helpful colleague, not a technical manual
2. Explain things simply - avoid jargon unless necessary
3. Be encouraging and positive about what you can help with
4. When you create workflows, explain what each step does in plain English
5. Suggest improvements or alternatives when appropriate

Available API Connections:
${connectionsInfo}

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

      const systemPrompt = this.buildDirectApiCallSystemPrompt(request.availableConnections);
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
                  description: 'Query parameters for the API call. Extract from user message and map to correct parameter names (e.g., "status available" → {"status": "available"})',
                  additionalProperties: true,
                  properties: {
                    status: {
                      type: 'string',
                      description: 'Pet status (available, pending, sold)'
                    },
                    petId: {
                      type: 'string', 
                      description: 'Pet ID for specific pet operations'
                    },
                    tags: {
                      type: 'string',
                      description: 'Comma-separated tags for pet filtering'
                    }
                  }
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
                  description: 'ID of the API connection to use'
                },
                explanation: {
                  type: 'string',
                  description: 'A friendly, conversational explanation of what the API call will do and what the user can expect. Use natural language and be encouraging. Examples: "I\'ll help you find all available pets from your pet store API" or "Let me retrieve the latest orders for you"'
                },
                suggestedAction: {
                  type: 'string',
                  description: 'A helpful suggestion for what the user can do next with the API response data. Be specific and actionable. Examples: "You can now create workflows using this data" or "Try filtering for specific pets by status"'
                }
              },
              required: ['intent', 'explanation']
            }
          }
        ],
        function_call: { name: 'execute_api_call' },
        temperature: 0.1,
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
      
      // Validate connection ID
      if (result.intent === 'api_call' && result.connectionId) {
        const validConnectionIds = new Set(request.availableConnections.map(conn => conn.id));
        if (!validConnectionIds.has(result.connectionId)) {
          return {
            success: false,
            error: 'Invalid connection ID provided by AI'
          };
        }
      }

      logInfo('Direct API call parameters generated', {
        intent: result.intent,
        hasApiCall: result.intent === 'api_call',
        connectionId: result.connectionId
      });

      return {
        success: true,
        data: result
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
  private buildDirectApiCallSystemPrompt(connections: any[]): string {
    const connectionsInfo = connections.map(conn => {
      const endpointsInfo = conn.endpoints.map((endpoint: any) => {
        // Use enhanced endpoint if available, otherwise fall back to basic info
        const enhancedEndpoint = ParameterExtractionService.enhanceEndpoint(endpoint);
        const paramInfo = enhancedEndpoint.parameters.length > 0 
          ? `\n  Parameters: ${enhancedEndpoint.parameters.map(p => 
              `${p.name} (${p.naturalLanguageMappings?.join(', ') || p.name})${p.required ? ' *' : ''}`
            ).join(', ')}`
          : '';
        
        return `- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || 'No description'}${paramInfo}`;
      }).join('\n');

      return `**${conn.name}** (ID: ${conn.id}, Base URL: ${conn.baseUrl})
${endpointsInfo}`;
    }).join('\n\n');

    return `You are a friendly AI assistant that helps users execute API calls through natural language. Be conversational, encouraging, and helpful.

Available API Connections:
${connectionsInfo}

Your task is to:
1. Analyze the user's message to determine their intent
2. If they want to execute an API call, determine the appropriate endpoint and parameters
   - CRITICAL: Always extract parameters from the user's natural language
   - Look for words like "status", "available", "sold", "pending", "ID", "123", etc.
   - Map them to the correct parameter names in the parameters object
3. If they want to create a workflow, suggest workflow creation instead
4. If it's general chat, respond conversationally

Intent Detection:
- "Get all pets", "Show me users", "Add a new pet", "Find pets with status available" → api_call
- "Create a workflow that...", "Build an automation that..." → workflow_creation  
- "Hello", "How are you?", "What can you do?" → general_chat

Parameter Extraction Examples:
- "Find pets with status available" → parameters: {"status": "available"}
- "Find pets with status sold" → parameters: {"status": "sold"}
- "Get pet by ID 123" → parameters: {"petId": "123"}
- "Find pets by tags" → parameters: {"tags": "tag1,tag2"}

For API calls:
- Use the most appropriate endpoint from available connections
- ALWAYS use the exact connection ID provided in the connection info above
- Extract parameters from the user's natural language and map them to the correct parameter names
- For query parameters, look for words like "status", "id", "name", "email", etc. in the user's message
- For example: "Find pets with status available" → parameters: {"status": "available"}
- For example: "Get user by ID 123" → parameters: {"id": "123"}
- Choose the correct HTTP method based on the action
- Provide friendly, conversational explanations that make the user feel confident

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
    }

    return prompt;
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