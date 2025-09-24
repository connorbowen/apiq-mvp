import { EnhancedConnectionGuidanceOrchestrator } from '../../../src/lib/services/enhancedConnectionGuidanceOrchestrator';
import { IntentAnalysisService } from '../../../src/lib/services/intentAnalysisService';
import { ApiRequirementService } from '../../../src/lib/services/apiRequirementService';
import { GuidanceGenerationService } from '../../../src/lib/services/guidanceGenerationService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock all services
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/lib/services/intentAnalysisService');
jest.mock('../../../src/lib/services/apiRequirementService');
jest.mock('../../../src/lib/services/guidanceGenerationService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('EnhancedConnectionGuidanceOrchestrator', () => {
  let orchestrator: EnhancedConnectionGuidanceOrchestrator;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let mockIntentAnalysisService: jest.Mocked<IntentAnalysisService>;
  let mockApiRequirementService: jest.Mocked<ApiRequirementService>;
  let mockGuidanceGenerationService: jest.Mocked<GuidanceGenerationService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    mockIntentAnalysisService = {
      analyzeIntent: jest.fn()
    } as any;

    mockApiRequirementService = {
      determineApiRequirements: jest.fn()
    } as any;

    mockGuidanceGenerationService = {
      generateGuidance: jest.fn()
    } as any;

    // Mock the service constructors
    (IntentAnalysisService as jest.Mock).mockImplementation(() => mockIntentAnalysisService);
    (ApiRequirementService as jest.Mock).mockImplementation(() => mockApiRequirementService);
    (GuidanceGenerationService as jest.Mock).mockImplementation(() => mockGuidanceGenerationService);

    orchestrator = new EnhancedConnectionGuidanceOrchestrator(mockOpenAIService);
  });

  describe('processMessage', () => {
    const mockContext = {
      message: 'Send a Slack notification when a new GitHub issue is created',
      availableConnections: [
        {
          name: 'GitHub',
          id: 'conn1',
          baseUrl: 'https://api.github.com',
          endpoints: [
            { path: '/repos/{owner}/{repo}/issues', method: 'GET', summary: 'List issues' }
          ]
        }
      ],
      userId: 'user123',
      context: { sessionId: 'session123' }
    };

    it('should successfully process message using multi-prompt architecture', async () => {
      // Mock intent analysis
      mockIntentAnalysisService.analyzeIntent.mockResolvedValue({
        success: true,
        intent: {
          userGoal: 'Create automated workflow for GitHub issue notifications',
          guidanceType: 'connection_setup',
          complexity: 'medium',
          requiresMultipleApis: true,
          confidence: 0.9
        }
      });

      // Mock API requirement analysis
      mockApiRequirementService.determineApiRequirements.mockResolvedValue({
        success: true,
        requirements: {
          requiresGuidance: true,
          requiredApis: [
            {
              name: 'slack',
              displayName: 'Slack',
              confidence: 0.9,
              reason: 'User wants to send notifications',
              suggestedEndpoints: ['/chat.postMessage'],
              isAvailable: false
            },
            {
              name: 'github',
              displayName: 'GitHub',
              confidence: 0.9,
              reason: 'User wants to monitor GitHub issues',
              suggestedEndpoints: ['/repos/{owner}/{repo}/issues'],
              isAvailable: true,
              connectionId: 'conn1'
            }
          ],
          missingApis: [
            {
              name: 'slack',
              displayName: 'Slack',
              confidence: 0.9,
              reason: 'User wants to send notifications',
              suggestedEndpoints: ['/chat.postMessage'],
              isAvailable: false
            }
          ],
          availableApis: [
            {
              name: 'github',
              displayName: 'GitHub',
              confidence: 0.9,
              reason: 'User wants to monitor GitHub issues',
              suggestedEndpoints: ['/repos/{owner}/{repo}/issues'],
              isAvailable: true,
              connectionId: 'conn1'
            }
          ],
          userIntent: 'Create automated workflow for GitHub issue notifications',
          suggestedWorkflow: 'Multi-step workflow involving Slack and GitHub'
        }
      });

      // Mock guidance generation
      mockGuidanceGenerationService.generateGuidance.mockResolvedValue({
        success: true,
        guidance: {
          shouldProvideGuidance: true,
          guidanceType: 'connection_setup',
          message: 'To create your automated workflow, you need to set up a Slack connection.',
          details: {
            requiredApis: [
              {
                name: 'slack',
                displayName: 'Slack',
                description: 'Team communication platform',
                authType: 'BEARER_TOKEN',
                setupInstructions: {
                  step1: 'Go to https://api.slack.com/apps and create a new app',
                  step2: 'Navigate to "OAuth & Permissions" and add the required scopes',
                  step3: 'Install the app to your workspace and copy the Bot User OAuth Token',
                  additionalNotes: 'Make sure to invite the bot to the channels where you want to send messages'
                },
                documentationUrl: 'https://api.slack.com/',
                baseUrl: 'https://slack.com/api',
                commonEndpoints: ['/chat.postMessage', '/conversations.list']
              }
            ],
            suggestedWorkflow: 'Multi-step workflow involving Slack and GitHub',
            userIntent: 'Create automated workflow for GitHub issue notifications'
          }
        }
      });

      const result = await orchestrator.processMessage(mockContext);

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('connection_setup');
      expect(result.message).toContain('Slack connection');
      expect(result.details?.requiredApis).toHaveLength(1);
      expect(result.details?.requiredApis[0].name).toBe('slack');

      // Verify all services were called
      expect(mockIntentAnalysisService.analyzeIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: mockContext.message,
          availableConnections: mockContext.availableConnections,
          context: mockContext.context
        })
      );
      expect(mockApiRequirementService.determineApiRequirements).toHaveBeenCalled();
      expect(mockGuidanceGenerationService.generateGuidance).toHaveBeenCalled();
    });

    it('should handle intent analysis failure gracefully', async () => {
      mockIntentAnalysisService.analyzeIntent.mockResolvedValue({
        success: false,
        error: 'Intent analysis failed'
      });

      const result = await orchestrator.processMessage(mockContext);

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('general');
      expect(result.message).toContain('error');
    });

    it('should handle API requirement analysis failure gracefully', async () => {
      mockIntentAnalysisService.analyzeIntent.mockResolvedValue({
        success: true,
        intent: {
          userGoal: 'Test goal',
          guidanceType: 'general',
          complexity: 'simple',
          requiresMultipleApis: false,
          confidence: 0.8
        }
      });

      mockApiRequirementService.determineApiRequirements.mockResolvedValue({
        success: false,
        error: 'API requirement analysis failed'
      });

      const result = await orchestrator.processMessage(mockContext);

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('general');
      expect(result.message).toContain('error');
    });

    it('should handle guidance generation failure gracefully', async () => {
      mockIntentAnalysisService.analyzeIntent.mockResolvedValue({
        success: true,
        intent: {
          userGoal: 'Test goal',
          guidanceType: 'general',
          complexity: 'simple',
          requiresMultipleApis: false,
          confidence: 0.8
        }
      });

      mockApiRequirementService.determineApiRequirements.mockResolvedValue({
        success: true,
        requirements: {
          requiresGuidance: false,
          requiredApis: [],
          missingApis: [],
          availableApis: [],
          userIntent: 'Test intent',
          suggestedWorkflow: 'Test workflow'
        }
      });

      mockGuidanceGenerationService.generateGuidance.mockResolvedValue({
        success: false,
        error: 'Guidance generation failed'
      });

      const result = await orchestrator.processMessage(mockContext);

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('general');
      expect(result.message).toContain('error');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockIntentAnalysisService.analyzeIntent.mockRejectedValue(new Error('Unexpected error'));

      const result = await orchestrator.processMessage(mockContext);

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('general');
      expect(result.message).toContain('error');
    });

    it('should generate general guidance when no connections are available', async () => {
      const result = await orchestrator.generateGeneralGuidance('Test message');

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('connection_setup');
      expect(result.message).toContain('API connections');
      expect(result.details?.userIntent).toBe('General setup guidance');
    });

    it('should process message with empty connections', async () => {
      const emptyConnectionsContext = {
        ...mockContext,
        availableConnections: []
      };

      mockIntentAnalysisService.analyzeIntent.mockResolvedValue({
        success: true,
        intent: {
          userGoal: 'Test goal',
          guidanceType: 'connection_setup',
          complexity: 'simple',
          requiresMultipleApis: false,
          confidence: 0.8
        }
      });

      mockApiRequirementService.determineApiRequirements.mockResolvedValue({
        success: true,
        requirements: {
          requiresGuidance: true,
          requiredApis: [],
          missingApis: [],
          availableApis: [],
          userIntent: 'Test intent',
          suggestedWorkflow: 'Test workflow'
        }
      });

      mockGuidanceGenerationService.generateGuidance.mockResolvedValue({
        success: true,
        guidance: {
          shouldProvideGuidance: true,
          guidanceType: 'connection_setup',
          message: 'You need to set up API connections first.',
          details: {
            requiredApis: [],
            userIntent: 'Test intent'
          }
        }
      });

      const result = await orchestrator.processMessage(emptyConnectionsContext);

      expect(result.shouldProvideGuidance).toBe(true);
      expect(result.guidanceType).toBe('connection_setup');
    });

    it('should process message with context', async () => {
      const contextWithData = {
        ...mockContext,
        context: { 
          sessionId: 'session123',
          previousMessages: ['Hello', 'How can I help?'],
          userPreferences: { theme: 'dark' }
        }
      };

      mockIntentAnalysisService.analyzeIntent.mockResolvedValue({
        success: true,
        intent: {
          userGoal: 'Test goal',
          guidanceType: 'general',
          complexity: 'simple',
          requiresMultipleApis: false,
          confidence: 0.8
        }
      });

      mockApiRequirementService.determineApiRequirements.mockResolvedValue({
        success: true,
        requirements: {
          requiresGuidance: false,
          requiredApis: [],
          missingApis: [],
          availableApis: [],
          userIntent: 'Test intent',
          suggestedWorkflow: 'Test workflow'
        }
      });

      mockGuidanceGenerationService.generateGuidance.mockResolvedValue({
        success: true,
        guidance: {
          shouldProvideGuidance: false,
          guidanceType: 'none',
          message: 'You can proceed with your request.',
          details: {
            requiredApis: [],
            userIntent: 'Test intent'
          }
        }
      });

      const result = await orchestrator.processMessage(contextWithData);

      expect(result.shouldProvideGuidance).toBe(false);
      expect(result.guidanceType).toBe('none');
    });
  });
});
