import { ApiRequirementService } from '../../../src/lib/services/apiRequirementService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('ApiRequirementService', () => {
  let service: ApiRequirementService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new ApiRequirementService(mockOpenAIService);
  });

  describe('determineApiRequirements', () => {
    const mockRequest = {
      userMessage: 'Send a Slack notification when a new GitHub issue is created',
      userIntent: {
        userGoal: 'Create automated workflow for GitHub issue notifications',
        guidanceType: 'connection_setup',
        complexity: 'medium',
        requiresMultipleApis: true
      },
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
      context: { userId: 'user123' }
    };

    it('should successfully determine API requirements using AI', async () => {
      const mockAIResponse = {
        requiredApis: [
          {
            name: 'slack',
            displayName: 'Slack',
            confidence: 0.9,
            reason: 'User wants to send notifications',
            suggestedEndpoints: ['/chat.postMessage']
          },
          {
            name: 'github',
            displayName: 'GitHub',
            confidence: 0.9,
            reason: 'User wants to monitor GitHub issues',
            suggestedEndpoints: ['/repos/{owner}/{repo}/issues']
          }
        ],
        userIntent: 'Create automated workflow for GitHub issue notifications',
        suggestedWorkflow: 'Multi-step workflow involving Slack and GitHub'
      };

      mockOpenAIService.chatCompletion.mockResolvedValue(JSON.stringify(mockAIResponse));

      const result = await service.determineApiRequirements(mockRequest);

      expect(result.success).toBe(true);
      expect(result.requirements).toBeDefined();
      expect(result.requirements?.requiredApis).toHaveLength(2);
      expect(result.requirements?.missingApis).toHaveLength(1); // Slack not available
      expect(result.requirements?.availableApis).toHaveLength(1); // GitHub available
      expect(mockOpenAIService.chatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 600
        })
      );
    });

    it('should fallback to rules-based analysis when AI fails', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(mockRequest);

      expect(result.success).toBe(true);
      expect(result.requirements).toBeDefined();
      expect(result.requirements?.requiredApis.length).toBeGreaterThan(0);
    });

    it('should detect Slack requirements correctly', async () => {
      const slackRequest = {
        ...mockRequest,
        userMessage: 'Send a message to my team on Slack'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(slackRequest);

      expect(result.success).toBe(true);
      const slackApi = result.requirements?.requiredApis.find(api => api.name === 'slack');
      expect(slackApi).toBeDefined();
      expect(slackApi?.displayName).toBe('Slack');
    });

    it('should detect GitHub requirements correctly', async () => {
      const githubRequest = {
        ...mockRequest,
        userMessage: 'Get all issues from my GitHub repository'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(githubRequest);

      expect(result.success).toBe(true);
      const githubApi = result.requirements?.requiredApis.find(api => api.name === 'github');
      expect(githubApi).toBeDefined();
      expect(githubApi?.displayName).toBe('GitHub');
    });

    it('should detect Trello requirements correctly', async () => {
      const trelloRequest = {
        ...mockRequest,
        userMessage: 'Create a Trello card for new tasks'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(trelloRequest);

      expect(result.success).toBe(true);
      const trelloApi = result.requirements?.requiredApis.find(api => api.name === 'trello');
      expect(trelloApi).toBeDefined();
      expect(trelloApi?.displayName).toBe('Trello');
    });

    it('should detect email requirements correctly', async () => {
      const emailRequest = {
        ...mockRequest,
        userMessage: 'Send an email notification to users'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(emailRequest);

      expect(result.success).toBe(true);
      const emailApi = result.requirements?.requiredApis.find(api => api.name === 'email');
      expect(emailApi).toBeDefined();
      expect(emailApi?.displayName).toBe('Email Service');
    });

    it('should identify available APIs correctly', async () => {
      const availableRequest = {
        ...mockRequest,
        availableConnections: [
          {
            name: 'Slack',
            id: 'conn1',
            baseUrl: 'https://slack.com/api',
            endpoints: [{ path: '/chat.postMessage', method: 'POST', summary: 'Send message' }]
          },
          {
            name: 'GitHub',
            id: 'conn2',
            baseUrl: 'https://api.github.com',
            endpoints: [{ path: '/repos/{owner}/{repo}/issues', method: 'GET', summary: 'List issues' }]
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(availableRequest);

      expect(result.success).toBe(true);
      expect(result.requirements?.availableApis.length).toBeGreaterThan(0);
      expect(result.requirements?.missingApis.length).toBeGreaterThanOrEqual(0);
      expect(result.requirements?.requiresGuidance).toBe(true);
    });

    it('should identify missing APIs correctly', async () => {
      const missingRequest = {
        ...mockRequest,
        availableConnections: [] // No connections available
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(missingRequest);

      expect(result.success).toBe(true);
      expect(result.requirements?.missingApis.length).toBeGreaterThan(0);
      expect(result.requirements?.availableApis.length).toBe(0);
      expect(result.requirements?.requiresGuidance).toBe(true);
    });

    it('should generate workflow suggestions correctly', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(mockRequest);

      expect(result.success).toBe(true);
      expect(result.requirements?.suggestedWorkflow).toBeDefined();
      expect(result.requirements?.suggestedWorkflow).toContain('workflow');
    });

    it('should handle multiple APIs correctly', async () => {
      const multiApiRequest = {
        ...mockRequest,
        userMessage: 'Send Slack notification and create Trello card when GitHub issue is created'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.determineApiRequirements(multiApiRequest);

      expect(result.success).toBe(true);
      expect(result.requirements?.requiredApis.length).toBeGreaterThanOrEqual(3);
      
      const apiNames = result.requirements?.requiredApis.map(api => api.name);
      expect(apiNames).toContain('slack');
      expect(apiNames).toContain('github');
      expect(apiNames).toContain('trello');
    });

    it('should handle errors gracefully', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('Network error'));

      const result = await service.determineApiRequirements(mockRequest);

      expect(result.success).toBe(true); // Should fallback to rules-based
      expect(result.requirements).toBeDefined();
    });
  });
});
