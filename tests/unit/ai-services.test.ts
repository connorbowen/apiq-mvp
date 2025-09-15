/**
 * Unit tests for AI-powered services
 * Tests the new AI-powered API detection, parameter extraction, and message classification
 */

import 'openai/shims/node';
import { AIApiDetectionService } from '../../src/lib/services/aiApiDetectionService';
import { AIParameterExtractionService } from '../../src/lib/services/aiParameterExtractionService';
import { HybridMessageClassificationService } from '../../src/lib/services/hybridMessageClassificationService';
import { ConnectionGuidanceService } from '../../src/lib/services/connectionGuidanceService';
import { ParameterExtractionService } from '../../src/lib/services/parameterExtractionService';
import { OpenAIService } from '../../src/services/openaiService';

// Mock OpenAI service
jest.mock('../../src/services/openaiService');
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('AI-Powered Services', () => {
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

  describe('AIApiDetectionService', () => {
    let aiDetectionService: AIApiDetectionService;

    beforeEach(() => {
      aiDetectionService = new AIApiDetectionService(mockOpenAIService);
    });

    it('should detect API requirements using AI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'analyze_api_requirements',
              arguments: JSON.stringify({
                requiredApis: [
                  {
                    name: 'slack',
                    displayName: 'Slack',
                    confidence: 0.9,
                    context: 'User wants to send notifications to team'
                  }
                ],
                guidanceMessage: 'You need to connect to Slack to send notifications'
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await aiDetectionService.analyzeApiRequirements(
        'When a new issue is created, send a Slack notification',
        []
      );

      expect(result.requiresGuidance).toBe(true);
      expect(result.missingApis).toHaveLength(1);
      expect(result.missingApis[0].name).toBe('slack');
      expect(result.guidanceMessage).toContain('Slack');
    });

    it('should fallback to keyword detection when AI fails', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(new Error('AI failed'));

      const result = await aiDetectionService.analyzeApiRequirements(
        'Send a Slack message',
        []
      );

      expect(result.requiresGuidance).toBe(true);
      expect(result.missingApis[0].name).toBe('slack');
    });
  });

  describe('AIParameterExtractionService', () => {
    let aiExtractionService: AIParameterExtractionService;

    beforeEach(() => {
      aiExtractionService = new AIParameterExtractionService(mockOpenAIService);
    });

    it('should extract parameters using AI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_parameters',
              arguments: JSON.stringify({
                parameters: {
                  status: 'open',
                  assignee: 'john@example.com'
                },
                mappings: [
                  {
                    parameterName: 'status',
                    extractedValue: 'open',
                    confidence: 0.9,
                    reasoning: 'User mentioned "open issues"'
                  }
                ],
                overallConfidence: 0.9
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const endpoint = {
        path: '/issues',
        method: 'GET',
        parameters: [
          {
            name: 'status',
            type: 'string',
            required: false,
            description: 'Filter by status'
          }
        ]
      };

      const result = await aiExtractionService.extractParametersFromNaturalLanguage(
        'Show me open issues',
        endpoint
      );

      expect(result.parameters.status).toBe('open');
      expect(result.confidence).toBe(0.9);
      expect(result.mappings).toHaveLength(1);
    });

    it('should fallback to pattern extraction when AI fails', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(new Error('AI failed'));

      const endpoint = {
        path: '/issues',
        method: 'GET',
        parameters: [
          {
            name: 'status',
            type: 'string',
            required: false,
            description: 'Filter by status'
          }
        ]
      };

      const result = await aiExtractionService.extractParametersFromNaturalLanguage(
        'Show me open issues',
        endpoint
      );

      expect(result.parameters).toEqual({});
      expect(result.confidence).toBe(0);
    });
  });

  describe('HybridMessageClassificationService', () => {
    let classificationService: HybridMessageClassificationService;

    beforeEach(() => {
      classificationService = new HybridMessageClassificationService(mockOpenAIService);
    });

    it('should classify workflow requests using rules', async () => {
      const result = await classificationService.classifyMessage(
        'When a new issue is created, send a Slack notification'
      );

      expect(result.type).toBe('workflow');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.requiresApiConnections).toBe(true);
    });

    it('should use AI for ambiguous messages', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'classify_message',
              arguments: JSON.stringify({
                type: 'workflow',
                confidence: 0.8,
                reasoning: 'User wants to automate a process',
                suggestedActions: ['Generate workflow'],
                requiresApiConnections: true
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await classificationService.classifyMessage(
        'I want to automate something with my team'
      );

      expect(result.type).toBe('workflow');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Updated ConnectionGuidanceService', () => {
    it('should use AI for API detection', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'analyze_api_requirements',
              arguments: JSON.stringify({
                requiredApis: [
                  {
                    name: 'github',
                    displayName: 'GitHub',
                    confidence: 0.9,
                    context: 'User wants to create GitHub issues'
                  }
                ],
                guidanceMessage: 'You need to connect to GitHub'
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await ConnectionGuidanceService.analyzeRequest(
        'Create a GitHub issue when a bug is reported',
        []
      );

      expect(result.requiresGuidance).toBe(true);
      expect(result.missingApis[0].name).toBe('github');
    });
  });

  describe('Updated ParameterExtractionService', () => {
    it('should use AI for parameter extraction', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_parameters',
              arguments: JSON.stringify({
                parameters: {
                  status: 'active'
                },
                mappings: [],
                overallConfidence: 0.8
              })
            }
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockResponse as any);

      const endpoint = {
        path: '/users',
        method: 'GET',
        parameters: [
          {
            name: 'status',
            type: 'string',
            required: false,
            description: 'User status'
          }
        ]
      };

      const result = await ParameterExtractionService.extractParametersFromNaturalLanguage(
        'Get active users',
        endpoint,
        mockOpenAIService
      );

      expect(result.status).toBe('active');
    });
  });
});
