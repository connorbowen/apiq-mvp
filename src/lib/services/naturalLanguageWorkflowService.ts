import OpenAI from 'openai';
import { prisma } from '../../../lib/database/client';
import { WorkflowOrchestrator } from './workflowOrchestrator';
import { OpenAIService } from '../../services/openaiService';

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
  private workflowOrchestrator: WorkflowOrchestrator;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: false,
    });
    this.workflowOrchestrator = new WorkflowOrchestrator(new (OpenAIService as any)(apiKey, 'gpt-4o-mini'));
  }

  /**
   * Generate a workflow from natural language description using multi-prompt architecture
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResponse> {
    try {
      console.log('🔍 NaturalLanguageWorkflowService: Starting multi-prompt workflow generation');
      console.log('🔍 NaturalLanguageWorkflowService: User description:', request.userDescription);
      console.log('🔍 NaturalLanguageWorkflowService: Available connections:', request.availableConnections.length);

      // Basic validation
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

      // Use the new WorkflowOrchestrator for multi-prompt processing
      const orchestratorResult = await this.workflowOrchestrator.generateWorkflow({
        userDescription: request.userDescription,
        availableConnections: connectionsWithEndpoints,
        context: request.context || '',
        userId: request.userId
      });

      if (!orchestratorResult.success) {
        return {
          success: false,
          error: orchestratorResult.error || 'Failed to generate workflow using multi-prompt architecture',
          alternatives: []
        };
      }

      // Convert the orchestrator result to our expected format
      const workflow: GeneratedWorkflow = {
        id: `workflow_${Date.now()}`,
        name: orchestratorResult.workflow?.name || 'Generated Workflow',
        description: orchestratorResult.workflow?.description || 'Workflow generated from natural language request',
        steps: (orchestratorResult.workflow?.steps || []) as WorkflowStep[],
        estimatedExecutionTime: (orchestratorResult.workflow?.steps?.length || 1) * 5000,
        confidence: orchestratorResult.workflow?.confidence || 0.8,
        explanation: orchestratorResult.workflow?.explanation || 'Workflow generated using multi-prompt architecture'
      };

      console.log('✅ NaturalLanguageWorkflowService: Multi-prompt workflow generation completed successfully');
      console.log('✅ NaturalLanguageWorkflowService: Generated workflow:', workflow.name);

      return {
        success: true,
        workflow,
        alternatives: [],
        error: undefined
      };
    } catch (error) {
      console.error('❌ NaturalLanguageWorkflowService: Workflow generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        alternatives: []
      };
    }
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
        const connection = await prisma.apiConnection.findUnique({
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