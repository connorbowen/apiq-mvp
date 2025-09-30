/**
 * AI-Powered Error Handling Service
 * 
 * Uses AI to intelligently analyze errors and provide recovery suggestions
 * instead of generic error messages.
 */

import { OpenAIService } from '../../services/openaiService';

export interface ErrorContext {
  operation: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userMessage?: string;
  parameters?: Record<string, any>;
  connectionId?: string;
  previousErrors?: string[];
  retryCount?: number;
}

export interface ErrorAnalysis {
  errorType: 'authentication' | 'validation' | 'network' | 'rate_limit' | 'permission' | 'not_found' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userFriendlyMessage: string;
  technicalDetails: string;
  recoverySuggestions: string[];
  shouldRetry: boolean;
  retryDelay?: number;
  alternativeActions?: string[];
  confidence: number;
}

export interface RecoveryAction {
  action: 'retry' | 'fix_parameters' | 'check_connection' | 'contact_support' | 'try_alternative' | 'skip';
  description: string;
  steps: string[];
  confidence: number;
  requiresUserAction: boolean;
}

export class AIErrorHandlingService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Analyze an error and provide intelligent recovery suggestions
   */
  async analyzeError(
    error: Error | string,
    context: ErrorContext
  ): Promise<ErrorAnalysis> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const systemPrompt = this.buildErrorAnalysisPrompt();
      
      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.buildErrorContextPrompt(errorMessage, context) }
      ], {
        model: (this.openaiService as any).model,
        functions: [
          {
            name: 'analyze_error',
            description: 'Analyze error and provide recovery suggestions',
            parameters: {
              type: 'object',
              properties: {
                errorType: {
                  type: 'string',
                  enum: ['authentication', 'validation', 'network', 'rate_limit', 'permission', 'not_found', 'server', 'unknown'],
                  description: 'Category of the error'
                },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Severity level of the error'
                },
                userFriendlyMessage: {
                  type: 'string',
                  description: 'User-friendly explanation of what went wrong'
                },
                technicalDetails: {
                  type: 'string',
                  description: 'Technical details for debugging'
                },
                recoverySuggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific steps to resolve the error'
                },
                shouldRetry: {
                  type: 'boolean',
                  description: 'Whether the operation should be retried'
                },
                retryDelay: {
                  type: 'number',
                  description: 'Suggested delay before retry in seconds'
                },
                alternativeActions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Alternative approaches if retry fails'
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence in the analysis'
                }
              },
              required: ['errorType', 'severity', 'userFriendlyMessage', 'technicalDetails', 'recoverySuggestions', 'shouldRetry', 'confidence']
            }
          }
        ],
        function_call: { name: 'analyze_error' },
        temperature: 0.1,
        max_tokens: 1000
      });

      // chatCompletion returns full response when functions are used
      const functionCall = response.choices?.[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'analyze_error') {
        throw new Error('Failed to analyze error: Invalid response from AI');
      }

      const result = JSON.parse(functionCall.arguments);
      
      return {
        errorType: result.errorType,
        severity: result.severity,
        userFriendlyMessage: result.userFriendlyMessage,
        technicalDetails: result.technicalDetails,
        recoverySuggestions: result.recoverySuggestions || [],
        shouldRetry: result.shouldRetry,
        retryDelay: result.retryDelay,
        alternativeActions: result.alternativeActions || [],
        confidence: result.confidence || 0.5
      };

    } catch (aiError) {
      console.error('AI error analysis failed:', aiError);
      
      // Fallback to basic error analysis
      return this.fallbackErrorAnalysis(error, context);
    }
  }

  /**
   * Generate specific recovery actions based on error analysis
   */
  async generateRecoveryActions(
    errorAnalysis: ErrorAnalysis,
    context: ErrorContext
  ): Promise<RecoveryAction[]> {
    try {
      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: this.buildRecoveryActionPrompt() },
        { role: 'user', content: `Error Analysis: ${JSON.stringify(errorAnalysis, null, 2)}\nContext: ${JSON.stringify(context, null, 2)}` }
      ], {
        model: (this.openaiService as any).model,
        functions: [
          {
            name: 'generate_recovery_actions',
            description: 'Generate specific recovery actions for an error',
            parameters: {
              type: 'object',
              properties: {
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: {
                        type: 'string',
                        enum: ['retry', 'fix_parameters', 'check_connection', 'contact_support', 'try_alternative', 'skip'],
                        description: 'Type of recovery action'
                      },
                      description: { type: 'string' },
                      steps: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Step-by-step instructions'
                      },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      requiresUserAction: { type: 'boolean' }
                    },
                    required: ['action', 'description', 'steps', 'confidence', 'requiresUserAction']
                  }
                }
              },
              required: ['actions']
            }
          }
        ],
        function_call: { name: 'generate_recovery_actions' },
        temperature: 0.2,
        max_tokens: 800
      });

      // chatCompletion returns full response when functions are used
      const functionCall = response.choices?.[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'generate_recovery_actions') {
        throw new Error('Failed to generate recovery actions: Invalid response from AI');
      }

      const result = JSON.parse(functionCall.arguments);
      return result.actions || [];

    } catch (aiError) {
      console.error('AI recovery action generation failed:', aiError);
      
      // Fallback to basic recovery actions
      return this.fallbackRecoveryActions(errorAnalysis, context);
    }
  }

  /**
   * Build system prompt for error analysis
   */
  private buildErrorAnalysisPrompt(): string {
    return `You are an expert error analysis specialist for an API automation platform. Your job is to analyze errors and provide intelligent recovery suggestions.

ERROR TYPES:
- authentication: API key, token, or credential issues
- validation: Parameter validation, missing required fields, invalid data types
- network: Connection timeouts, DNS issues, network connectivity
- rate_limit: API rate limiting, quota exceeded
- permission: Insufficient permissions, access denied
- not_found: Resource not found, endpoint doesn't exist
- server: Server errors, internal API issues
- unknown: Unrecognized or unclear errors

SEVERITY LEVELS:
- low: Minor issues that don't affect core functionality
- medium: Issues that affect some functionality but have workarounds
- high: Issues that significantly impact user experience
- critical: Issues that prevent core functionality from working

ANALYSIS RULES:
1. Identify the root cause of the error
2. Determine if it's user-fixable or system-related
3. Provide specific, actionable recovery steps
4. Consider the context (API endpoint, operation type, etc.)
5. Suggest alternative approaches when possible
6. Be helpful and encouraging in user messages

RECOVERY SUGGESTIONS:
- Be specific and actionable
- Include step-by-step instructions
- Consider the user's technical level
- Provide multiple options when possible
- Include links to documentation when relevant

EXAMPLES:
- 401 Unauthorized → "Your API key may be expired or invalid. Please check your connection settings and generate a new key if needed."
- 400 Bad Request → "The request parameters don't match what the API expects. Let me help you fix the parameter format."
- 429 Rate Limited → "You've hit the API rate limit. Let's wait a moment and try again, or consider upgrading your plan."

Be precise, helpful, and focus on getting the user back on track quickly.`;
  }

  /**
   * Build error context prompt
   */
  private buildErrorContextPrompt(errorMessage: string, context: ErrorContext): string {
    return `Error Message: "${errorMessage}"

Context:
- Operation: ${context.operation}
- Endpoint: ${context.endpoint || 'N/A'}
- Method: ${context.method || 'N/A'}
- Status Code: ${context.statusCode || 'N/A'}
- User Message: ${context.userMessage || 'N/A'}
- Parameters: ${JSON.stringify(context.parameters || {}, null, 2)}
- Connection ID: ${context.connectionId || 'N/A'}
- Retry Count: ${context.retryCount || 0}
- Previous Errors: ${context.previousErrors?.join(', ') || 'None'}

Please analyze this error and provide recovery suggestions.`;
  }

  /**
   * Build system prompt for recovery actions
   */
  private buildRecoveryActionPrompt(): string {
    return `You are an expert at generating specific recovery actions for API errors. Based on the error analysis, generate actionable steps the user can take.

ACTION TYPES:
- retry: Try the operation again (with or without modifications)
- fix_parameters: Correct parameter values or format
- check_connection: Verify API connection settings
- contact_support: Escalate to support team
- try_alternative: Use a different approach or endpoint
- skip: Skip this step and continue

GUIDELINES:
1. Generate 2-4 specific recovery actions
2. Order by likelihood of success
3. Include step-by-step instructions
4. Be specific about what the user needs to do
5. Consider the user's technical expertise
6. Provide confidence scores for each action

Make the instructions clear, actionable, and encouraging.`;
  }

  /**
   * Fallback error analysis when AI fails
   */
  private fallbackErrorAnalysis(error: Error | string, context: ErrorContext): ErrorAnalysis {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const statusCode = context.statusCode;

    // Basic error type detection
    let errorType: ErrorAnalysis['errorType'] = 'unknown';
    let severity: ErrorAnalysis['severity'] = 'medium';
    let userFriendlyMessage = 'Something went wrong. Please try again.';
    let shouldRetry = false;

    if (statusCode) {
      if (statusCode === 401) {
        errorType = 'authentication';
        severity = 'high';
        userFriendlyMessage = 'Authentication failed. Please check your API credentials.';
      } else if (statusCode === 403) {
        errorType = 'permission';
        severity = 'high';
        userFriendlyMessage = 'You don\'t have permission to perform this action.';
      } else if (statusCode === 404) {
        errorType = 'not_found';
        severity = 'medium';
        userFriendlyMessage = 'The requested resource was not found.';
      } else if (statusCode === 429) {
        errorType = 'rate_limit';
        severity = 'medium';
        userFriendlyMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        shouldRetry = true;
      } else if (statusCode >= 500) {
        errorType = 'server';
        severity = 'high';
        userFriendlyMessage = 'Server error occurred. Please try again later.';
        shouldRetry = true;
      } else if (statusCode >= 400) {
        errorType = 'validation';
        severity = 'medium';
        userFriendlyMessage = 'Invalid request. Please check your parameters.';
      }
    }

    // Check for common error patterns
    if (errorMessage.toLowerCase().includes('timeout')) {
      errorType = 'network';
      severity = 'medium';
      userFriendlyMessage = 'Request timed out. Please check your connection and try again.';
      shouldRetry = true;
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      errorType = 'network';
      severity = 'high';
      userFriendlyMessage = 'Connection issue. Please try again.';
      shouldRetry = true;
    }

    return {
      errorType,
      severity,
      userFriendlyMessage,
      technicalDetails: errorMessage,
      recoverySuggestions: this.getBasicRecoverySuggestions(errorType),
      shouldRetry,
      retryDelay: shouldRetry ? 5 : undefined,
      alternativeActions: [],
      confidence: 0.6
    };
  }

  /**
   * Get basic recovery suggestions based on error type
   */
  private getBasicRecoverySuggestions(errorType: ErrorAnalysis['errorType']): string[] {
    const suggestions: Record<ErrorAnalysis['errorType'], string[]> = {
      authentication: [
        'Check your API key or token',
        'Verify the authentication method',
        'Ensure credentials are not expired'
      ],
      validation: [
        'Check required parameters',
        'Verify parameter data types',
        'Review API documentation for correct format'
      ],
      network: [
        'Try again in a few moments',
        'Verify the API endpoint is accessible',
        'Check your connection settings'
      ],
      rate_limit: [
        'Wait before retrying',
        'Check your API usage limits',
        'Consider upgrading your plan'
      ],
      permission: [
        'Verify your account permissions',
        'Check if the API key has required scopes',
        'Contact your administrator'
      ],
      not_found: [
        'Verify the resource exists',
        'Check the endpoint URL',
        'Review API documentation'
      ],
      server: [
        'Try again later',
        'Check API status page',
        'Contact support if issue persists'
      ],
      unknown: [
        'Try the operation again',
        'Check your parameters',
        'Contact support for assistance'
      ]
    };

    return suggestions[errorType] || ['Try again', 'Check your settings', 'Contact support'];
  }

  /**
   * Fallback recovery actions when AI fails
   */
  private fallbackRecoveryActions(
    errorAnalysis: ErrorAnalysis,
    context: ErrorContext
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Always suggest retry for retryable errors
    if (errorAnalysis.shouldRetry) {
      actions.push({
        action: 'retry',
        description: 'Try the operation again',
        steps: [
          'Wait a moment for any temporary issues to resolve',
          'Click retry to attempt the operation again',
          'If it fails again, try the other suggestions below'
        ],
        confidence: 0.7,
        requiresUserAction: false
      });
    }

    // Add specific actions based on error type
    switch (errorAnalysis.errorType) {
      case 'authentication':
        actions.push({
          action: 'check_connection',
          description: 'Verify your API credentials',
          steps: [
            'Go to your connections settings',
            'Check if your API key is valid',
            'Generate a new key if needed',
            'Test the connection'
          ],
          confidence: 0.9,
          requiresUserAction: true
        });
        break;

      case 'validation':
        actions.push({
          action: 'fix_parameters',
          description: 'Check and fix your parameters',
          steps: [
            'Review the parameter values you entered',
            'Check if all required parameters are provided',
            'Verify data types match what the API expects',
            'Try again with corrected parameters'
          ],
          confidence: 0.8,
          requiresUserAction: true
        });
        break;

      case 'rate_limit':
        actions.push({
          action: 'retry',
          description: 'Wait and try again',
          steps: [
            'Wait 1-2 minutes for rate limits to reset',
            'Try the operation again',
            'Consider reducing the frequency of requests'
          ],
          confidence: 0.8,
          requiresUserAction: false
        });
        break;

      default:
        actions.push({
          action: 'try_alternative',
          description: 'Try a different approach',
          steps: [
            'Check if there\'s an alternative endpoint',
            'Try with different parameters',
            'Contact support if the issue persists'
          ],
          confidence: 0.5,
          requiresUserAction: true
        });
    }

    return actions;
  }
}
