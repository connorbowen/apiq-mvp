import { WorkflowOrchestrator } from '../../../src/lib/services/workflowOrchestrator';
import { WorkflowPlanningService } from '../../../src/lib/services/workflowPlanningService';
import { StepGenerationService } from '../../../src/lib/services/stepGenerationService';
import { ConnectionValidationService } from '../../../src/lib/services/connectionValidationService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock all services
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/lib/services/workflowPlanningService');
jest.mock('../../../src/lib/services/stepGenerationService');
jest.mock('../../../src/lib/services/connectionValidationService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let mockPlanningService: jest.Mocked<WorkflowPlanningService>;
  let mockStepGenerationService: jest.Mocked<StepGenerationService>;
  let mockValidationService: jest.Mocked<ConnectionValidationService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    mockPlanningService = {
      planWorkflow: jest.fn()
    } as any;

    mockStepGenerationService = {
      generateSteps: jest.fn()
    } as any;

    mockValidationService = {
      validateConnections: jest.fn()
    } as any;

    // Mock the service constructors
    (WorkflowPlanningService as jest.Mock).mockImplementation(() => mockPlanningService);
    (StepGenerationService as jest.Mock).mockImplementation(() => mockStepGenerationService);
    (ConnectionValidationService as jest.Mock).mockImplementation(() => mockValidationService);

    orchestrator = new WorkflowOrchestrator(mockOpenAIService);
  });

  describe('generateWorkflow', () => {
    const mockRequest = {
      userDescription: 'When a new GitHub issue is created, send a Slack notification',
      userId: 'user123',
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

    it('should successfully generate a complete workflow', async () => {
      // Mock planning service
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: true,
        workflowPlan: {
          name: 'GitHub Issue Notification Workflow',
          description: 'Monitor GitHub issues and send Slack notifications',
          estimatedSteps: 3,
          stepTypes: ['webhook', 'api_call'],
          complexity: 'medium',
          confidence: 0.9
        }
      });

      // Mock step generation service
      mockStepGenerationService.generateSteps.mockResolvedValue({
        success: true,
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
      });

      // Mock validation service
      mockValidationService.validateConnections.mockResolvedValue({
        success: true,
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
          }
        ]
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow!.name).toBe('GitHub Issue Notification Workflow');
      expect(result.workflow!.steps).toHaveLength(2);
      expect(result.workflow!.complexity).toBe('medium');
      expect(result.workflow!.confidence).toBe(0.9);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      // Verify all services were called
      expect(mockPlanningService.planWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          userDescription: mockRequest.userDescription,
          availableConnections: mockRequest.availableConnections,
          context: mockRequest.context
        })
      );
      expect(mockStepGenerationService.generateSteps).toHaveBeenCalled();
      expect(mockValidationService.validateConnections).toHaveBeenCalled();
    });

    it('should handle planning failure gracefully', async () => {
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: false,
        error: 'Planning failed'
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Planning failed');
      expect(result.workflow).toBeUndefined();
    });

    it('should handle step generation failure gracefully', async () => {
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: true,
        workflowPlan: {
          name: 'Test Workflow',
          description: 'Test description',
          estimatedSteps: 2,
          stepTypes: ['api_call'],
          complexity: 'simple',
          confidence: 0.8
        }
      });

      mockStepGenerationService.generateSteps.mockResolvedValue({
        success: false,
        error: 'Step generation failed'
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Step generation failed');
    });

    it('should handle validation failure gracefully', async () => {
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: true,
        workflowPlan: {
          name: 'Test Workflow',
          description: 'Test description',
          estimatedSteps: 2,
          stepTypes: ['api_call'],
          complexity: 'simple',
          confidence: 0.8
        }
      });

      mockStepGenerationService.generateSteps.mockResolvedValue({
        success: true,
        steps: [
          {
            id: 'step_1',
            name: 'Test Step',
            type: 'api_call',
            description: 'Test step',
            order: 1,
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET'
          }
        ]
      });

      mockValidationService.validateConnections.mockResolvedValue({
        success: false,
        error: 'Validation failed'
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockPlanningService.planWorkflow.mockRejectedValue(new Error('Unexpected error'));

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should generate appropriate step descriptions', async () => {
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: true,
        workflowPlan: {
          name: 'Test Workflow',
          description: 'Test description',
          estimatedSteps: 2,
          stepTypes: ['webhook', 'api_call'],
          complexity: 'simple',
          confidence: 0.8
        }
      });

      mockStepGenerationService.generateSteps.mockResolvedValue({
        success: true,
        steps: [
          {
            id: 'step_1',
            name: 'Monitor Events',
            type: 'webhook',
            description: 'Monitor for trigger events',
            order: 1
          },
          {
            id: 'step_2',
            name: 'API Call',
            type: 'api_call',
            description: 'Make API request',
            order: 2,
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET'
          }
        ]
      });

      mockValidationService.validateConnections.mockResolvedValue({
        success: true,
        validatedSteps: [
          {
            id: 'step_1',
            name: 'Monitor Events',
            type: 'webhook',
            apiConnectionId: '',
            endpoint: '',
            method: '',
            isValid: true
          },
          {
            id: 'step_2',
            name: 'API Call',
            type: 'api_call',
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET',
            isValid: true
          }
        ]
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.workflow!.steps[0].description).toBe('Monitor for trigger events');
      expect(result.workflow!.steps[1].description).toBe('Make API call to API Call');
    });

    it('should generate comprehensive workflow explanation', async () => {
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: true,
        workflowPlan: {
          name: 'Test Workflow',
          description: 'Test description',
          estimatedSteps: 2,
          stepTypes: ['api_call'],
          complexity: 'simple',
          confidence: 0.8
        }
      });

      mockStepGenerationService.generateSteps.mockResolvedValue({
        success: true,
        steps: [
          {
            id: 'step_1',
            name: 'Test Step',
            type: 'api_call',
            description: 'Test step',
            order: 1,
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET'
          }
        ]
      });

      mockValidationService.validateConnections.mockResolvedValue({
        success: true,
        validatedSteps: [
          {
            id: 'step_1',
            name: 'Test Step',
            type: 'api_call',
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET',
            isValid: true
          }
        ]
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.workflow!.explanation).toContain('Test Workflow');
      expect(result.workflow!.explanation).toContain('1. Test Step: Make API call to Test Step');
      expect(result.workflow!.explanation).toContain(mockRequest.userDescription.toLowerCase());
    });

    it('should track processing time correctly', async () => {
      mockPlanningService.planWorkflow.mockResolvedValue({
        success: true,
        workflowPlan: {
          name: 'Test Workflow',
          description: 'Test description',
          estimatedSteps: 1,
          stepTypes: ['api_call'],
          complexity: 'simple',
          confidence: 0.8
        }
      });

      mockStepGenerationService.generateSteps.mockResolvedValue({
        success: true,
        steps: [
          {
            id: 'step_1',
            name: 'Test Step',
            type: 'api_call',
            description: 'Test step',
            order: 1,
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET'
          }
        ]
      });

      mockValidationService.validateConnections.mockResolvedValue({
        success: true,
        validatedSteps: [
          {
            id: 'step_1',
            name: 'Test Step',
            type: 'api_call',
            apiConnectionId: 'conn1',
            endpoint: '/test',
            method: 'GET',
            isValid: true
          }
        ]
      });

      const result = await orchestrator.generateWorkflow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTime).toBe('number');
    });
  });
});
