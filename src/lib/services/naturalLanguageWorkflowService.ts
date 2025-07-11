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
      console.log('NaturalLanguageWorkflowService: Starting workflow generation');
      console.log('NaturalLanguageWorkflowService: Available connections:', request.availableConnections.length);
      
      // Convert available connections to function definitions for GPT
      const functions = this.convertConnectionsToFunctions(request.availableConnections);
      console.log('NaturalLanguageWorkflowService: Generated functions:', functions.length);
      
      if (functions.length === 0) {
        return {
          success: false,
          error: 'No API endpoints available for workflow generation. Please add at least one API connection with endpoints.',
          alternatives: []
        };
      }

      // Create system prompt
      const systemPrompt = this.createSystemPrompt();
      console.log('NaturalLanguageWorkflowService: System prompt created');

      // Create messages array
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: request.userDescription }
      ];

      // DEBUG: Log exactly what we're sending to OpenAI
      console.log('=== OPENAI API DEBUG ===');
      console.log('→ FUNCTIONS:', JSON.stringify(functions, null, 2));
      console.log('→ MESSAGES:', JSON.stringify(messages, null, 2));
      console.log('→ USER REQUEST:', request.userDescription);
      console.log('=== END DEBUG ===');

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        functions,
        function_call: 'auto',
        temperature: 0.1,
        max_tokens: 2000
      });

      console.log('NaturalLanguageWorkflowService: OpenAI response received');
      console.log('NaturalLanguageWorkflowService: Response choices:', completion.choices.length);
      
      const choice = completion.choices[0];
      console.log('NaturalLanguageWorkflowService: Choice finish reason:', choice.finish_reason);
      console.log('NaturalLanguageWorkflowService: Choice message:', JSON.stringify(choice.message, null, 2));

      if (choice.finish_reason === 'function_call' && choice.message.function_call) {
        console.log('NaturalLanguageWorkflowService: Function call detected');
        const functionCall = choice.message.function_call;
        
        try {
          const args = JSON.parse(functionCall.arguments);
          console.log('NaturalLanguageWorkflowService: Parsed function arguments:', JSON.stringify(args, null, 2));
          
          // Generate workflow from function call
          const workflow = this.parseFunctionCallToWorkflow(functionCall, request.availableConnections);
          
          return {
            success: true,
            workflow,
            alternatives: await this.generateAlternatives(request, functions, systemPrompt)
          };
        } catch (parseError) {
          console.error('NaturalLanguageWorkflowService: Failed to parse function arguments:', parseError);
          return {
            success: false,
            error: 'Failed to parse workflow generation response',
            alternatives: await this.generateAlternatives(request, functions, systemPrompt)
          };
        }
      } else if (choice.finish_reason === 'stop' && choice.message.content) {
        console.log('NaturalLanguageWorkflowService: Stop finish reason with content');
        // Handle case where GPT provides explanation without function call
        return {
          success: false,
          error: 'Unable to generate workflow. Please provide more specific details about what you want to accomplish.',
          alternatives: await this.generateAlternatives(request, functions, systemPrompt)
        };
      } else {
        console.log('NaturalLanguageWorkflowService: Unexpected finish reason:', choice.finish_reason);
        return {
          success: false,
          error: 'Failed to generate workflow due to technical error',
          alternatives: await this.generateAlternatives(request, functions, systemPrompt)
        };
      }
    } catch (error) {
      console.error('NaturalLanguageWorkflowService: Error in generateWorkflow:', error);
      return {
        success: false,
        error: 'Failed to generate workflow due to technical error',
        alternatives: []
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
        // Generate a user-friendly function name using the connection name and action
        const connectionName = connection.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const action = endpoint.summary.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/\s+/g, '_');
        
        // Create a brief, action-oriented function name
        const functionName = `${connectionName}_${action}`;
        
        // Ensure the function name is under 64 characters
        const finalFunctionName = functionName.length > 64 ? functionName.substring(0, 64) : functionName;
        
        functions.push({
          name: finalFunctionName,
          description: `${endpoint.summary} using ${connection.name}`,
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
    
    // Handle case where parameters is not an array
    if (!Array.isArray(parameters)) {
      console.log('NaturalLanguageWorkflowService: Parameters is not an array, using empty object');
      return properties;
    }
    
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
    return `You are an expert workflow automation specialist. Your job is to create multi-step workflows from natural language descriptions.

IMPORTANT: Always generate MULTI-STEP workflows for complex requests. Break down complex workflows into 2-5 logical steps.

WORKFLOW PLANNING RULES:
1. For complex requests, create multiple steps (2-5 steps)
2. Each step should have a clear purpose and action
3. Steps should flow logically from one to the next
4. Use data mapping between steps when possible
5. Include conditional logic when appropriate

COMMON WORKFLOW PATTERNS:
- Webhook → Transform → Action (3 steps)
- Monitor → Filter → Notify → Log (4 steps)
- Collect → Process → Store → Notify (4 steps)
- Trigger → Validate → Execute → Confirm (4 steps)

STEP TYPES:
- api_call: Make an API request
- data_transform: Transform data between steps
- condition: Add conditional logic
- webhook: Set up webhook monitoring

DATA FLOW:
- Map outputs from one step to inputs of the next step
- Use JSON path expressions for data mapping
- Include data validation between steps

EXAMPLES:
User: "When a new GitHub issue is created, send a Slack notification and create a Trello card"
Steps:
1. Monitor GitHub issues (webhook)
2. Send Slack notification (api_call)
3. Create Trello card (api_call)

User: "When a customer places an order, create invoice, send email, update inventory"
Steps:
1. Monitor orders (webhook)
2. Create invoice in QuickBooks (api_call)
3. Send confirmation email (api_call)
4. Update inventory in Shopify (api_call)

Available API endpoints are provided as functions. Use the most appropriate endpoints for each step.

Generate workflows that are:
- Practical and executable
- Well-structured with clear step purposes
- Include proper data flow between steps
- Handle errors gracefully
- Follow best practices for workflow automation`;
  }

  /**
   * Parse OpenAI function call to workflow structure (supports multi-step workflows)
   */
  private parseFunctionCallToWorkflow(
    functionCall: OpenAI.Chat.Completions.ChatCompletionMessage.FunctionCall,
    availableConnections: WorkflowGenerationRequest['availableConnections']
  ): GeneratedWorkflow {
    const args = JSON.parse(functionCall.arguments);
    
    // Check if this is a multi-step workflow
    if (args.steps && Array.isArray(args.steps)) {
      return this.parseMultiStepWorkflow(args, availableConnections);
    }
    
    // Fallback to single step workflow (current implementation)
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
   * Parse multi-step workflow from function call arguments
   */
  private parseMultiStepWorkflow(
    args: any,
    availableConnections: WorkflowGenerationRequest['availableConnections']
  ): GeneratedWorkflow {
    const steps: WorkflowStep[] = [];
    
    for (let i = 0; i < args.steps.length; i++) {
      const stepData = args.steps[i];
      const connection = availableConnections.find(c => c.id === stepData.connectionId);
      const endpoint = connection?.endpoints.find(e => e.path === stepData.endpoint);
      
      if (!connection || !endpoint) {
        console.warn(`Skipping step ${i + 1}: Invalid connection or endpoint`);
        continue;
      }

      const step: WorkflowStep = {
        id: `step_${Date.now()}_${i}`,
        name: stepData.name || endpoint.summary,
        type: stepData.type || 'api_call',
        apiConnectionId: connection.id,
        endpoint: endpoint.path,
        method: endpoint.method,
        parameters: stepData.parameters || {},
        dataMapping: stepData.dataMapping || {},
        conditions: stepData.conditions || null,
        order: i + 1
      };
      
      steps.push(step);
    }

    if (steps.length === 0) {
      throw new Error('No valid steps found in multi-step workflow');
    }

    return {
      id: `workflow_${Date.now()}`,
      name: args.name || `Multi-step workflow with ${steps.length} steps`,
      description: args.description || `Workflow with ${steps.length} steps`,
      steps,
      estimatedExecutionTime: steps.length * 5000,
      confidence: 0.8,
      explanation: args.explanation || `This workflow executes ${steps.length} steps in sequence.`
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