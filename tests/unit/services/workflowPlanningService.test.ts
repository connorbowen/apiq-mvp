import { WorkflowPlanningService } from '../../../src/lib/services/workflowPlanningService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('WorkflowPlanningService', () => {
  let service: WorkflowPlanningService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new WorkflowPlanningService(mockOpenAIService);
  });

  describe('planWorkflow', () => {
    const mockRequest = {
      userDescription: 'When a new GitHub issue is created, send a Slack notification',
      availableConnections: [
        {
          id: 'conn1',
          name: 'GitHub',
          baseUrl: 'https://api.github.com',
          endpoints: [
            { path: '/repos/{owner}/{repo}/issues', method: 'GET', summary: 'List issues' }
          ]
        },
        {
          id: 'conn2',
          name: 'Slack',
          baseUrl: 'https://slack.com/api',
          endpoints: [
            { path: '/chat.postMessage', method: 'POST', summary: 'Send message' }
          ]
        }
      ],
      context: 'Test context'
    };

    it('should successfully plan workflow using AI', async () => {
      const mockAIResponse = {
        name: 'GitHub Issue Notification Workflow',
        description: 'Monitor GitHub issues and send Slack notifications',
        estimatedSteps: 3,
        stepTypes: ['webhook', 'api_call', 'api_call'],
        complexity: 'medium',
        confidence: 0.9
      };

      mockOpenAIService.chatCompletion.mockResolvedValue(JSON.stringify(mockAIResponse));

      const result = await service.planWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan).toEqual(mockAIResponse);
      expect(mockOpenAIService.chatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 500
        })
      );
    });

    it('should fallback to rules-based planning when AI fails', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan).toBeDefined();
      expect(result.workflowPlan?.name).toContain('Workflow');
      expect(result.workflowPlan?.complexity).toBeDefined();
      expect(result.workflowPlan?.confidence).toBe(0.7); // Rules-based confidence
    });

    it('should handle simple workflows correctly', async () => {
      const simpleRequest = {
        ...mockRequest,
        userDescription: 'Get all users from database'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(simpleRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan?.complexity).toBe('simple');
      expect(result.workflowPlan?.estimatedSteps).toBe(2);
    });

    it('should handle complex workflows correctly', async () => {
      const complexRequest = {
        ...mockRequest,
        userDescription: 'When a new GitHub issue is created, if it is urgent, send a Slack notification to the team, create a Trello card, and send an email to the project manager'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(complexRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan?.complexity).toBe('complex');
      expect(result.workflowPlan?.estimatedSteps).toBeGreaterThan(3);
    });

    it('should detect webhook triggers correctly', async () => {
      const webhookRequest = {
        ...mockRequest,
        userDescription: 'When a new GitHub issue is created, send notification'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(webhookRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan?.stepTypes).toContain('webhook');
    });

    it('should detect conditional logic correctly', async () => {
      const conditionRequest = {
        ...mockRequest,
        userDescription: 'If the issue is urgent, send notification'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(conditionRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan?.stepTypes).toContain('condition');
    });

    it('should detect data transformation correctly', async () => {
      const transformRequest = {
        ...mockRequest,
        userDescription: 'Transform the issue data and send to Slack'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(transformRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan?.stepTypes).toContain('data_transform');
    });

    it('should handle errors gracefully', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('Network error'));

      const result = await service.planWorkflow(mockRequest);

      expect(result.success).toBe(true); // Should fallback to rules-based
      expect(result.workflowPlan).toBeDefined();
    });

    it('should generate appropriate workflow names', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.planWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.workflowPlan?.name).toContain('Workflow');
      expect(result.workflowPlan?.name).not.toBe('Workflow'); // Should have descriptive name
    });
  });
});
