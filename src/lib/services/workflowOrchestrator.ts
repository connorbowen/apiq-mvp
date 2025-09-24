/**
 * Workflow Orchestrator
 * 
 * Coordinates the specialized workflow services to create complete workflows
 * from natural language descriptions. This orchestrator replaces the monolithic
 * prompt approach with focused, maintainable services.
 * 
 * Services Coordinated:
 * 1. WorkflowPlanningService - Analyze user intent and plan structure
 * 2. StepGenerationService - Generate individual workflow steps
 * 3. ConnectionValidationService - Validate and map connection IDs
 * 
 * Features:
 * - Multi-prompt architecture for better performance
 * - Specialized services for each workflow aspect
 * - Comprehensive error handling and fallbacks
 * - Detailed logging and monitoring
 */

import { OpenAIService } from '../../services/openaiService';
import { WorkflowPlanningService, WorkflowPlanningRequest, WorkflowPlanningResult } from './workflowPlanningService';
import { StepGenerationService, StepGenerationRequest, StepGenerationResult } from './stepGenerationService';
import { ConnectionValidationService, ConnectionValidationRequest, ConnectionValidationResult } from './connectionValidationService';
import { logInfo, logError } from '../../utils/logger';

export interface WorkflowOrchestratorRequest {
  userDescription: string;
  userId: string;
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

export interface WorkflowOrchestratorResult {
  success: boolean;
  workflow?: {
    id: string;
    name: string;
    description: string;
    steps: Array<{
      id: string;
      name: string;
      type: string;
      description: string;
      order: number;
      apiConnectionId?: string;
      endpoint?: string;
      method?: string;
      parameters?: Record<string, any>;
      dataMapping?: Record<string, string>;
      conditions?: any;
    }>;
    explanation: string;
    complexity: 'simple' | 'medium' | 'complex';
    confidence: number;
  };
  error?: string;
  processingTime?: number;
}

export class WorkflowOrchestrator {
  private openaiService: OpenAIService;
  private planningService: WorkflowPlanningService;
  private stepGenerationService: StepGenerationService;
  private validationService: ConnectionValidationService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
    this.planningService = new WorkflowPlanningService(openaiService);
    this.stepGenerationService = new StepGenerationService(openaiService);
    this.validationService = new ConnectionValidationService(openaiService);
  }

