import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'api_call' | 'data_transform' | 'condition' | 'webhook';
  apiConnectionId?: string;
  endpoint?: string;
  method?: string;
  parameters?: Record<string, any>;
  dataMapping?: Record<string, string>;
  conditions?: any;
  order: number;
}

export interface GeneratedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedExecutionTime: number;
  confidence: number;
  explanation: string;
}

export interface WorkflowGenerationRequest {
  userDescription: string;
  userId: string;
  availableConnections: Array<{
    id: string;
    name: string;
    baseUrl: string;
    endpoints: Array<{
      path: string;
      method: string;
      summary: string;
      parameters: any[];
    }>;
  }>;
  context?: string;
}

export interface WorkflowGenerationResponse {
  success: boolean;
  workflow?: GeneratedWorkflow;
  error?: string;
  alternatives?: GeneratedWorkflow[];
}

class NaturalLanguageWorkflowService {
  private openai: OpenAI;
  private prisma: PrismaClient;

  constructor(apiKey: string, prisma: PrismaClient) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: false,
    });
    this.prisma = prisma;
  }

  /**
   * Generate a workflow from natural language description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResponse> {
    try {
      // Convert available connections to function definitions for GPT
      const functions = this.convertConnectionsToFunctions(request.availableConnections);
      
      // Create the system prompt
      const systemPrompt = this.createSystemPrompt();
      
      // Create the user message
      const userMessage = this.createUserMessage(request);

      // Call OpenAI with function calling
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        functions: functions,
        function_call: 'auto',
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 2000,
      });
      
      const choice = response.choices[0];
      if (!choice.message) {
        return {
          success: false,
          error: 'Failed to generate workflow due to technical error'
        };
      }
      if (choice.finish_reason === 'function_call') {
        if (choice.message.function_call) {
          // Parse the function call to extract workflow
          const workflow = this.parseFunctionCallToWorkflow(
            choice.message.function_call,
            request.availableConnections
          );
          return {
            success: true,
            workflow,
            alternatives: await this.generateAlternatives(request, functions, systemPrompt)
          };
        } else {
          return {
            success: false,
            error: 'Failed to generate workflow due to technical error'
          };
        }
      } else if (choice.finish_reason === 'stop' && choice.message.content) {
        // Handle case where GPT provides explanation without function call
        return {
          success: false,
          error: 'Unable to generate workflow. Please provide more specific details about what you want to accomplish.',
          alternatives: await this.generateAlternatives(request, functions, systemPrompt)
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate workflow due to technical error'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate workflow due to technical error'
      };
    }
  }

  /**
   * Convert API connections to OpenAI function definitions
   */
  private convertConnectionsToFunctions(connections: WorkflowGenerationRequest['availableConnections']) {
    const functions = [];

    for (const connection of connections) {
      for (const endpoint of connection.endpoints) {
        const functionName = `${connection.name}_${endpoint.method.toLowerCase()}_${endpoint.path.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
        
        functions.push({
          name: functionName,
          description: `Call ${endpoint.method} ${endpoint.path} on ${connection.name}: ${endpoint.summary}`,
          parameters: {
            type: 'object',
            properties: {
              connectionId: {
                type: 'string',
                description: 'The ID of the API connection',
                const: connection.id
              },
              endpoint: {
                type: 'string',
                description: 'The API endpoint path',
                const: endpoint.path
              },
              method: {
                type: 'string',
                description: 'The HTTP method',
                const: endpoint.method
              },
              parameters: {
                type: 'object',
                description: 'Parameters to pass to the API call',
                properties: this.convertOpenAPIParametersToJSONSchema(endpoint.parameters)
              }
            },
            required: ['connectionId', 'endpoint', 'method']
          }
        });
      }
    }

    return functions;
  }

  /**
   * Convert OpenAPI parameters to JSON Schema
   */
  private convertOpenAPIParametersToJSONSchema(parameters: any[]) {
    const properties: Record<string, any> = {};
    
    for (const param of parameters) {
      if (param.name && param.schema) {
        properties[param.name] = {
          type: param.schema.type || 'string',
          description: param.description || `Parameter: ${param.name}`,
          ...(param.schema.enum && { enum: param.schema.enum }),
          ...(param.schema.format && { format: param.schema.format }),
          ...(param.required && { required: true })
        };
      }
    }
    
    return properties;
  }

  /**
   * Create system prompt for workflow generation
   */
  private createSystemPrompt(): string {
    return `You are an expert API workflow automation assistant. Your job is to help users create workflows by connecting different APIs based on their natural language descriptions.

Key capabilities:
- Parse natural language requests into structured API workflows
- Identify the appropriate API endpoints to use
- Map user intent to specific API calls
- Generate workflows that are executable and well-structured

When a user describes what they want to accomplish, you should:
1. Analyze their request to understand the goal
2. Identify which APIs and endpoints are needed
3. Create a workflow with the appropriate steps
4. Provide clear explanations of what the workflow will do

Always use the provided function definitions to create workflows. If you cannot create a workflow with the available APIs, explain what additional information or APIs would be needed.`;
  }

  /**
   * Create user message for workflow generation
   */
  private createUserMessage(request: WorkflowGenerationRequest): string {
    let message = `Create a workflow for: ${request.userDescription}`;
    
    if (request.context) {
      message += `\n\nContext: ${request.context}`;
    }
    
    message += `\n\nAvailable API connections:`;
    for (const connection of request.availableConnections) {
      message += `\n- ${connection.name} (${connection.baseUrl})`;
      for (const endpoint of connection.endpoints) {
        message += `\n  - ${endpoint.method} ${endpoint.path}: ${endpoint.summary}`;
      }
    }
    
    return message;
  }

  /**
   * Parse OpenAI function call to workflow structure
   */
  private parseFunctionCallToWorkflow(
    functionCall: OpenAI.Chat.Completions.ChatCompletionMessage.FunctionCall,
    availableConnections: WorkflowGenerationRequest['availableConnections']
  ): GeneratedWorkflow {
    const args = JSON.parse(functionCall.arguments);
    
    // Find the connection details
    const connection = availableConnections.find(conn => conn.id === args.connectionId);
    const endpoint = connection?.endpoints.find(ep => ep.path === args.endpoint && ep.method === args.method);
    
    const step: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: `${connection?.name || 'API'} ${args.method} ${args.endpoint}`,
      type: 'api_call',
      apiConnectionId: args.connectionId,
      endpoint: args.endpoint,
      method: args.method,
      parameters: args.parameters || {},
      order: 1
    };

    return {
      id: `workflow_${Date.now()}`,
      name: `Generated Workflow`,
      description: `Workflow generated from natural language request`,
      steps: [step],
      estimatedExecutionTime: 5000,
      confidence: 0.8,
      explanation: `This workflow will call ${connection?.name || 'API'} to ${endpoint?.summary || 'perform the requested action'}`
    };
  }

  /**
   * Generate alternative workflows
   */
  private async generateAlternatives(
    request: WorkflowGenerationRequest,
    functions: any[],
    systemPrompt: string
  ): Promise<GeneratedWorkflow[]> {
    // For now, return empty array - this could be expanded to generate alternatives
    return [];
  }

  /**
   * Validate a generated workflow
   */
  async validateWorkflow(workflow: GeneratedWorkflow): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Validate each step
    for (const step of workflow.steps) {
      if (step.type === 'api_call' && step.apiConnectionId) {
        const connection = await this.prisma.apiConnection.findUnique({
          where: { id: step.apiConnectionId }
        });

        if (!connection) {
          issues.push(`API connection ${step.apiConnectionId} not found`);
        } else if (connection.status !== 'ACTIVE') {
          issues.push(`API connection ${connection.name} is not active`);
        }
      }
    }

    // Check for complex workflows
    if (workflow.steps.length > 10) {
      suggestions.push('Consider breaking this into smaller workflows');
    }

    // Check for long execution times
    if (workflow.estimatedExecutionTime > 30000) {
      suggestions.push('This workflow may take a long time to execute');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Save workflow to database
   */
  async saveWorkflow(workflow: GeneratedWorkflow, userId: string): Promise<string> {
    const savedWorkflow = await this.prisma.workflow.create({
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        userId,
        isActive: true,
        steps: workflow.steps,
        metadata: {
          estimatedExecutionTime: workflow.estimatedExecutionTime,
          confidence: workflow.confidence,
          explanation: workflow.explanation,
          generatedAt: new Date().toISOString()
        }
      }
    });

    return savedWorkflow.id;
  }
}

export default NaturalLanguageWorkflowService; 