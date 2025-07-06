jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    chat = {
      completions: {
        create: jest.fn().mockImplementation(async () => ({
          choices: [
            {
              finish_reason: 'function_call',
              message: {
                function_call: {
                  name: 'GitHub_get_repos_owner_repo_issues',
                  arguments: JSON.stringify({
                    connectionId: 'conn1',
                    endpoint: '/repos/{owner}/{repo}/issues',
                    method: 'GET',
                    parameters: { owner: 'test', repo: 'test-repo' }
                  })
                }
              }
            }
          ]
        }))
      }
    }
  }
}));

/* eslint-disable import/first */
import NaturalLanguageWorkflowService from '../../../../src/lib/services/naturalLanguageWorkflowService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  apiConnection: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  workflow: {
    create: jest.fn()
  }
} as jest.Mocked<PrismaClient>;

describe('NaturalLanguageWorkflowService', () => {
  let service: NaturalLanguageWorkflowService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      apiConnection: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      workflow: {
        create: jest.fn()
      }
    } as any;
    service = new NaturalLanguageWorkflowService('test-api-key', mockPrisma);
    // Get the create mock for per-test overrides
    mockCreate = ((service as any).openai.chat.completions.create) as jest.Mock;
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
            {
              path: '/repos/{owner}/{repo}/issues',
              method: 'GET',
              summary: 'List repository issues',
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
              summary: 'Send a message to a channel',
              parameters: []
            }
          ]
        }
      ]
    };

    it('should generate workflow successfully', async () => {
      // Default mock already returns a valid function_call
      const result = await service.generateWorkflow(mockRequest);
      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.steps).toHaveLength(1);
      expect(result.workflow?.steps[0].type).toBe('api_call');
    });

    it('should handle OpenAI errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API error'));
      const result = await service.generateWorkflow(mockRequest);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate workflow due to technical error');
    });

    it('should handle unclear requests', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          finish_reason: 'stop',
          message: {
            content: 'I need more specific details about what you want to accomplish.'
          }
        }]
      });
      const result = await service.generateWorkflow(mockRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('more specific details about what you want to accomplish');
    });
  });

  describe('validateWorkflow', () => {
    const mockWorkflow = {
      id: 'workflow123',
      name: 'Test Workflow',
      description: 'Test workflow description',
      steps: [
        {
          id: 'step1',
          name: 'GitHub API Call',
          type: 'api_call' as const,
          apiConnectionId: 'conn1',
          endpoint: '/repos/{owner}/{repo}/issues',
          method: 'GET',
          parameters: {},
          order: 1
        }
      ],
      estimatedExecutionTime: 5000,
      confidence: 0.85,
      explanation: 'This workflow will call GitHub API'
    };

    it('should validate workflow with existing connections', async () => {
      mockPrisma.apiConnection.findUnique.mockResolvedValue({
        id: 'conn1',
        name: 'GitHub',
        status: 'ACTIVE'
      } as any);

      const result = await service.validateWorkflow(mockWorkflow);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid connections', async () => {
      mockPrisma.apiConnection.findUnique.mockResolvedValue(null);

      const result = await service.validateWorkflow(mockWorkflow);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('API connection conn1 not found');
    });

    it('should detect inactive connections', async () => {
      mockPrisma.apiConnection.findUnique.mockResolvedValue({
        id: 'conn1',
        name: 'GitHub',
        status: 'INACTIVE'
      } as any);

      const result = await service.validateWorkflow(mockWorkflow);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('API connection GitHub is not active');
    });

    it('should suggest breaking down complex workflows', async () => {
      const complexWorkflow = {
        ...mockWorkflow,
        steps: Array.from({ length: 15 }, (_, i) => ({
          ...mockWorkflow.steps[0],
          id: `step${i}`,
          order: i + 1
        }))
      };

      mockPrisma.apiConnection.findUnique.mockResolvedValue({
        id: 'conn1',
        name: 'GitHub',
        status: 'ACTIVE'
      } as any);

      const result = await service.validateWorkflow(complexWorkflow);

      expect(result.isValid).toBe(true);
      expect(result.suggestions).toContain('Consider breaking this into smaller workflows');
    });
  });

  describe('saveWorkflow', () => {
    const mockWorkflow = {
      id: 'workflow123',
      name: 'Test Workflow',
      description: 'Test workflow description',
      steps: [
        {
          id: 'step1',
          name: 'GitHub API Call',
          type: 'api_call' as const,
          apiConnectionId: 'conn1',
          endpoint: '/repos/{owner}/{repo}/issues',
          method: 'GET',
          parameters: {},
          order: 1
        }
      ],
      estimatedExecutionTime: 5000,
      confidence: 0.85,
      explanation: 'This workflow will call GitHub API'
    };

    it('should save workflow successfully', async () => {
      mockPrisma.workflow.create.mockResolvedValue({
        id: 'workflow123',
        name: 'Test Workflow'
      } as any);

      const result = await service.saveWorkflow(mockWorkflow, 'user123');

      expect(result).toBe('workflow123');
      expect(mockPrisma.workflow.create).toHaveBeenCalledWith({
        data: {
          id: 'workflow123',
          name: 'Test Workflow',
          description: 'Test workflow description',
          userId: 'user123',
          isActive: true,
          steps: mockWorkflow.steps,
          metadata: {
            estimatedExecutionTime: 5000,
            confidence: 0.85,
            explanation: 'This workflow will call GitHub API',
            generatedAt: expect.any(String)
          }
        }
      });
    });
  });
}); 