  /**
   * Generate a complete workflow using multi-prompt architecture
   */
  async generateWorkflow(request: WorkflowOrchestratorRequest): Promise<WorkflowOrchestratorResult> {
    const startTime = Date.now();
    
    logInfo('🔍 WorkflowOrchestrator: Starting multi-prompt workflow generation', {
      userDescription: request.userDescription,
      connectionsCount: request.availableConnections.length,
      userId: request.userId
    });

    try {
      // Step 1: Plan the workflow structure
      const planningResult = await this.planWorkflow(request);
      if (!planningResult.success) {
        return {
          success: false,
          error: planningResult.error || 'Workflow planning failed',
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Generate individual steps
      const stepGenerationResult = await this.generateSteps(request, planningResult.workflowPlan!);
      if (!stepGenerationResult.success) {
        return {
          success: false,
          error: stepGenerationResult.error || 'Step generation failed',
          processingTime: Date.now() - startTime
        };
      }

      // Step 3: Validate connections
      const validationResult = await this.validateConnections(request, stepGenerationResult.steps!);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error || 'Connection validation failed',
          processingTime: Date.now() - startTime
        };
      }

      // Step 4: Build final workflow
      const workflow = this.buildFinalWorkflow(
        planningResult.workflowPlan!,
        validationResult.validatedSteps!,
        request
      );

      logInfo('🔍 WorkflowOrchestrator: Multi-prompt workflow generation completed successfully', {
        workflowName: workflow.name,
        stepsCount: workflow.steps.length,
        complexity: workflow.complexity,
        confidence: workflow.confidence,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        workflow,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logError('🔍 WorkflowOrchestrator: Workflow generation failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in workflow generation',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Step 1: Plan the workflow structure
   */
  private async planWorkflow(request: WorkflowOrchestratorRequest): Promise<WorkflowPlanningResult> {
    logInfo('🔍 WorkflowOrchestrator: Step 1 - Workflow planning');
    
    const planningRequest: WorkflowPlanningRequest = {
      userDescription: request.userDescription,
      availableConnections: request.availableConnections,
      context: request.context
    };

    return await this.planningService.planWorkflow(planningRequest);
  }

  /**
   * Step 2: Generate individual workflow steps
   */
  private async generateSteps(
    request: WorkflowOrchestratorRequest, 
    workflowPlan: WorkflowPlanningResult['workflowPlan']
  ): Promise<StepGenerationResult> {
    logInfo('🔍 WorkflowOrchestrator: Step 2 - Step generation');
    
    const stepGenerationRequest: StepGenerationRequest = {
      userDescription: request.userDescription,
      workflowPlan: workflowPlan!,
      availableConnections: request.availableConnections,
      context: request.context
    };

    return await this.stepGenerationService.generateSteps(stepGenerationRequest);
  }

  /**
   * Step 3: Validate connections for all steps
   */
  private async validateConnections(
    request: WorkflowOrchestratorRequest, 
    steps: StepGenerationResult['steps']
  ): Promise<ConnectionValidationResult> {
    logInfo('🔍 WorkflowOrchestrator: Step 3 - Connection validation');
    
    const validationRequest: ConnectionValidationRequest = {
      steps: steps!,
      availableConnections: request.availableConnections,
      userDescription: request.userDescription
    };

    return await this.validationService.validateConnections(validationRequest);
  }

  /**
   * Build the final workflow from all components
   */
  private buildFinalWorkflow(
    workflowPlan: WorkflowPlanningResult['workflowPlan'],
    validatedSteps: ConnectionValidationResult['validatedSteps'],
    request: WorkflowOrchestratorRequest
  ) {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build steps from validated results
    const steps = validatedSteps!.map(validatedStep => {
      const originalStep = validatedSteps!.find(s => s.id === validatedStep.id);
      return {
        id: validatedStep.id,
        name: validatedStep.name,
        type: validatedStep.type,
        description: this.generateStepDescription(validatedStep),
        order: parseInt(validatedStep.id.split('_')[1]) || 1,
        apiConnectionId: validatedStep.apiConnectionId,
        endpoint: validatedStep.endpoint,
        method: validatedStep.method,
        parameters: this.extractParameters(validatedStep),
        dataMapping: this.extractDataMapping(validatedStep),
        conditions: this.extractConditions(validatedStep)
      };
    });

    // Generate explanation
    const explanation = this.generateWorkflowExplanation(workflowPlan!, steps, request);

    return {
      id: workflowId,
      name: workflowPlan!.name,
      description: workflowPlan!.description,
      steps,
      explanation,
      complexity: workflowPlan!.complexity,
      confidence: workflowPlan!.confidence
    };
  }

  /**
   * Generate description for a workflow step
   */
  private generateStepDescription(validatedStep: any): string {
    switch (validatedStep.type) {
      case 'webhook':
        return 'Monitor for trigger events';
      case 'api_call':
        return `Make API call to ${validatedStep.name}`;
      case 'data_transform':
        return 'Transform data between steps';
      case 'condition':
        return 'Apply conditional logic';
      default:
        return `Execute ${validatedStep.name}`;
    }
  }

  /**
   * Extract parameters from validated step
   */
  private extractParameters(validatedStep: any): Record<string, any> {
    // Basic parameter extraction - can be enhanced based on step type
    const parameters: Record<string, any> = {};
    
    if (validatedStep.type === 'api_call') {
      parameters['status'] = 'active';
      parameters['limit'] = 10;
    }
    
    return parameters;
  }

  /**
   * Extract data mapping from validated step
   */
  private extractDataMapping(validatedStep: any): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    if (validatedStep.type === 'data_transform') {
      mapping['source_field'] = 'target_field';
    }
    
    return mapping;
  }

  /**
   * Extract conditions from validated step
   */
  private extractConditions(validatedStep: any): any {
    if (validatedStep.type === 'condition') {
      return {
        condition: 'default',
        action: 'proceed'
      };
    }
    
    return undefined;
  }

  /**
   * Generate comprehensive workflow explanation
   */
  private generateWorkflowExplanation(
    workflowPlan: WorkflowPlanningResult['workflowPlan'],
    steps: any[],
    request: WorkflowOrchestratorRequest
  ): string {
    const stepDescriptions = steps.map((step, index) => 
      `${index + 1}. ${step.name}: ${step.description}`
    ).join('\n');

    return `I've created a ${workflowPlan!.complexity} workflow called "${workflowPlan!.name}" that will:

${stepDescriptions}

This workflow will help you ${request.userDescription.toLowerCase()}. The workflow is designed to be ${workflowPlan!.complexity} and includes ${steps.length} steps that will execute in sequence.

You can now test this workflow or make modifications as needed.`;
  }
}
