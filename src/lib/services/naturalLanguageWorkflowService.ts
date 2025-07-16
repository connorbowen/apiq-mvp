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

export class NaturalLanguageWorkflowService {
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
      // Validate that we have available connections
      if (!request.availableConnections || request.availableConnections.length === 0) {
        return {
          success: false,
          error: 'No API connections available. Please add at least one API connection before generating workflows.',
          alternatives: []
        };
      }

      // Validate that connections have endpoints
      const connectionsWithEndpoints = request.availableConnections.filter(
        conn => conn.endpoints && conn.endpoints.length > 0
      );
      
      if (connectionsWithEndpoints.length === 0) {
        return {
          success: false,
          error: 'No API endpoints available. Please ensure your connections have valid API specifications.',
          alternatives: []
        };
      }

      // Basic content validation for unsafe requests
      const unsafePatterns = [
        /delete\s+all\s+files/i,
        /destroy\s+system/i,
        /wipe\s+database/i,
        /remove\s+everything/i,
        /clear\s+all\s+data/i
      ];
      
      const isUnsafe = unsafePatterns.some(pattern => pattern.test(request.userDescription));
      if (isUnsafe) {
        return {
          success: false,
          error: 'This request appears to be unsafe or destructive. Please provide a more specific and safe workflow description.',
          alternatives: []
        };
      }

      // Convert connections to OpenAI function definitions
      const functions = this.convertConnectionsToFunctions(connectionsWithEndpoints);
      
      if (functions.length === 0) {
        return {
          success: false,
          error: 'Unable to generate workflow functions from available API connections. Please check your connection configurations.',
          alternatives: []
        };
      }

      // Log prompt and function definitions
      console.log('=== OpenAI Workflow Generation Debug ===');
      console.log('→ User description:', request.userDescription);
      console.log('→ Function definitions:', JSON.stringify(functions, null, 2));

      // Prepare OpenAI prompt and call
      const openaiClient = this.openai;
      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      const systemPrompt = this.createSystemPrompt();
      const userPrompt = request.userDescription;

      console.log('→ System prompt:', systemPrompt);
      console.log('→ User prompt:', userPrompt);
      console.log('→ Model:', model);

