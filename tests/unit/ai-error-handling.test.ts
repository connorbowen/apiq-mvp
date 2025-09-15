/**
 * Unit tests for AI-powered error handling services
 * Tests intelligent error analysis and recovery suggestions
 */

import 'openai/shims/node';
import { AIErrorHandlingService, ErrorContext } from '../../src/lib/services/aiErrorHandlingService';
import { EnhancedErrorHandler } from '../../src/lib/services/enhancedErrorHandler';
import { OpenAIService } from '../../src/services/openaiService';

// Mock OpenAI service
jest.mock('../../src/services/openaiService');
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('AI Error Handling Services', () => {
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock OpenAI service
    mockOpenAIService = {
      client: {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      },
      model: 'gpt-4',
      apiKey: 'test-key'
    } as any;

    MockedOpenAIService.createFromEnv = jest.fn().mockReturnValue(mockOpenAIService);
  });

  describe('AIErrorHandlingService', () => {
    let aiErrorService: AIErrorHandlingService;

    beforeEach(() => {
      aiErrorService = new AIErrorHandlingService(mockOpenAIService);
    });

    it('should analyze authentication errors using AI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'analyze_error',
              arguments: JSON.stringify({
                errorType: 'authentication',
                severity: 'high',
                userFriendlyMessage: 'Your API key appears to be invalid or expired',
                technicalDetails: '401 Unauthorized - Invalid API key',
                recoverySuggestions: [
                  'Check your API key in connection settings',
                  'Generate a new API key if needed',
                  'Verify the key has correct permissions'
                ],
                shouldRetry: false,
                confidence: 0.9
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const context: ErrorContext = {
        operation: 'api_execution',
        endpoint: '/api/users',
        method: 'GET',
        statusCode: 401,
        userMessage: 'Get all users'
      };

      const result = await aiErrorService.analyzeError(
        new Error('401 Unauthorized'),
        context
      );

      expect(result.errorType).toBe('authentication');
      expect(result.severity).toBe('high');
      expect(result.userFriendlyMessage).toContain('API key');
      expect(result.recoverySuggestions).toHaveLength(3);
      expect(result.shouldRetry).toBe(false);
      expect(result.confidence).toBe(0.9);
    });

    it('should analyze rate limit errors using AI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'analyze_error',
              arguments: JSON.stringify({
                errorType: 'rate_limit',
                severity: 'medium',
                userFriendlyMessage: 'You\'ve hit the API rate limit. Please wait a moment.',
                technicalDetails: '429 Too Many Requests',
                recoverySuggestions: [
                  'Wait 1-2 minutes before trying again',
                  'Check your API usage limits',
                  'Consider upgrading your plan'
                ],
                shouldRetry: true,
                retryDelay: 60,
                confidence: 0.95
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const context: ErrorContext = {
        operation: 'api_execution',
        endpoint: '/api/data',
        method: 'POST',
        statusCode: 429,
        userMessage: 'Create new data'
      };

      const result = await aiErrorService.analyzeError(
        new Error('429 Too Many Requests'),
        context
      );

      expect(result.errorType).toBe('rate_limit');
      expect(result.severity).toBe('medium');
      expect(result.shouldRetry).toBe(true);
      expect(result.retryDelay).toBe(60);
    });

    it('should fallback to basic analysis when AI fails', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(new Error('AI failed'));

      const context: ErrorContext = {
        operation: 'api_execution',
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 500
      };

      const result = await aiErrorService.analyzeError(
        new Error('500 Internal Server Error'),
        context
      );

      expect(result.errorType).toBe('server');
      expect(result.severity).toBe('high');
      expect(result.shouldRetry).toBe(true);
      expect(result.confidence).toBe(0.6);
    });

    it('should generate recovery actions using AI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'generate_recovery_actions',
              arguments: JSON.stringify({
                actions: [
                  {
                    action: 'check_connection',
                    description: 'Verify your API credentials',
                    steps: [
                      'Go to connection settings',
                      'Check if API key is valid',
                      'Test the connection'
                    ],
                    confidence: 0.9,
                    requiresUserAction: true
                  },
                  {
                    action: 'retry',
                    description: 'Try the operation again',
                    steps: [
                      'Wait a moment',
                      'Click retry'
                    ],
                    confidence: 0.7,
                    requiresUserAction: false
                  }
                ]
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const errorAnalysis = {
        errorType: 'authentication' as const,
        severity: 'high' as const,
        userFriendlyMessage: 'Authentication failed',
        technicalDetails: '401 Unauthorized',
        recoverySuggestions: ['Check API key'],
        shouldRetry: false,
        confidence: 0.9
      };

      const context: ErrorContext = {
        operation: 'api_execution',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await aiErrorService.generateRecoveryActions(errorAnalysis, context);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('check_connection');
      expect(result[0].requiresUserAction).toBe(true);
      expect(result[1].action).toBe('retry');
      expect(result[1].requiresUserAction).toBe(false);
    });
  });

  describe('EnhancedErrorHandler', () => {
    let enhancedErrorHandler: EnhancedErrorHandler;

    beforeEach(() => {
      enhancedErrorHandler = new EnhancedErrorHandler(mockOpenAIService);
    });

    it('should handle API errors with enhanced analysis', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'analyze_error',
              arguments: JSON.stringify({
                errorType: 'validation',
                severity: 'medium',
                userFriendlyMessage: 'Invalid parameters provided',
                technicalDetails: '400 Bad Request - Missing required field',
                recoverySuggestions: [
                  'Check all required parameters are provided',
                  'Verify parameter data types'
                ],
                shouldRetry: false,
                confidence: 0.8
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await enhancedErrorHandler.handleApiError(
        new Error('400 Bad Request'),
        {
          endpoint: '/api/users',
          method: 'POST',
          statusCode: 400,
          parameters: { name: 'test' },
          userMessage: 'Create user'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');
      expect(result.errorAnalysis?.errorType).toBe('validation');
      expect(result.recoveryActions).toBeDefined();
      expect(result.userGuidance).toContain('parameters');
    });

    it('should handle workflow errors with enhanced analysis', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'analyze_error',
              arguments: JSON.stringify({
                errorType: 'server',
                severity: 'high',
                userFriendlyMessage: 'Workflow execution failed due to server error',
                technicalDetails: '500 Internal Server Error',
                recoverySuggestions: [
                  'Try running the workflow again',
                  'Check if all connections are working'
                ],
                shouldRetry: true,
                retryDelay: 10,
                confidence: 0.8
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await enhancedErrorHandler.handleWorkflowError(
        new Error('500 Internal Server Error'),
        {
          workflowId: 'workflow-123',
          stepId: 'step-1',
          stepName: 'Create User',
          previousErrors: [],
          retryCount: 0
        }
      );

      expect(result.success).toBe(false);
      expect(result.errorAnalysis?.errorType).toBe('server');
      expect(result.shouldRetry).toBe(true);
      expect(result.retryDelay).toBe(10);
    });

    it('should fallback to basic error handling when AI fails', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(new Error('AI failed'));

      const result = await enhancedErrorHandler.handleError(
        new Error('Test error'),
        {
          operation: 'test',
          userMessage: 'Test operation'
        },
        'Fallback error message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong. Please try again.');
      expect(result.userGuidance).toContain('try again');
    });
  });

  describe('Static Error Utilities', () => {
    it('should identify retryable errors correctly', () => {
      expect(EnhancedErrorHandler.isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(EnhancedErrorHandler.isRetryableError(new Error('Network error'))).toBe(true);
      expect(EnhancedErrorHandler.isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
      expect(EnhancedErrorHandler.isRetryableError(new Error('Authentication failed'))).toBe(false);
      expect(EnhancedErrorHandler.isRetryableError(new Error('Not found'))).toBe(false);
    });

    it('should calculate retry delays correctly', () => {
      const timeoutError = new Error('Request timeout');
      const rateLimitError = new Error('Rate limit exceeded');
      
      expect(EnhancedErrorHandler.getRetryDelay(timeoutError, 0)).toBeGreaterThan(1000);
      expect(EnhancedErrorHandler.getRetryDelay(rateLimitError, 0)).toBeGreaterThan(4000);
      
      // Test that retry delays increase with retry count (allowing for jitter)
      const delay1 = EnhancedErrorHandler.getRetryDelay(timeoutError, 1);
      const delay2 = EnhancedErrorHandler.getRetryDelay(timeoutError, 2);
      expect(delay2).toBeGreaterThan(delay1 * 0.8); // Allow for some jitter variation
    });

    it('should create simple error responses', () => {
      const result = EnhancedErrorHandler.createSimpleErrorResponse(
        new Error('Test error'),
        'Custom error message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
      expect(result.userGuidance).toContain('try again');
      expect(result.technicalDetails).toBe('Test error');
    });
  });
});
