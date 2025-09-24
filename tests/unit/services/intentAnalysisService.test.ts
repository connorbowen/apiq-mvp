import { IntentAnalysisService } from '../../../src/lib/services/intentAnalysisService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('IntentAnalysisService', () => {
  let service: IntentAnalysisService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new IntentAnalysisService(mockOpenAIService);
  });

  describe('analyzeIntent', () => {
    const mockRequest = {
      userMessage: 'I want to send a message to my team when a new GitHub issue is created',
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

    it('should successfully analyze intent using AI', async () => {
      const mockAIResponse = {
        userGoal: 'Create automated workflow for GitHub issue notifications',
        guidanceType: 'connection_setup',
        complexity: 'medium',
        requiresMultipleApis: true,
        confidence: 0.9
      };

      mockOpenAIService.chatCompletion.mockResolvedValue(JSON.stringify(mockAIResponse));

      const result = await service.analyzeIntent(mockRequest);

      expect(result.success).toBe(true);
      expect(result.intent).toEqual(mockAIResponse);
      expect(mockOpenAIService.chatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 400
        })
      );
    });

    it('should fallback to rules-based analysis when AI fails', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(mockRequest);

      expect(result.success).toBe(true);
      expect(result.intent).toBeDefined();
      expect(result.intent?.userGoal).toContain('message');
      expect(result.intent?.guidanceType).toBeDefined();
      expect(result.intent?.confidence).toBe(0.7); // Rules-based confidence
    });

    it('should detect messaging intent correctly', async () => {
      const messagingRequest = {
        ...mockRequest,
        userMessage: 'Send a message to my team'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(messagingRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.userGoal).toContain('Send messages');
      expect(result.intent?.guidanceType).toBe('api_specific');
    });

    it('should detect workflow creation intent correctly', async () => {
      const workflowRequest = {
        ...mockRequest,
        userMessage: 'Create a workflow that automates my tasks'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(workflowRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.userGoal).toContain('Create automated workflow');
      expect(result.intent?.guidanceType).toBe('connection_setup');
      expect(result.intent?.complexity).toBe('medium');
    });

    it('should detect monitoring intent correctly', async () => {
      const monitoringRequest = {
        ...mockRequest,
        userMessage: 'Monitor my GitHub repository for new issues'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(monitoringRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.userGoal).toContain('Monitor');
      expect(result.intent?.guidanceType).toBe('api_specific');
    });

    it('should detect integration intent correctly', async () => {
      const integrationRequest = {
        ...mockRequest,
        userMessage: 'Integrate Slack and GitHub to automate notifications'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(integrationRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.userGoal).toContain('Integrate');
      expect(result.intent?.guidanceType).toBe('api_specific');
      expect(result.intent?.complexity).toBe('complex');
      expect(result.intent?.requiresMultipleApis).toBe(true);
    });

    it('should detect data retrieval intent correctly', async () => {
      const dataRequest = {
        ...mockRequest,
        userMessage: 'Get all issues from my GitHub repository'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(dataRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.userGoal).toContain('Retrieve data');
      expect(result.intent?.guidanceType).toBe('api_specific');
    });

    it('should detect data update intent correctly', async () => {
      const updateRequest = {
        ...mockRequest,
        userMessage: 'Update the status of my GitHub issues'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(updateRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.userGoal).toContain('Update');
      expect(result.intent?.guidanceType).toBe('api_specific');
    });

    it('should detect multiple APIs correctly', async () => {
      const multiApiRequest = {
        ...mockRequest,
        userMessage: 'Send Slack notification when GitHub issue is created and create Trello card'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(multiApiRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.requiresMultipleApis).toBe(true);
      expect(result.intent?.complexity).toBe('complex');
    });

    it('should handle empty connections gracefully', async () => {
      const emptyConnectionsRequest = {
        ...mockRequest,
        availableConnections: []
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeIntent(emptyConnectionsRequest);

      expect(result.success).toBe(true);
      expect(result.intent?.guidanceType).toBe('connection_setup');
    });

    it('should handle errors gracefully', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('Network error'));

      const result = await service.analyzeIntent(mockRequest);

      expect(result.success).toBe(true); // Should fallback to rules-based
      expect(result.intent).toBeDefined();
    });
  });
});