      let openaiResponse;
      try {
        openaiResponse = await openaiClient.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          functions,
          function_call: { name: 'create_workflow' },
          temperature: 0.1,
          max_tokens: 2000
        });
        console.log('→ Raw OpenAI response:', JSON.stringify(openaiResponse, null, 2));
      } catch (openaiError) {
        console.error('→ OpenAI API error:', openaiError);
        return {
          success: false,
          error: 'OpenAI API error: ' + (openaiError instanceof Error ? openaiError.message : String(openaiError)),
          alternatives: []
        };
      }

      const functionCall = openaiResponse.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'create_workflow') {
        console.error('→ Invalid OpenAI function call:', functionCall);
        return {
          success: false,
          error: 'Failed to generate workflow: Invalid response from OpenAI',
          alternatives: []
        };
      }

      let result;
      try {
        result = JSON.parse(functionCall.arguments);
      } catch (parseError) {
        console.error('→ Failed to parse OpenAI function call arguments:', functionCall.arguments);
        return {
          success: false,
          error: 'Failed to parse workflow from OpenAI response',
          alternatives: []
        };
      }
      
      console.log('→ Parsed workflow result:', JSON.stringify(result, null, 2));

      // Convert the create_workflow function result to our workflow format
      const workflow: GeneratedWorkflow = {
        id: `workflow_${Date.now()}`,
        name: result.name || 'Generated Workflow',
        description: result.description || 'Workflow generated from natural language request',
        steps: (result.steps || []).map((step: any, i: number) => ({
          id: step.id || `step-${i + 1}`,
          name: step.name,
          type: step.type,
          apiConnectionId: step.apiConnectionId,
          endpoint: step.endpoint,
          method: step.method,
          parameters: step.parameters || {},
          dataMapping: step.dataMapping || undefined,
          conditions: step.conditions || undefined,
          order: step.order ?? i + 1,
          description: step.description || '',
        })),
        estimatedExecutionTime: (result.steps.length || 1) * 5000,
        confidence: 0.8,
        explanation: `This workflow executes ${result.steps.length || 1} steps in sequence.`
      };

      return {
        success: true,
        workflow,
        alternatives: [],
        error: undefined
      };
    } catch (error) {
      console.error('=== Workflow Generation Error ===');
      console.error(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        alternatives: []
      };
    }
  }

  /**
   * Convert API connections to OpenAI function definitions
   */
  private convertConnectionsToFunctions(connections: WorkflowGenerationRequest['availableConnections']) {
    const functions = [];

    // Add the create_workflow function that can orchestrate multiple API calls
    functions.push({
      name: 'create_workflow',
      description: 'Create a new workflow with multiple steps that can orchestrate API calls, data transforms, conditions, and webhooks',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the workflow'
          },
          description: {
            type: 'string',
            description: 'A description of what the workflow does'
          },
          steps: {
            type: 'array',
            description: 'Array of workflow steps',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique step ID' },
                name: { type: 'string', description: 'Step name' },
                type: { type: 'string', enum: ['api_call', 'data_transform', 'condition', 'webhook'], description: 'Step type' },
                apiConnectionId: { 
                  type: 'string', 
                  description: 'API connection ID (must be one of the available connection IDs)',
                  enum: connections.map(conn => conn.id)
                },
                endpoint: { type: 'string', description: 'API endpoint (if applicable)' },
                method: { type: 'string', description: 'HTTP method (if applicable)' },
                parameters: { type: 'object', description: 'Parameters for the step' },
                dataMapping: { type: 'object', description: 'Data mapping for the step' },
                conditions: { type: 'object', description: 'Conditional logic for the step' },
                order: { type: 'integer', description: 'Step order' },
                description: { type: 'string', description: 'Human-readable explanation of what this step does' }
              },
              required: ['id', 'name', 'type', 'order', 'description']
            }
          }
        },
        required: ['name', 'description', 'steps']
      }
    });

    // Add individual API endpoint functions for reference
    for (const connection of connections) {
      for (const endpoint of connection.endpoints) {
        // Generate a user-friendly function name using the connection name and action
        const connectionName = connection.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const action = endpoint.summary.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/\s+/g, '_');
        
        // Create a brief, action-oriented function name
        const functionName = `${connectionName}_${action}`;
        
        // Ensure the function name is under 64 characters
        const finalFunctionName = functionName.length > 64 ? functionName.substring(0, 64) : functionName;
        
        // Defensive: ensure endpoint.parameters is always an array
        let safeParameters = Array.isArray(endpoint.parameters) ? endpoint.parameters : [];
        if (!Array.isArray(endpoint.parameters)) {
          console.warn(`convertConnectionsToFunctions: endpoint.parameters for ${endpoint.method} ${endpoint.path} is not an array (got: ${typeof endpoint.parameters}). Using empty array.`);
        }
        functions.push({
          name: finalFunctionName,
          description: `${endpoint.summary} using ${connection.name} (Connection ID: ${connection.id})`,
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
                properties: this.convertOpenAPIParametersToJSONSchema(safeParameters)
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
        // Debug logging for problematic parameters
        if (param.name === 'tags') {
          console.log('NaturalLanguageWorkflowService: Processing tags parameter:', JSON.stringify(param, null, 2));
        }
        
        // Skip parameters that don't have a valid schema
        if (!param.schema || typeof param.schema !== 'object') {
          console.warn(`NaturalLanguageWorkflowService: Skipping parameter ${param.name} - invalid schema`);
          continue;
        }
        
        const paramSchema: any = {
          type: param.schema.type || 'string',
          description: param.description || `Parameter: ${param.name}`,
        };

        // Handle enum values
        if (param.schema.enum && Array.isArray(param.schema.enum)) {
          paramSchema.enum = param.schema.enum;
        }

        // Handle format
        if (param.schema.format && typeof param.schema.format === 'string') {
          paramSchema.format = param.schema.format;
        }

        // Handle array types - they need items property
        if (param.schema.type === 'array') {
          // Ensure items property is always present for arrays
          if (param.schema.items && typeof param.schema.items === 'object') {
            paramSchema.items = {
              type: param.schema.items.type || 'string'
            };
            
            // If the array items have enum values, include them
            if (param.schema.items.enum && Array.isArray(param.schema.items.enum)) {
              paramSchema.items.enum = param.schema.items.enum;
            }
            
            // Handle format for array items
            if (param.schema.items.format && typeof param.schema.items.format === 'string') {
              paramSchema.items.format = param.schema.items.format;
            }
          } else {
            // Default to string items if items schema is missing
            console.warn(`NaturalLanguageWorkflowService: Array parameter ${param.name} missing items schema, using default string type`);
            paramSchema.items = { type: 'string' };
          }
        }

        // Handle object types
        if (param.schema.type === 'object') {
          if (param.schema.properties && typeof param.schema.properties === 'object') {
            paramSchema.properties = param.schema.properties;
          }
          if (param.schema.required && Array.isArray(param.schema.required)) {
            paramSchema.required = param.schema.required;
          }
        }

        // Handle additional properties for objects
        if (param.schema.additionalProperties !== undefined) {
          paramSchema.additionalProperties = param.schema.additionalProperties;
        }

        // Validate that the schema is valid before adding it
        if (this.isValidJSONSchema(paramSchema)) {
          properties[param.name] = paramSchema;
        } else {
          console.warn(`NaturalLanguageWorkflowService: Skipping parameter ${param.name} - invalid JSON schema generated`);
        }
      }
    }
    
    return properties;
  }

  /**
   * Validate that a schema object is valid JSON Schema
   */
  private isValidJSONSchema(schema: any): boolean {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // Check for required type property
    if (!schema.type || typeof schema.type !== 'string') {
      return false;
    }

    // Validate type values
    const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];
    if (!validTypes.includes(schema.type)) {
      return false;
    }

    // Validate array schemas have items
    if (schema.type === 'array' && (!schema.items || typeof schema.items !== 'object')) {
      return false;
    }

    // Validate enum values are arrays
    if (schema.enum && !Array.isArray(schema.enum)) {
      return false;
    }

    // Validate required is boolean or array
    if (schema.required !== undefined && typeof schema.required !== 'boolean' && !Array.isArray(schema.required)) {
      return false;
    }

    return true;
  }

  /**
   * Create system prompt for workflow generation
   */
  private createSystemPrompt(): string {
    return `You are an expert workflow automation specialist. Your job is to create multi-step workflows from natural language descriptions.

IMPORTANT: Always generate MULTI-STEP workflows for complex requests. Break down complex workflows into 2-5 logical steps.

CRITICAL: When creating API call steps, you MUST use the exact connection IDs provided in the available connections. The apiConnectionId field must match one of the connection IDs from the available connections list.

WORKFLOW PLANNING RULES:
1. For complex requests, create multiple steps (2-5 steps)
2. Each step should have a clear purpose and action
3. Steps should flow logically from one to the next
4. Use data mapping between steps when possible
5. Include conditional logic when appropriate
6. For API calls, use the exact connection ID from the available connections

COMMON WORKFLOW PATTERNS:
- Webhook → Transform → Action (3 steps)
- Monitor → Filter → Notify → Log (4 steps)
- Collect → Process → Store → Notify (4 steps)
- Trigger → Validate → Execute → Confirm (4 steps)

STEP TYPES:
- api_call: Make an API request (requires valid apiConnectionId)
- data_transform: Transform data between steps
- condition: Add conditional logic
- webhook: Set up webhook monitoring

DATA FLOW:
- Map outputs from one step to inputs of the next step
- Use JSON path expressions for data mapping
- Include data validation between steps

CONNECTION ID REQUIREMENTS:
- For api_call steps, the apiConnectionId must be one of the available connection IDs
- Do not use hardcoded or example connection IDs
- Use the exact connection ID from the available connections list

EXAMPLES:
User: "When a new GitHub issue is created, send a Slack notification and create a Trello card"
Steps:
1. Monitor GitHub issues (webhook)
2. Send Slack notification (api_call with correct connection ID)
3. Create Trello card (api_call with correct connection ID)

User: "When a customer places an order, create invoice, send email, update inventory"
Steps:
1. Monitor orders (webhook)
2. Create invoice in QuickBooks (api_call with correct connection ID)
3. Send confirmation email (api_call with correct connection ID)
4. Update inventory in Shopify (api_call with correct connection ID)

Available API endpoints are provided as functions. Use the most appropriate endpoints for each step and ensure you use the correct connection IDs.

Generate workflows that are:
- Practical and executable
- Well-structured with clear step purposes
- Include proper data flow between steps
- Handle errors gracefully
- Follow best practices for workflow automation
- Use valid connection IDs for all API calls`;
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
}