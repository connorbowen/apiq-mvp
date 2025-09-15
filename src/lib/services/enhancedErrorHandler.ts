/**
 * Enhanced Error Handler
 * 
 * Integrates AI-powered error analysis with existing error handling
 * to provide intelligent error recovery and user guidance.
 */

import { AIErrorHandlingService, ErrorContext, ErrorAnalysis, RecoveryAction } from './aiErrorHandlingService';
import { OpenAIService } from '../../services/openaiService';

export interface EnhancedErrorResponse {
  success: false;
  error: string;
  errorAnalysis?: ErrorAnalysis;
  recoveryActions?: RecoveryAction[];
  shouldRetry?: boolean;
  retryDelay?: number;
  userGuidance?: string;
  technicalDetails?: string;
}

export class EnhancedErrorHandler {
  private aiErrorService: AIErrorHandlingService;

  constructor(openaiService: OpenAIService) {
    this.aiErrorService = new AIErrorHandlingService(openaiService);
  }

  /**
   * Handle an error with AI-powered analysis and recovery suggestions
   */
  async handleError(
    error: Error | string,
    context: ErrorContext,
    fallbackMessage: string = 'An error occurred'
  ): Promise<EnhancedErrorResponse> {
    try {
      // Analyze the error using AI
      const errorAnalysis = await this.aiErrorService.analyzeError(error, context);
      
      // Generate recovery actions
      const recoveryActions = await this.aiErrorService.generateRecoveryActions(errorAnalysis, context);
      
      // Determine if we should suggest retry
      const shouldRetry = errorAnalysis.shouldRetry && (context.retryCount ?? 0) < 3;
      
      // Generate user guidance
      const userGuidance = this.generateUserGuidance(errorAnalysis, recoveryActions);

      return {
        success: false,
        error: errorAnalysis.userFriendlyMessage,
        errorAnalysis,
        recoveryActions,
        shouldRetry,
        retryDelay: errorAnalysis.retryDelay,
        userGuidance,
        technicalDetails: errorAnalysis.technicalDetails
      };

    } catch (aiError) {
      console.error('Enhanced error handling failed, using fallback:', aiError);
      
      // Fallback to basic error handling
      return {
        success: false,
        error: fallbackMessage,
        userGuidance: 'Please try again or contact support if the issue persists.'
      };
    }
  }

  /**
   * Handle API execution errors with context
   */
  async handleApiError(
    error: Error | string,
    context: {
      endpoint: string;
      method: string;
      statusCode?: number;
      parameters?: Record<string, any>;
      connectionId?: string;
      userMessage?: string;
    }
  ): Promise<EnhancedErrorResponse> {
    const errorContext: ErrorContext = {
      operation: 'api_execution',
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode,
      userMessage: context.userMessage,
      parameters: context.parameters,
      connectionId: context.connectionId,
      retryCount: 0
    };

    return this.handleError(error, errorContext, 'API execution failed');
  }

  /**
   * Handle workflow execution errors with context
   */
  async handleWorkflowError(
    error: Error | string,
    context: {
      workflowId: string;
      stepId?: string;
      stepName?: string;
      previousErrors?: string[];
      retryCount?: number;
    }
  ): Promise<EnhancedErrorResponse> {
    const errorContext: ErrorContext = {
      operation: 'workflow_execution',
      userMessage: `Workflow execution failed at step: ${context.stepName || 'unknown'}`,
      previousErrors: context.previousErrors,
      retryCount: context.retryCount || 0
    };

    return this.handleError(error, errorContext, 'Workflow execution failed');
  }

  /**
   * Handle connection errors with context
   */
  async handleConnectionError(
    error: Error | string,
    context: {
      connectionId: string;
      connectionName: string;
      authType: string;
      userMessage?: string;
    }
  ): Promise<EnhancedErrorResponse> {
    const errorContext: ErrorContext = {
      operation: 'connection_test',
      userMessage: context.userMessage || `Connection test failed for ${context.connectionName}`,
      connectionId: context.connectionId
    };

    return this.handleError(error, errorContext, 'Connection test failed');
  }

  /**
   * Handle parameter extraction errors with context
   */
  async handleParameterError(
    error: Error | string,
    context: {
      endpoint: string;
      parameters: Record<string, any>;
      userMessage: string;
    }
  ): Promise<EnhancedErrorResponse> {
    const errorContext: ErrorContext = {
      operation: 'parameter_extraction',
      endpoint: context.endpoint,
      userMessage: context.userMessage,
      parameters: context.parameters
    };

    return this.handleError(error, errorContext, 'Parameter extraction failed');
  }

  /**
   * Generate user-friendly guidance based on error analysis and recovery actions
   */
  private generateUserGuidance(errorAnalysis: ErrorAnalysis, recoveryActions: RecoveryAction[]): string {
    let guidance = errorAnalysis.userFriendlyMessage;
    
    if (recoveryActions.length > 0) {
      const primaryAction = recoveryActions[0];
      guidance += `\n\n**Suggested Action:** ${primaryAction.description}`;
      
      if (primaryAction.steps.length > 0) {
        guidance += '\n\n**Steps to resolve:**';
        primaryAction.steps.forEach((step, index) => {
          guidance += `\n${index + 1}. ${step}`;
        });
      }
    }

    if (errorAnalysis.alternativeActions && errorAnalysis.alternativeActions.length > 0) {
      guidance += '\n\n**Alternative approaches:**';
      errorAnalysis.alternativeActions.forEach(action => {
        guidance += `\n• ${action}`;
      });
    }

    return guidance;
  }

  /**
   * Create a simple error response without AI analysis (for performance-critical paths)
   */
  static createSimpleErrorResponse(
    error: Error | string,
    fallbackMessage: string = 'An error occurred'
  ): EnhancedErrorResponse {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    return {
      success: false,
      error: fallbackMessage,
      userGuidance: 'Please try again or contact support if the issue persists.',
      technicalDetails: errorMessage
    };
  }

  /**
   * Check if an error is retryable based on common patterns
   */
  static isRetryableError(error: Error | string): boolean {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerError = errorMessage.toLowerCase();
    
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'temporary',
      'server error',
      'service unavailable',
      'gateway timeout'
    ];
    
    return retryablePatterns.some(pattern => lowerError.includes(pattern));
  }

  /**
   * Get suggested retry delay based on error type
   */
  static getRetryDelay(error: Error | string, retryCount: number = 0): number {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerError = errorMessage.toLowerCase();
    
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    // Special cases
    if (lowerError.includes('rate limit')) {
      return 5000 + jitter; // 5 seconds for rate limits
    }
    
    if (lowerError.includes('timeout')) {
      return 2000 + jitter; // 2 seconds for timeouts
    }
    
    return delay + jitter;
  }
}
