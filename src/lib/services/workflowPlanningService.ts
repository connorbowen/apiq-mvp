/**
 * Workflow Planning Service
 * 
 * Analyzes user intent and plans the overall workflow structure.
 * This service focuses specifically on understanding what the user wants
 * to accomplish and breaking it down into logical workflow steps.
 * 
 * Features:
 * - AI-powered intent analysis
 * - Workflow structure planning
 * - Rules-based fallback for common patterns
 * - Confidence scoring for planning decisions
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';
import { parseAIResponse } from '../utils/aiResponseParser';

export interface WorkflowPlanningRequest {
  userDescription: string;
  availableConnections: Array<{
    id: string;
    name: string;
    baseUrl?: string;
    endpoints?: Array<{
      path: string;
      method: string;
      summary?: string;
    }>;
  }>;
  context?: string;
}

export interface WorkflowPlanningResult {
  success: boolean;
  workflowPlan?: {
    name: string;
    description: string;
    estimatedSteps: number;
    stepTypes: string[];
    complexity: 'simple' | 'medium' | 'complex';
    confidence: number;
  };
  error?: string;
}

export class WorkflowPlanningService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Analyze user intent and plan workflow structure
   */
  async planWorkflow(request: WorkflowPlanningRequest): Promise<WorkflowPlanningResult> {
    logInfo('🔍 WorkflowPlanningService: Starting workflow planning', {
      userDescription: request.userDescription,
      connectionsCount: request.availableConnections.length
    });

    try {
      // Try AI-powered planning first
      const aiResult = await this.planWorkflowWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 WorkflowPlanningService: AI planning successful', {
          estimatedSteps: aiResult.workflowPlan?.estimatedSteps,
          complexity: aiResult.workflowPlan?.complexity,
          confidence: aiResult.workflowPlan?.confidence
        });
        return aiResult;
      }

      // Fallback to rules-based planning
      logInfo('🔍 WorkflowPlanningService: Falling back to rules-based planning');
      return this.planWorkflowWithRules(request);

    } catch (error) {
      logError('🔍 WorkflowPlanningService: Planning failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Workflow planning failed'
      };
    }
  }

  /**
   * Use AI to analyze user intent and plan workflow structure
   */
  private async planWorkflowWithAI(request: WorkflowPlanningRequest): Promise<WorkflowPlanningResult> {
    try {
      const systemPrompt = this.buildPlanningSystemPrompt(request.availableConnections);
      const userPrompt = this.buildPlanningUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      });

      const parseResult = parseAIResponse(response);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      return {
        success: true,
        workflowPlan: {
          name: (parseResult.data as any).name,
          description: (parseResult.data as any).description,
          estimatedSteps: (parseResult.data as any).estimatedSteps,
          stepTypes: (parseResult.data as any).stepTypes,
          complexity: (parseResult.data as any).complexity,
          confidence: (parseResult.data as any).confidence
        }
      };

    } catch (error) {
      console.error('🔍 WorkflowPlanningService: AI planning failed:', error);
      return {
        success: false,
        error: 'AI planning failed'
      };
    }
  }

  /**
   * Use rules-based planning for common patterns
   */
  private planWorkflowWithRules(request: WorkflowPlanningRequest): WorkflowPlanningResult {
    const description = request.userDescription.toLowerCase();
    
    // Analyze complexity based on keywords
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    let estimatedSteps = 2;
    let stepTypes = ['api_call'];

    if (description.includes('when') || description.includes('trigger') || description.includes('monitor')) {
      stepTypes.unshift('webhook');
      estimatedSteps++;
    }

    if (description.includes('if') || description.includes('condition') || description.includes('check')) {
      stepTypes.push('condition');
      estimatedSteps++;
    }

    if (description.includes('transform') || description.includes('convert') || description.includes('format')) {
      stepTypes.push('data_transform');
      estimatedSteps++;
    }

    // Determine complexity
    if (estimatedSteps >= 4 || stepTypes.length >= 3) {
      complexity = 'complex';
    } else if (estimatedSteps >= 3 || stepTypes.length >= 2) {
      complexity = 'medium';
    }

    return {
      success: true,
      workflowPlan: {
        name: this.generateWorkflowName(request.userDescription),
        description: request.userDescription,
        estimatedSteps,
        stepTypes,
        complexity,
        confidence: 0.7 // Rules-based confidence
      }
    };
  }

  /**
   * Build system prompt for workflow planning
   */
  private buildPlanningSystemPrompt(availableConnections: WorkflowPlanningRequest['availableConnections']): string {
    const connectionInfo = availableConnections.map(conn => 
      `${conn.name} (${conn.id}): ${conn.endpoints?.length || 0} endpoints`
    ).join(', ');

    return `You are an expert workflow planning specialist. Your job is to analyze user requests and plan the overall workflow structure.

Available Connections: ${connectionInfo}

PLANNING RULES:
1. Analyze the user's intent and what they want to accomplish
2. Determine the logical flow of steps needed
3. Estimate the number of steps required (2-5 steps for most workflows)
4. Identify the types of steps needed (api_call, webhook, condition, data_transform)
5. Assess the complexity level (simple, medium, complex)
6. Provide a confidence score for your analysis

STEP TYPES:
- webhook: Monitor for events/triggers
- api_call: Make API requests
- condition: Add conditional logic
- data_transform: Transform data between steps

COMPLEXITY LEVELS:
- simple: 2-3 steps, mostly API calls
- medium: 3-4 steps, mix of step types
- complex: 4+ steps, multiple step types, conditional logic

Respond with JSON in this format:
{
  "name": "Descriptive workflow name",
  "description": "What this workflow accomplishes",
  "estimatedSteps": number,
  "stepTypes": ["webhook", "api_call", "condition", "data_transform"],
  "complexity": "simple|medium|complex",
  "confidence": 0.0-1.0
}`;
  }

  /**
   * Build user prompt for workflow planning
   */
  private buildPlanningUserPrompt(request: WorkflowPlanningRequest): string {
    let prompt = `User Request: "${request.userDescription}"`;
    
    if (request.context) {
      prompt += `\n\nContext: ${request.context}`;
    }

    return prompt;
  }

  /**
   * Generate a descriptive workflow name
   */
  private generateWorkflowName(description: string): string {
    // Extract key words and create a name
    const words = description.toLowerCase().split(' ');
    const keyWords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'with', 'when', 'that', 'this'].includes(word)
    );
    
    return keyWords.slice(0, 3).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Workflow';
  }
}
