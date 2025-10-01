/**
 * Enhanced Connection Guidance Orchestrator
 * 
 * Coordinates the specialized connection guidance services using multi-prompt architecture.
 * This orchestrator replaces the monolithic prompt approach with focused, maintainable services.
 * 
 * Services Coordinated:
 * 1. IntentAnalysisService - Analyze what user wants to accomplish
 * 2. ApiRequirementService - Determine which APIs are needed
 * 3. GuidanceGenerationService - Generate setup instructions
 * 
 * Features:
 * - Multi-prompt architecture for better performance
 * - Specialized services for each guidance aspect
 * - Comprehensive error handling and fallbacks
 * - Detailed logging and monitoring
 */

import { OpenAIService } from '../../services/openaiService';
import { IntentAnalysisService, IntentAnalysisRequest, IntentAnalysisResult } from './intentAnalysisService';
import { ApiRequirementService, ApiRequirementRequest, ApiRequirementResult } from './apiRequirementService';
import { GuidanceGenerationService, GuidanceGenerationRequest, GuidanceGenerationResult } from './guidanceGenerationService';
import { logInfo, logError } from '../../utils/logger';

export interface ConnectionGuidanceResponse {
  shouldProvideGuidance: boolean;
  guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none';
  message: string;
  details?: {
    requiredApis: Array<{
      name: string;
      displayName: string;
      description: string;
      authType: string;
      setupInstructions: {
        step1: string;
        step2: string;
        step3: string;
        additionalNotes?: string;
      };
      documentationUrl: string;
      baseUrl: string;
      commonEndpoints: string[];
    }>;
    suggestedWorkflow?: string;
    userIntent?: string;
  };
}

export interface MessageContext {
  message: string;
  availableConnections: Array<{
    name: string;
    id: string;
    baseUrl?: string;
    endpoints?: Array<{ path: string; method: string; summary: string }>;
  }>;
  userId: string;
  context?: Record<string, any>;
}

export class EnhancedConnectionGuidanceOrchestrator {
  private openaiService: OpenAIService;
  private intentAnalysisService: IntentAnalysisService;
  private apiRequirementService: ApiRequirementService;
  private guidanceGenerationService: GuidanceGenerationService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
    this.intentAnalysisService = new IntentAnalysisService(openaiService);
    this.apiRequirementService = new ApiRequirementService(openaiService);
    this.guidanceGenerationService = new GuidanceGenerationService(openaiService);
  }

  /**
   * Process message using multi-prompt architecture
   */
  async processMessage(context: MessageContext): Promise<ConnectionGuidanceResponse> {
    const startTime = Date.now();
    
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Starting multi-prompt processing', {
      message: context.message,
      connectionsCount: context.availableConnections.length,
      userId: context.userId
    });

    try {
      // Step 1: Analyze user intent
      const intentResult = await this.analyzeIntent(context);
      if (!intentResult.success) {
        return this.createErrorResponse(intentResult.error || 'Intent analysis failed');
      }

      // Step 2: Determine API requirements
      const requirementResult = await this.determineApiRequirements(context, intentResult.intent!);
      if (!requirementResult.success) {
        return this.createErrorResponse(requirementResult.error || 'API requirement analysis failed');
      }

      // Step 3: Generate specific guidance
      const guidanceResult = await this.generateGuidance(context, intentResult.intent!, requirementResult.requirements!);
      if (!guidanceResult.success) {
        return this.createErrorResponse(guidanceResult.error || 'Guidance generation failed');
      }

      logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Multi-prompt processing completed successfully', {
        guidanceType: guidanceResult.guidance?.guidanceType,
        shouldProvideGuidance: guidanceResult.guidance?.shouldProvideGuidance,
        processingTime: Date.now() - startTime
      });

      return guidanceResult.guidance!;

    } catch (error) {
      logError('🔍 EnhancedConnectionGuidanceOrchestrator: Processing failed', error as Error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Step 1: Analyze user intent
   */
  private async analyzeIntent(context: MessageContext): Promise<IntentAnalysisResult> {
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Step 1 - Intent analysis');
    
    const intentRequest: IntentAnalysisRequest = {
      userMessage: context.message,
      availableConnections: context.availableConnections,
      context: context.context
    };

    return await this.intentAnalysisService.analyzeIntent(intentRequest);
  }

  /**
   * Step 2: Determine API requirements
   */
  private async determineApiRequirements(
    context: MessageContext, 
    userIntent: IntentAnalysisResult['intent']
  ): Promise<ApiRequirementResult> {
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Step 2 - API requirement analysis');
    
    const requirementRequest: ApiRequirementRequest = {
      userMessage: context.message,
      userIntent: userIntent!,
      availableConnections: context.availableConnections,
      context: context.context
    };

    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: About to call ApiRequirementService', {
      message: requirementRequest.userMessage,
      guidanceType: requirementRequest.userIntent.guidanceType,
      connectionsCount: requirementRequest.availableConnections.length
    });

    const result = await this.apiRequirementService.determineApiRequirements(requirementRequest);
    
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: ApiRequirementService result', {
      success: result.success,
      requiredApis: result.requirements?.requiredApis?.length || 0,
      missingApis: result.requirements?.missingApis?.length || 0,
      requiresGuidance: result.requirements?.requiresGuidance || false
    });

    return result;
  }

  /**
   * Step 3: Generate specific guidance
   */
  private async generateGuidance(
    context: MessageContext,
    userIntent: IntentAnalysisResult['intent'],
    apiRequirements: ApiRequirementResult['requirements']
  ): Promise<GuidanceGenerationResult> {
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Step 3 - Guidance generation');
    
    const guidanceRequest: GuidanceGenerationRequest = {
      userMessage: context.message,
      userIntent: userIntent!,
      apiRequirements: apiRequirements!,
      context: context.context
    };

    return await this.guidanceGenerationService.generateGuidance(guidanceRequest);
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: string): ConnectionGuidanceResponse {
    return {
      shouldProvideGuidance: true,
      guidanceType: 'general',
      message: `I encountered an error while processing your request: ${error}. Please try again or contact support if the issue persists.`,
      details: {
        requiredApis: [],
        userIntent: 'Error handling'
      }
    };
  }

  /**
   * Generate general guidance when no connections are available
   */
  async generateGeneralGuidance(message: string): Promise<ConnectionGuidanceResponse> {
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Generating general guidance');
    
    return {
      shouldProvideGuidance: true,
      guidanceType: 'connection_setup',
      message: 'To get started, you\'ll need to set up API connections. I can help you connect to popular services like Slack, GitHub, Trello, and more. What would you like to accomplish?',
      details: {
        requiredApis: [],
        userIntent: 'General setup guidance',
        suggestedWorkflow: 'Start by setting up your first API connection'
      }
    };
  }

  /**
   * Generate specific guidance for required APIs
   */
  private generateSpecificGuidance(aiAnalysis: any, userMessage: string): ConnectionGuidanceResponse {
    logInfo('🔍 EnhancedConnectionGuidanceOrchestrator: Generating specific guidance');
    
    // This method would be called by the original orchestrator
    // For now, return a basic response
    return {
      shouldProvideGuidance: true,
      guidanceType: 'api_specific',
      message: 'You need to set up additional API connections to complete your request.',
      details: {
        requiredApis: [],
        userIntent: userMessage,
        suggestedWorkflow: 'Set up the required API connections first'
      }
    };
  }
}
