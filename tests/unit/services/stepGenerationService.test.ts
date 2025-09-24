import { StepGenerationService } from '../../../src/lib/services/stepGenerationService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('StepGenerationService', () => {
  let service: StepGenerationService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new StepGenerationService(mockOpenAIService);
  });

  describe('generateSteps', () => {
    const mockRequest = {
      userDescription: 'When a new GitHub issue is created, send a Slack notification',
      workflowPlan: {
        name: 'GitHub Issue Notification Workflow',
        description: 'Monitor GitHub issues and send Slack notifications',
        estimatedSteps: 3,
        stepTypes: ['webhook', 'api_call', 'api_call'],
        complexity: 'medium' as const
      },
      availableConnections: [
        {
          id: 'conn1',
          name: 'GitHub',
          baseUrl: 'https://api.github.com',
          endpoints: [
            { 
              path: '/repos/{owner}/{repo}/issues', 
              method: 'GET', 
              summary: 'List issues',
              parameters: [
                { name: 'state', type: 'string', required: false },
                { name: 'labels', type: 'string', required: false }
              ]
            }
          ]
        },
        {
          id: 'conn2',
          name: 'Slack',
          baseUrl: 'https://slack.com/api',
          endpoints: [
            { 
              path: '/chat.postMessage', 
              method: 'POST', 
              summary: 'Send message',
              parameters: [
                { name: 'channel', type: 'string', required: true },
                { name: 'text', type: 'string', required: true }
              ]
            }
          ]
        }
      ],
      context: 'Test context'
    };

    it('should successfully generate steps using AI', async () => {
      const mockAIResponse = {
        steps: [
          {
            id: 'step_1',
            name: 'Monitor GitHub Issues',
            type: 'webhook',
            description: 'Monitor for new GitHub issues',
            order: 1,
            conditions: { trigger: 'github_issue_created' }
          },
          {
            id: 'step_2',
            name: 'Send Slack Notification',
            type: 'api_call',
            description: 'Send notification to Slack',
            order: 2,
            apiConnectionId: 'conn2',
            endpoint: '/chat.postMessage',
            method: 'POST',
            parameters: { channel: '#general', text: 'New issue created' }
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockResolvedValue(JSON.stringify(mockAIResponse));

      const result = await service.generateSteps(mockRequest);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps![0].type).toBe('webhook');
      expect(result.steps![1].type).toBe('api_call');
      expect(result.steps![1].apiConnectionId).toBe('conn2');
    });

    it('should fallback to rules-based generation when AI fails', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(mockRequest);

      expect(result.success).toBe(true);
      expect(result.steps).toBeDefined();
      expect(result.steps!.length).toBeGreaterThan(0);
    });

    it('should generate webhook steps for monitoring requests', async () => {
      const webhookRequest = {
        ...mockRequest,
        userDescription: 'When a new GitHub issue is created, send notification'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(webhookRequest);

      expect(result.success).toBe(true);
      const webhookSteps = result.steps!.filter(step => step.type === 'webhook');
      expect(webhookSteps.length).toBeGreaterThan(0);
    });

    it('should generate API call steps for available connections', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(mockRequest);

      expect(result.success).toBe(true);
      const apiCallSteps = result.steps!.filter(step => step.type === 'api_call');
      expect(apiCallSteps.length).toBeGreaterThan(0);
      
      // Check that API call steps have valid connection IDs
      apiCallSteps.forEach(step => {
        expect(step.apiConnectionId).toBeDefined();
        expect(['conn1', 'conn2']).toContain(step.apiConnectionId);
      });
    });

    it('should generate data transform steps for transformation requests', async () => {
      const transformRequest = {
        ...mockRequest,
        userDescription: 'Transform the issue data and send to Slack'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(transformRequest);

      expect(result.success).toBe(true);
      const transformSteps = result.steps!.filter(step => step.type === 'data_transform');
      expect(transformSteps.length).toBeGreaterThan(0);
    });

    it('should generate condition steps for conditional logic', async () => {
      const conditionRequest = {
        ...mockRequest,
        userDescription: 'If the issue is urgent, send notification'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(conditionRequest);

      expect(result.success).toBe(true);
      const conditionSteps = result.steps!.filter(step => step.type === 'condition');
      expect(conditionSteps.length).toBeGreaterThan(0);
    });

    it('should assign correct order to steps', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(mockRequest);

      expect(result.success).toBe(true);
      const orders = result.steps!.map(step => step.order).sort();
      expect(orders).toEqual([1, 2, 3, 4]); // Should be sequential
    });

    it('should extract parameters correctly', async () => {
      const parameterRequest = {
        ...mockRequest,
        userDescription: 'Get issues with status active and limit 10'
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(parameterRequest);

      expect(result.success).toBe(true);
      const apiCallSteps = result.steps!.filter(step => step.type === 'api_call');
      if (apiCallSteps.length > 0) {
        expect(apiCallSteps[0].parameters).toBeDefined();
      }
    });

    it('should handle empty connections gracefully', async () => {
      const emptyConnectionsRequest = {
        ...mockRequest,
        availableConnections: []
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generateSteps(emptyConnectionsRequest);

      expect(result.success).toBe(true);
      expect(result.steps).toBeDefined();
      // Should still generate non-API steps like webhooks
      const webhookSteps = result.steps!.filter(step => step.type === 'webhook');
      expect(webhookSteps.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('Network error'));

      const result = await service.generateSteps(mockRequest);

      expect(result.success).toBe(true); // Should fallback to rules-based
      expect(result.steps).toBeDefined();
    });
  });
});
