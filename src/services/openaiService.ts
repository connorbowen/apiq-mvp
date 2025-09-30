import getOpenAIClient from '../lib/openaiWrapper';
import axios from 'axios';
import { logError, logInfo, logDebug } from '../utils/logger';
import { ApiSchemaEnhancementService } from '../lib/services/apiSchemaEnhancementService';
import { NaturalLanguageParameterExtractor } from '../lib/services/naturalLanguageParameterExtractor';
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
          const enhancedEndpoint = await ApiSchemaEnhancementService.enhanceEndpoint(endpoint);
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
   * Generic chat completion method for multi-prompt services
   */
  async chatCompletion(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    functions?: any[];
    function_call?: any;
  }): Promise<string | any> {
    try {
      const requestOptions: any = {
        model: options?.model || this.model,
        messages,
        temperature: options?.temperature || 0.3,
        max_tokens: options?.max_tokens || 1000
      };

      if (options?.functions) {
        requestOptions.functions = options.functions;
        requestOptions.function_call = options.function_call || 'auto';
      }

      console.log('🔍 OpenAIService: Making chat completion request:', {
        model: requestOptions.model,
        messageCount: messages.length,
        hasFunctions: !!options?.functions,
        temperature: requestOptions.temperature,
        maxTokens: requestOptions.max_tokens
      });

      const response = await this.client.chat.completions.create(requestOptions);

      console.log('🔍 OpenAIService: Chat completion response received:', {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length || 0,
        hasUsage: !!response.usage
      });

      // If function calling is used, return the full response
      if (options?.functions) {
        return response;
      }

      // Otherwise, return just the content
      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('🔍 OpenAIService: Chat completion error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        code: (error as any)?.code,
        status: (error as any)?.status,
        response: (error as any)?.response,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      logError('OpenAIService: Chat completion failed', error as Error);
      throw error;
    }
  }

  /**
   * Execute direct API calls via multi-prompt architecture
   * Uses specialized services for endpoint selection, parameter extraction, and response formatting
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
      logInfo('Executing direct API call via multi-prompt architecture', {
        messageLength: request.message.length,
        connectionsCount: request.availableConnections.length,
        hasContext: request.context.length > 0
      });

      // Use the new multi-prompt orchestrator
      const { DirectApiCallOrchestrator } = await import('../lib/services/directApiCallOrchestrator');
      const orchestrator = new DirectApiCallOrchestrator(this);
      
      const result = await orchestrator.processDirectApiCall({
        message: request.message,
        availableConnections: request.availableConnections,
        context: request.context,
        guidanceResponse: request.guidanceResponse
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Multi-prompt processing failed'
        };
      }

      // Convert orchestrator result to expected format
      return {
        success: true,
        data: {
          intent: result.intent,
          apiCallResult: result.apiCallResult ? {
            method: result.apiCallResult.method,
            url: result.apiCallResult.url,
            parameters: result.apiCallResult.parameters,
            requestBody: result.apiCallResult.requestBody,
            headers: result.apiCallResult.headers,
            connectionId: result.apiCallResult.connectionId
          } : undefined,
          explanation: result.explanation,
          suggestedAction: result.suggestedAction
        }
      };

    } catch (error) {
      console.error('🔍 OpenAIService: Error in executeDirectApiCall:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in direct API call execution'
      };
    }
  }

}
