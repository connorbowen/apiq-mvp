import { GuidanceGenerationService } from '../../../src/lib/services/guidanceGenerationService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('GuidanceGenerationService', () => {
  let service: GuidanceGenerationService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new GuidanceGenerationService(mockOpenAIService);
  });

  describe('generateGuidance', () => {
    const mockRequest = {
      userMessage: 'Send a Slack notification when a new GitHub issue is created',
      userIntent: {
        userGoal: 'Create automated workflow for GitHub issue notifications',
        guidanceType: 'connection_setup',
        complexity: 'medium',
        requiresMultipleApis: true
      },
      apiRequirements: {
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
      },
      context: { userId: 'user123' }
    };

    it('should successfully generate guidance using AI', async () => {
      const mockAIResponse = {
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
      };

      mockOpenAIService.chatCompletion.mockResolvedValue(JSON.stringify(mockAIResponse));

      const result = await service.generateGuidance(mockRequest);

      expect(result.success).toBe(true);
      expect(result.guidance).toEqual(mockAIResponse);
      expect(mockOpenAIService.chatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 800
        })
      );
    });

    it('should fallback to rules-based generation when AI fails', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(mockRequest);

      expect(result.success).toBe(true);
      expect(result.guidance).toBeDefined();
      expect(result.guidance?.shouldProvideGuidance).toBe(true);
      expect(result.guidance?.guidanceType).toBe('api_specific');
      expect(result.guidance?.message).toContain('Slack');
    });

    it('should generate no guidance when all APIs are available', async () => {
      const allAvailableRequest = {
        ...mockRequest,
        apiRequirements: {
          ...mockRequest.apiRequirements,
          requiresGuidance: false,
          missingApis: [],
          availableApis: mockRequest.apiRequirements.requiredApis
        }
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(allAvailableRequest);

      expect(result.success).toBe(true);
      expect(result.guidance?.shouldProvideGuidance).toBe(false);
      expect(result.guidance?.guidanceType).toBe('none');
      expect(result.guidance?.message).toContain('proceed');
    });

    it('should generate single API guidance correctly', async () => {
      const singleApiRequest = {
        ...mockRequest,
        apiRequirements: {
          ...mockRequest.apiRequirements,
          missingApis: [mockRequest.apiRequirements.missingApis[0]]
        }
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(singleApiRequest);

      expect(result.success).toBe(true);
      expect(result.guidance?.guidanceType).toBe('api_specific');
      expect(result.guidance?.message).toContain('Slack');
    });

    it('should generate multiple API guidance correctly', async () => {
      const multiApiRequest = {
        ...mockRequest,
        apiRequirements: {
          ...mockRequest.apiRequirements,
          missingApis: [
            mockRequest.apiRequirements.missingApis[0],
            {
              name: 'trello',
              displayName: 'Trello',
              confidence: 0.8,
              reason: 'User wants to create cards',
              suggestedEndpoints: ['/cards'],
              isAvailable: false
            }
          ]
        }
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(multiApiRequest);

      expect(result.success).toBe(true);
      expect(result.guidance?.guidanceType).toBe('connection_setup');
      expect(result.guidance?.message).toContain('Slack');
      expect(result.guidance?.message).toContain('Trello');
    });

    it('should include setup instructions for Slack', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(mockRequest);

      expect(result.success).toBe(true);
      const slackApi = result.guidance?.details?.requiredApis.find(api => api.name === 'slack');
      expect(slackApi).toBeDefined();
      expect(slackApi?.setupInstructions.step1).toContain('api.slack.com');
      expect(slackApi?.setupInstructions.step2).toContain('OAuth');
      expect(slackApi?.setupInstructions.step3).toContain('Bot User OAuth Token');
    });

    it('should include setup instructions for GitHub', async () => {
      const githubRequest = {
        ...mockRequest,
        apiRequirements: {
          ...mockRequest.apiRequirements,
          missingApis: [
            {
              name: 'github',
              displayName: 'GitHub',
              confidence: 0.9,
              reason: 'User wants to monitor GitHub issues',
              suggestedEndpoints: ['/repos/{owner}/{repo}/issues'],
              isAvailable: false
            }
          ]
        }
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(githubRequest);

      expect(result.success).toBe(true);
      const githubApi = result.guidance?.details?.requiredApis.find(api => api.name === 'github');
      expect(githubApi).toBeDefined();
      expect(githubApi?.setupInstructions.step1).toContain('GitHub Settings');
      expect(githubApi?.setupInstructions.step2).toContain('token');
      expect(githubApi?.setupInstructions.step3).toContain('API key');
    });

    it('should include setup instructions for Trello', async () => {
      const trelloRequest = {
        ...mockRequest,
        apiRequirements: {
          ...mockRequest.apiRequirements,
          missingApis: [
            {
              name: 'trello',
              displayName: 'Trello',
              confidence: 0.8,
              reason: 'User wants to create cards',
              suggestedEndpoints: ['/cards'],
              isAvailable: false
            }
          ]
        }
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(trelloRequest);

      expect(result.success).toBe(true);
      const trelloApi = result.guidance?.details?.requiredApis.find(api => api.name === 'trello');
      expect(trelloApi).toBeDefined();
      expect(trelloApi?.setupInstructions.step1).toContain('trello.com/app-key');
      expect(trelloApi?.setupInstructions.step2).toContain('token');
      expect(trelloApi?.setupInstructions.step3).toContain('authentication');
    });

    it('should include setup instructions for Email', async () => {
      const emailRequest = {
        ...mockRequest,
        apiRequirements: {
          ...mockRequest.apiRequirements,
          missingApis: [
            {
              name: 'email',
              displayName: 'Email Service',
              confidence: 0.8,
              reason: 'User wants to send emails',
              suggestedEndpoints: ['/send'],
              isAvailable: false
            }
          ]
        }
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(emailRequest);

      expect(result.success).toBe(true);
      const emailApi = result.guidance?.details?.requiredApis.find(api => api.name === 'email');
      expect(emailApi).toBeDefined();
      expect(emailApi?.setupInstructions.step1).toContain('email service provider');
      expect(emailApi?.setupInstructions.step2).toContain('API key');
      expect(emailApi?.setupInstructions.step3).toContain('domain');
    });

    it('should include workflow suggestions', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateGuidance(mockRequest);

      expect(result.success).toBe(true);
      expect(result.guidance?.details?.suggestedWorkflow).toBeDefined();
      expect(result.guidance?.details?.userIntent).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('Network error'));

      const result = await service.generateGuidance(mockRequest);

      expect(result.success).toBe(true); // Should fallback to rules-based
      expect(result.guidance).toBeDefined();
    });
  });
});
