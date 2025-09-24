import { ConnectionValidationService } from '../../../src/lib/services/connectionValidationService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('ConnectionValidationService', () => {
  let service: ConnectionValidationService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new ConnectionValidationService(mockOpenAIService);
  });

  describe('validateConnections', () => {
    const mockRequest = {
      steps: [
        {
          id: 'step_1',
          name: 'Monitor GitHub Issues',
          type: 'webhook',
          conditions: { trigger: 'github_issue_created' }
        },
        {
          id: 'step_2',
          name: 'Send Slack Notification',
          type: 'api_call',
          apiConnectionId: 'conn2',
          endpoint: '/chat.postMessage',
          method: 'POST'
        },
        {
          id: 'step_3',
          name: 'Invalid API Call',
          type: 'api_call',
          apiConnectionId: 'invalid_conn',
          endpoint: '/invalid/endpoint',
          method: 'GET'
        }
      ],
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
              parameters: []
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
              parameters: []
            }
          ]
        }
      ],
      userDescription: 'When a new GitHub issue is created, send a Slack notification'
    };

    it('should successfully validate connections using AI', async () => {
      const mockAIResponse = {
        validatedSteps: [
          {
            id: 'step_1',
            name: 'Monitor GitHub Issues',
            type: 'webhook',
            apiConnectionId: '',
            endpoint: '',
            method: '',
            isValid: true
          },
          {
            id: 'step_2',
            name: 'Send Slack Notification',
            type: 'api_call',
            apiConnectionId: 'conn2',
            endpoint: '/chat.postMessage',
            method: 'POST',
            isValid: true
          },
          {
            id: 'step_3',
            name: 'Invalid API Call',
            type: 'api_call',
            apiConnectionId: 'invalid_conn',
            endpoint: '/invalid/endpoint',
            method: 'GET',
            isValid: false,
            validationErrors: ['Connection ID not found']
          }
        ],
        missingConnections: [
          {
            stepId: 'step_3',
            requiredApi: 'Unknown API',
            suggestedConnections: ['conn1', 'conn2']
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockResolvedValue(JSON.stringify(mockAIResponse));

      const result = await service.validateConnections(mockRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps).toHaveLength(3);
      expect(result.validatedSteps![0].isValid).toBe(true);
      expect(result.validatedSteps![1].isValid).toBe(true);
      expect(result.validatedSteps![2].isValid).toBe(false);
      expect(result.missingConnections).toHaveLength(1);
    });

    it('should fallback to rules-based validation when AI fails', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(mockRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps).toHaveLength(3);
      
      // Webhook step should be valid (no connection required)
      const webhookStep = result.validatedSteps!.find(s => s.id === 'step_1');
      expect(webhookStep?.isValid).toBe(true);
      
      // Valid API call should be valid
      const validApiStep = result.validatedSteps!.find(s => s.id === 'step_2');
      expect(validApiStep?.isValid).toBe(true);
      
      // Invalid API call should be invalid
      const invalidApiStep = result.validatedSteps!.find(s => s.id === 'step_3');
      expect(invalidApiStep?.isValid).toBe(false);
      expect(invalidApiStep?.validationErrors).toContain("Connection ID 'invalid_conn' not found in available connections");
    });

    it('should validate webhook steps as valid', async () => {
      const webhookRequest = {
        ...mockRequest,
        steps: [
          {
            id: 'step_1',
            name: 'Monitor Events',
            type: 'webhook',
            conditions: { trigger: 'custom_trigger' }
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(webhookRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps![0].isValid).toBe(true);
      expect(result.validatedSteps![0].type).toBe('webhook');
    });

    it('should validate data transform steps as valid', async () => {
      const transformRequest = {
        ...mockRequest,
        steps: [
          {
            id: 'step_1',
            name: 'Transform Data',
            type: 'data_transform',
            dataMapping: { source: 'target' }
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(transformRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps![0].isValid).toBe(true);
      expect(result.validatedSteps![0].type).toBe('data_transform');
    });

    it('should validate condition steps as valid', async () => {
      const conditionRequest = {
        ...mockRequest,
        steps: [
          {
            id: 'step_1',
            name: 'Apply Condition',
            type: 'condition',
            conditions: { condition: 'default' }
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(conditionRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps![0].isValid).toBe(true);
      expect(result.validatedSteps![0].type).toBe('condition');
    });

    it('should identify missing connections correctly', async () => {
      const missingConnectionsRequest = {
        ...mockRequest,
        steps: [
          {
            id: 'step_1',
            name: 'Trello API Call',
            type: 'api_call',
            apiConnectionId: 'trello_conn',
            endpoint: '/cards',
            method: 'POST'
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(missingConnectionsRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps![0].isValid).toBe(false);
      expect(result.missingConnections).toHaveLength(1);
      expect(result.missingConnections![0].stepId).toBe('step_1');
      expect(result.missingConnections![0].requiredApi).toBe('Trello');
    });

    it('should suggest connections based on step names', async () => {
      const slackRequest = {
        ...mockRequest,
        steps: [
          {
            id: 'step_1',
            name: 'Slack Notification',
            type: 'api_call',
            apiConnectionId: 'missing_slack',
            endpoint: '/chat.postMessage',
            method: 'POST'
          }
        ]
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(slackRequest);

      expect(result.success).toBe(true);
      expect(result.missingConnections).toHaveLength(1);
      expect(result.missingConnections![0].suggestedConnections).toContain('conn2'); // Slack connection
    });

    it('should handle empty connections gracefully', async () => {
      const emptyConnectionsRequest = {
        ...mockRequest,
        availableConnections: []
      };

      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.validateConnections(emptyConnectionsRequest);

      expect(result.success).toBe(true);
      expect(result.validatedSteps).toHaveLength(3);
      
      // All API call steps should be invalid
      const apiCallSteps = result.validatedSteps!.filter(s => s.type === 'api_call');
      apiCallSteps.forEach(step => {
        expect(step.isValid).toBe(false);
      });
    });

    it('should handle errors gracefully', async () => {
      mockOpenAIService.chatCompletion.mockRejectedValue(new Error('Network error'));

      const result = await service.validateConnections(mockRequest);

      expect(result.success).toBe(true); // Should fallback to rules-based
      expect(result.validatedSteps).toBeDefined();
    });

    it('should extract required API names correctly', async () => {
      const service = new ConnectionValidationService(mockOpenAIService);
      
      // Test private method through public interface
      const result = await service.validateConnections({
        steps: [
          {
            id: 'step_1',
            name: 'Slack API Call',
            type: 'api_call',
            apiConnectionId: 'invalid',
            endpoint: '/test',
            method: 'POST'
          }
        ],
        availableConnections: [],
        userDescription: 'Test'
      });

      expect(result.success).toBe(true);
      expect(result.missingConnections![0].requiredApi).toBe('Slack');
    });
  });
});
