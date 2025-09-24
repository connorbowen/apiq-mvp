/**
 * Step Generation Service
 * 
 * Generates individual workflow steps based on the planned workflow structure.
 * This service focuses specifically on creating detailed, executable steps
 * with proper parameters, data mapping, and connection assignments.
 * 
 * Features:
 * - AI-powered step generation
 * - Connection ID validation and assignment
 * - Parameter extraction and mapping
 * - Data flow between steps
 * - Rules-based fallback for common patterns
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';
import { parseAIResponse } from '../utils/aiResponseParser';

export interface StepGenerationRequest {
  userDescription: string;
  workflowPlan: {
    name: string;
    description: string;
    estimatedSteps: number;
    stepTypes: string[];
    complexity: 'simple' | 'medium' | 'complex';
  };
  availableConnections: Array<{
    id: string;
    name: string;
    baseUrl?: string;
    endpoints?: Array<{
      path: string;
      method: string;
      summary?: string;
      parameters?: any[];
    }>;
  }>;
  context?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'api_call' | 'data_transform' | 'condition' | 'webhook';
  description: string;
  order: number;
  apiConnectionId?: string;
  endpoint?: string;
  method?: string;
  parameters?: Record<string, any>;
  dataMapping?: Record<string, string>;
  conditions?: any;
}

export interface StepGenerationResult {
  success: boolean;
  steps?: WorkflowStep[];
  error?: string;
}

export class StepGenerationService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Generate workflow steps based on the plan
   */
  async generateSteps(request: StepGenerationRequest): Promise<StepGenerationResult> {
    logInfo('🔍 StepGenerationService: Starting step generation', {
      workflowName: request.workflowPlan.name,
      estimatedSteps: request.workflowPlan.estimatedSteps,
      stepTypes: request.workflowPlan.stepTypes
    });

    try {
      // Try AI-powered step generation first
      const aiResult = await this.generateStepsWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 StepGenerationService: AI generation successful', {
          stepsGenerated: aiResult.steps?.length,
          stepTypes: aiResult.steps?.map(s => s.type)
        });
        return aiResult;
      }

      // Fallback to rules-based generation
      logInfo('🔍 StepGenerationService: Falling back to rules-based generation');
      return this.generateStepsWithRules(request);

    } catch (error) {
      logError('🔍 StepGenerationService: Step generation failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Step generation failed'
      };
    }
  }

  /**
   * Use AI to generate detailed workflow steps
   */
  private async generateStepsWithAI(request: StepGenerationRequest): Promise<StepGenerationResult> {
    try {
      const systemPrompt = this.buildStepGenerationSystemPrompt(request.availableConnections);
      const userPrompt = this.buildStepGenerationUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1000
      });

      const parseResult = parseAIResponse(response);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      return {
        success: true,
        steps: (parseResult.data as any).steps.map((step: any, index: number) => ({
          id: step.id || `step_${index + 1}`,
          name: step.name,
          type: step.type,
          description: step.description,
          order: step.order || index + 1,
          apiConnectionId: step.apiConnectionId,
          endpoint: step.endpoint,
          method: step.method,
          parameters: step.parameters,
          dataMapping: step.dataMapping,
          conditions: step.conditions
        }))
      };

    } catch (error) {
      console.error('🔍 StepGenerationService: AI generation failed:', error);
      return {
        success: false,
        error: 'AI step generation failed'
      };
    }
  }

  /**
   * Use rules-based step generation for common patterns
   */
  private generateStepsWithRules(request: StepGenerationRequest): StepGenerationResult {
    const steps: WorkflowStep[] = [];
    const description = request.userDescription.toLowerCase();
    
    let stepOrder = 1;

    // Generate webhook step if monitoring is needed
    if (description.includes('when') || description.includes('trigger') || description.includes('monitor')) {
      steps.push({
        id: `step_${stepOrder}`,
        name: 'Monitor for Events',
        type: 'webhook',
        description: 'Monitor for the specified trigger event',
        order: stepOrder++,
        conditions: {
          trigger: this.extractTriggerCondition(description)
        }
      });
    }

    // Generate API call steps
    const apiCallSteps = this.generateApiCallSteps(request, stepOrder);
    steps.push(...apiCallSteps);
    stepOrder += apiCallSteps.length;

    // Generate data transform steps if needed
    if (description.includes('transform') || description.includes('convert') || description.includes('format')) {
      steps.push({
        id: `step_${stepOrder}`,
        name: 'Transform Data',
        type: 'data_transform',
        description: 'Transform data between steps',
        order: stepOrder++,
        dataMapping: this.generateDataMapping(description)
      });
    }

    // Generate condition steps if needed
    if (description.includes('if') || description.includes('condition') || description.includes('check')) {
      steps.push({
        id: `step_${stepOrder}`,
        name: 'Apply Condition',
        type: 'condition',
        description: 'Apply conditional logic',
        order: stepOrder++,
        conditions: this.generateConditionLogic(description)
      });
    }

    return {
      success: true,
      steps
    };
  }

  /**
   * Build system prompt for step generation
   */
  private buildStepGenerationSystemPrompt(availableConnections: StepGenerationRequest['availableConnections']): string {
    const connectionInfo = availableConnections.map(conn => 
      `**${conn.name}** (ID: ${conn.id})
Base URL: ${conn.baseUrl || 'N/A'}
Endpoints: ${conn.endpoints?.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'None'}`
    ).join('\n\n');

    return `You are an expert workflow step generation specialist. Your job is to create detailed, executable workflow steps.

Available Connections:
${connectionInfo}

STEP GENERATION RULES:
1. Create steps that match the planned workflow structure
2. Use ONLY the exact connection IDs provided above
3. Assign appropriate endpoints and methods for API calls
4. Include necessary parameters for each step
5. Set up data mapping between steps when needed
6. Add conditional logic when required
7. Ensure steps flow logically from one to the next

STEP TYPES:
- webhook: Monitor for trigger events
- api_call: Make API requests (REQUIRES valid connection ID)
- data_transform: Transform data between steps
- condition: Add conditional logic

CRITICAL: For api_call steps, the apiConnectionId MUST be exactly one of the available connection IDs listed above.

Respond with JSON in this format:
{
  "steps": [
    {
      "id": "step_1",
      "name": "Step Name",
      "type": "api_call|webhook|data_transform|condition",
      "description": "What this step does",
      "order": 1,
      "apiConnectionId": "connection_id_from_available_connections",
      "endpoint": "/api/endpoint",
      "method": "GET|POST|PUT|DELETE",
      "parameters": {"param": "value"},
      "dataMapping": {"source": "target"},
      "conditions": {"condition": "value"}
    }
  ]
}`;
  }

  /**
   * Build user prompt for step generation
   */
  private buildStepGenerationUserPrompt(request: StepGenerationRequest): string {
    return `Generate workflow steps for this request:

User Description: "${request.userDescription}"

Planned Workflow:
- Name: ${request.workflowPlan.name}
- Description: ${request.workflowPlan.description}
- Estimated Steps: ${request.workflowPlan.estimatedSteps}
- Step Types: ${request.workflowPlan.stepTypes.join(', ')}
- Complexity: ${request.workflowPlan.complexity}

${request.context ? `Context: ${request.context}` : ''}`;
  }

  /**
   * Generate API call steps based on available connections
   */
  private generateApiCallSteps(request: StepGenerationRequest, startOrder: number): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    const description = request.userDescription.toLowerCase();
    
    // Find relevant connections based on description
    const relevantConnections = request.availableConnections.filter(conn => {
      const connName = conn.name.toLowerCase();
      return description.includes(connName) || 
             conn.endpoints?.some(ep => 
               description.includes(ep.path.toLowerCase()) ||
               description.includes(ep.method.toLowerCase())
             );
    });

    relevantConnections.forEach((conn, index) => {
      const endpoint = conn.endpoints?.[0]; // Use first available endpoint
      if (endpoint) {
        steps.push({
          id: `step_${startOrder + index}`,
          name: `${conn.name} API Call`,
          type: 'api_call',
          description: `Make API call to ${conn.name}`,
          order: startOrder + index,
          apiConnectionId: conn.id,
          endpoint: endpoint.path,
          method: endpoint.method,
          parameters: this.extractParameters(description, endpoint)
        });
      }
    });

    return steps;
  }

  /**
   * Extract trigger condition from description
   */
  private extractTriggerCondition(description: string): string {
    if (description.includes('github issue')) return 'github_issue_created';
    if (description.includes('slack message')) return 'slack_message_received';
    if (description.includes('email')) return 'email_received';
    return 'custom_trigger';
  }

  /**
   * Generate data mapping based on description
   */
  private generateDataMapping(description: string): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    if (description.includes('slack') && description.includes('github')) {
      mapping['issue_title'] = 'message_text';
      mapping['issue_url'] = 'message_link';
    }
    
    return mapping;
  }

  /**
   * Generate condition logic based on description
   */
  private generateConditionLogic(description: string): any {
    if (description.includes('if') && description.includes('urgent')) {
      return {
        condition: 'priority === "urgent"',
        action: 'send_notification'
      };
    }
    
    return {
      condition: 'default',
      action: 'proceed'
    };
  }

  /**
   * Extract parameters from description for an endpoint
   */
  private extractParameters(description: string, endpoint: any): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Basic parameter extraction based on common patterns
    if (description.includes('status')) {
      parameters['status'] = 'active';
    }
    
    if (description.includes('limit')) {
      parameters['limit'] = 10;
    }
    
    return parameters;
  }
}
