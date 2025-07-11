import { MultiStepWorkflowService } from '../../../../src/lib/services/multiStepWorkflowService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma for unit testing (following user-rules.md testing guidelines)
const mockPrisma = {
  apiConnection: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  workflow: {
    create: jest.fn()
  }
} as jest.Mocked<PrismaClient>;

/**
 * MultiStepWorkflowService Unit Tests
 * 
 * Tests the core multi-step workflow generation functionality that addresses
 * the P0.1.1 MVP blocker for natural language workflow creation.
 * 
 * Following user-rules.md testing guidelines:
 * - Unit tests may use mocks for external dependencies
 * - Test data is clearly marked as test-specific
 * - Comprehensive coverage of success and error scenarios
 * - Proper TypeScript typing and error handling
 */
describe('MultiStepWorkflowService', () => {
  let service: MultiStepWorkflowService;
  let mockPrisma: jest.Mocked<PrismaClient>;

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
    service = new MultiStepWorkflowService('test-api-key', mockPrisma);
  });

  describe('P0.1.1: Multi-Step Workflow Generation - Core MVP Blocker', () => {
    // Test data following user-rules.md: no mock data in dev/prod, only in test scripts
    const mockRequest = {
      userDescription: 'When a new GitHub issue is created, send a Slack notification and create a Trello card',
      userId: 'test-user-id-123', // Test-specific user ID
      availableConnections: [
        {
          id: 'test-github-conn',
          name: 'GitHub',
          baseUrl: 'https://api.github.com',
          endpoints: [
            {
              path: '/repos/{owner}/{repo}/issues',
              method: 'GET',
              summary: 'List repository issues',
              parameters: []
            },
            {
              path: '/repos/{owner}/{repo}/hooks',
              method: 'POST',
              summary: 'Create a repository webhook',
              parameters: []
            }
          ]
        },
        {
          id: 'test-slack-conn',
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
        },
        {
          id: 'test-trello-conn',
          name: 'Trello',
          baseUrl: 'https://api.trello.com/1',
          endpoints: [
            {
              path: '/cards',
              method: 'POST',
              summary: 'Create a new card',
              parameters: []
            }
          ]
        }
      ]
    };

    describe('generateMultiStepWorkflow', () => {
      it('should generate multi-step workflow from complex description', async () => {
        // Mock OpenAI response for multi-step workflow
        const mockOpenAIResponse = {
          choices: [{
            finish_reason: 'function_call',
            message: {
              function_call: {
                name: 'create_multi_step_workflow',
                arguments: JSON.stringify({
                  workflowName: 'GitHub Issue to Slack and Trello',
                  description: 'Monitor GitHub issues and notify Slack and Trello',
                  steps: [
                    {
                      stepNumber: 1,
                      name: 'Monitor GitHub Issues',
                      type: 'webhook',
                      connectionId: 'test-github-conn',
                      endpoint: '/repos/{owner}/{repo}/hooks',
                      method: 'POST',
                      parameters: {
                        events: ['issues'],
                        config: { url: '{{webhook_url}}' }
                      },
                      dataMapping: {}
                    },
                    {
                      stepNumber: 2,
                      name: 'Send Slack Notification',
                      type: 'api_call',
                      connectionId: 'test-slack-conn',
                      endpoint: '/chat.postMessage',
                      method: 'POST',
                      parameters: {
                        channel: '#general',
                        text: 'New GitHub issue: {{step1.issue.title}}'
                      },
                      dataMapping: {
                        'text': 'New GitHub issue: {{step1.issue.title}}'
                      }
                    },
                    {
                      stepNumber: 3,
                      name: 'Create Trello Card',
                      type: 'api_call',
                      connectionId: 'test-trello-conn',
                      endpoint: '/cards',
                      method: 'POST',
                      parameters: {
                        name: '{{step1.issue.title}}',
                        desc: '{{step1.issue.body}}',
                        idList: '{{trello_list_id}}'
                      },
                      dataMapping: {
                        'name': '{{step1.issue.title}}',
                        'desc': '{{step1.issue.body}}'
                      }
                    }
                  ]
                })
              }
            }
          }]
        };

        // Mock the OpenAI client
        (service as any).openai.chat.completions.create = jest.fn().mockResolvedValue(mockOpenAIResponse);

        const result = await service.generateMultiStepWorkflow(mockRequest);

        expect(result.success).toBe(true);
        expect(result.workflow).toBeDefined();
        expect(result.workflow?.steps).toHaveLength(3);
        expect(result.workflow?.steps[0].type).toBe('webhook');
        expect(result.workflow?.steps[1].type).toBe('api_call');
        expect(result.workflow?.steps[2].type).toBe('api_call');
        
        // Validate step ordering
        expect(result.workflow?.steps[0].order).toBe(1);
        expect(result.workflow?.steps[1].order).toBe(2);
        expect(result.workflow?.steps[2].order).toBe(3);
      });

      it('should handle workflow planning and decomposition', async () => {
        const complexRequest = {
          ...mockRequest,
          userDescription: 'When a customer places an order: 1) Create invoice in QuickBooks, 2) Send confirmation email, 3) Update inventory in Shopify, 4) Create shipping label in ShipStation'
        };

        const mockOpenAIResponse = {
          choices: [{
            finish_reason: 'function_call',
            message: {
              function_call: {
                name: 'create_multi_step_workflow',
                arguments: JSON.stringify({
                  workflowName: 'Order Processing Pipeline',
                  description: 'Complete order processing workflow',
                  steps: [
                    {
                      stepNumber: 1,
                      name: 'Create QuickBooks Invoice',
                      type: 'api_call',
                      connectionId: 'quickbooks-conn',
                      endpoint: '/invoices',
                      method: 'POST',
                      parameters: {},
                      dataMapping: {}
                    },
                    {
                      stepNumber: 2,
                      name: 'Send Confirmation Email',
                      type: 'api_call',
                      connectionId: 'email-conn',
                      endpoint: '/send',
                      method: 'POST',
                      parameters: {},
                      dataMapping: {
                        'to': '{{step1.customer.email}}',
                        'subject': 'Order Confirmation: {{step1.invoice.number}}'
                      }
                    },
                    {
                      stepNumber: 3,
                      name: 'Update Shopify Inventory',
                      type: 'api_call',
                      connectionId: 'shopify-conn',
                      endpoint: '/inventory_levels/set',
                      method: 'POST',
                      parameters: {},
                      dataMapping: {}
                    },
                    {
                      stepNumber: 4,
                      name: 'Create ShipStation Label',
                      type: 'api_call',
                      connectionId: 'shipstation-conn',
                      endpoint: '/orders/createlabel',
                      method: 'POST',
                      parameters: {},
                      dataMapping: {}
                    }
                  ]
                })
              }
            }
          }]
        };

        (service as any).openai.chat.completions.create = jest.fn().mockResolvedValue(mockOpenAIResponse);

        const result = await service.generateMultiStepWorkflow(complexRequest);

        expect(result.success).toBe(true);
        expect(result.workflow?.steps).toHaveLength(4);
        
        // Validate step dependencies
        expect(result.workflow?.steps[1].dependencies).toContain('step1');
        expect(result.workflow?.steps[2].dependencies).toContain('step1');
        expect(result.workflow?.steps[3].dependencies).toContain('step1');
      });

      it('should validate step dependencies and ordering', async () => {
        const result = await service.validateStepDependencies([
          { id: 'step1', order: 1, dependencies: [] },
          { id: 'step2', order: 2, dependencies: ['step1'] },
          { id: 'step3', order: 3, dependencies: ['step2'] }
        ]);

        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should detect circular dependencies', async () => {
        const result = await service.validateStepDependencies([
          { id: 'step1', order: 1, dependencies: ['step3'] },
          { id: 'step2', order: 2, dependencies: ['step1'] },
          { id: 'step3', order: 3, dependencies: ['step2'] }
        ]);

        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Circular dependency detected: step1 → step3 → step2 → step1');
      });
    });

    describe('P0.1.2: Data Flow Mapping', () => {
      it('should map data between workflow steps', async () => {
        const dataMapping = {
          'step2.text': 'New issue: {{step1.issue.title}}',
          'step3.name': '{{step1.issue.title}}',
          'step3.desc': '{{step1.issue.body}}'
        };

        const result = await service.validateDataMapping(dataMapping);

        expect(result.isValid).toBe(true);
        expect(result.mappings).toHaveLength(3);
        expect(result.mappings[0].source).toBe('step1.issue.title');
        expect(result.mappings[0].target).toBe('step2.text');
      });

      it('should validate data type compatibility', async () => {
        const incompatibleMapping = {
          'step2.number': '{{step1.text_field}}' // Trying to map text to number
        };

        const result = await service.validateDataMapping(incompatibleMapping);

        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Data type mismatch: text cannot be mapped to number');
      });

      it('should support conditional data flow', async () => {
        const conditionalMapping = {
          'step2.action': '{{step1.status === "urgent" ? "immediate" : "normal"}}'
        };

        const result = await service.validateDataMapping(conditionalMapping);

        expect(result.isValid).toBe(true);
        expect(result.mappings[0].type).toBe('conditional');
      });
    });

    describe('P0.1.3: Conditional Logic and Branching', () => {
      it('should generate conditional workflow steps', async () => {
        const conditionalRequest = {
          ...mockRequest,
          userDescription: 'If GitHub issue is urgent, send Slack notification immediately, otherwise send email'
        };

        const mockOpenAIResponse = {
          choices: [{
            finish_reason: 'function_call',
            message: {
              function_call: {
                name: 'create_conditional_workflow',
                arguments: JSON.stringify({
                  workflowName: 'Conditional Issue Handling',
                  description: 'Handle issues based on urgency',
                  steps: [
                    {
                      stepNumber: 1,
                      name: 'Monitor GitHub Issues',
                      type: 'webhook',
                      connectionId: 'github-conn',
                      endpoint: '/repos/{owner}/{repo}/hooks',
                      method: 'POST',
                      parameters: {},
                      dataMapping: {}
                    },
                    {
                      stepNumber: 2,
                      name: 'Check Issue Urgency',
                      type: 'condition',
                      conditions: {
                        field: 'step1.issue.labels',
                        operator: 'contains',
                        value: 'urgent'
                      },
                      trueSteps: ['step3'],
                      falseSteps: ['step4']
                    },
                    {
                      stepNumber: 3,
                      name: 'Send Urgent Slack Notification',
                      type: 'api_call',
                      connectionId: 'slack-conn',
                      endpoint: '/chat.postMessage',
                      method: 'POST',
                      parameters: {
                        channel: '#urgent',
                        text: '🚨 URGENT: {{step1.issue.title}}'
                      },
                      dataMapping: {}
                    },
                    {
                      stepNumber: 4,
                      name: 'Send Regular Email',
                      type: 'api_call',
                      connectionId: 'email-conn',
                      endpoint: '/send',
                      method: 'POST',
                      parameters: {
                        to: 'team@company.com',
                        subject: 'New Issue: {{step1.issue.title}}'
                      },
                      dataMapping: {}
                    }
                  ]
                })
              }
            }
          }]
        };

        (service as any).openai.chat.completions.create = jest.fn().mockResolvedValue(mockOpenAIResponse);

        const result = await service.generateMultiStepWorkflow(conditionalRequest);

        expect(result.success).toBe(true);
        expect(result.workflow?.steps).toHaveLength(4);
        
        // Validate conditional step
        const conditionalStep = result.workflow?.steps.find(s => s.type === 'condition');
        expect(conditionalStep).toBeDefined();
        expect(conditionalStep?.conditions).toBeDefined();
        expect(conditionalStep?.trueSteps).toContain('step3');
        expect(conditionalStep?.falseSteps).toContain('step4');
      });

      it('should validate conditional logic syntax', async () => {
        const validCondition = {
          field: 'step1.status',
          operator: 'equals',
          value: 'urgent'
        };

        const result = await service.validateCondition(validCondition);

        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should detect invalid conditional logic', async () => {
        const invalidCondition = {
          field: 'step1.status',
          operator: 'invalid_operator',
          value: 'urgent'
        };

        const result = await service.validateCondition(invalidCondition);

        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Invalid operator: invalid_operator');
      });
    });

    describe('P0.1.4: Function Name Collision Prevention', () => {
      it('should generate unique function names with API prefixes', async () => {
        const functions = await service.generateUniqueFunctionNames(mockRequest.availableConnections);

        expect(functions).toHaveLength(4); // 2 GitHub + 1 Slack + 1 Trello
        
        // Check for API prefixes
        const functionNames = functions.map(f => f.name);
        expect(functionNames.some(name => name.startsWith('GitHub_'))).toBe(true);
        expect(functionNames.some(name => name.startsWith('Slack_'))).toBe(true);
        expect(functionNames.some(name => name.startsWith('Trello_'))).toBe(true);
        
        // Check for uniqueness
        const uniqueNames = new Set(functionNames);
        expect(uniqueNames.size).toBe(functionNames.length);
      });

      it('should handle function name conflicts', async () => {
        const conflictingConnections = [
          {
            id: 'github1',
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
            id: 'github2',
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
          }
        ];

        const functions = await service.generateUniqueFunctionNames(conflictingConnections);

        expect(functions).toHaveLength(2);
        expect(functions[0].name).not.toBe(functions[1].name);
        expect(functions[0].name).toMatch(/GitHub_.*_1/);
        expect(functions[1].name).toMatch(/GitHub_.*_2/);
      });
    });

    describe('P0.1.5: Parameter Schema Enhancement', () => {
      it('should enhance parameter schemas with examples and validation', async () => {
        const enhancedSchemas = await service.enhanceParameterSchemas([
          {
            name: 'channel',
            in: 'body',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'text',
            in: 'body',
            required: true,
            schema: { type: 'string' }
          }
        ]);

        expect(enhancedSchemas).toHaveLength(2);
        expect(enhancedSchemas[0].description).toBeDefined();
        expect(enhancedSchemas[0].examples).toBeDefined();
        expect(enhancedSchemas[0].validation).toBeDefined();
      });

      it('should support complex parameter types', async () => {
        const complexSchema = {
          name: 'message',
          in: 'body',
          required: true,
          schema: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              attachments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              }
            }
          }
        };

        const enhanced = await service.enhanceParameterSchemas([complexSchema]);

        expect(enhanced[0].schema.properties.attachments.items.properties.title.description).toBeDefined();
        expect(enhanced[0].schema.properties.attachments.items.properties.title.examples).toBeDefined();
      });
    });

    describe('P0.1.6: Context-Aware Function Filtering', () => {
      it('should filter functions based on user request context', async () => {
        const userRequest = 'Send Slack notification for new orders';
        
        const filteredFunctions = await service.filterFunctionsByContext(
          mockRequest.availableConnections,
          userRequest
        );

        // Should prioritize Slack functions
        expect(filteredFunctions.some(f => f.name.includes('Slack'))).toBe(true);
        expect(filteredFunctions.length).toBeLessThanOrEqual(10); // Token limit
      });

      it('should categorize APIs by function', async () => {
        const categories = await service.categorizeAPIs(mockRequest.availableConnections);

        expect(categories.communication).toContain('slack-conn');
        expect(categories.development).toContain('github-conn');
        expect(categories.productivity).toContain('trello-conn');
      });

      it('should score function relevance', async () => {
        const userRequest = 'Send notification when GitHub issue is created';
        
        const scoredFunctions = await service.scoreFunctionRelevance(
          mockRequest.availableConnections,
          userRequest
        );

        // GitHub and Slack functions should have higher scores
        const githubFunction = scoredFunctions.find(f => f.name.includes('GitHub'));
        const slackFunction = scoredFunctions.find(f => f.name.includes('Slack'));
        
        expect(githubFunction?.relevanceScore).toBeGreaterThan(0.7);
        expect(slackFunction?.relevanceScore).toBeGreaterThan(0.7);
      });
    });

    describe('P0.1.7: Workflow Validation Enhancement', () => {
      it('should validate workflow completeness', async () => {
        const workflow = {
          id: 'test-workflow',
          name: 'Test Workflow',
          description: 'Test description',
          steps: [
            {
              id: 'step1',
              name: 'Step 1',
              type: 'webhook',
              order: 1,
              dependencies: []
            },
            {
              id: 'step2',
              name: 'Step 2',
              type: 'api_call',
              order: 2,
              dependencies: ['step1']
            }
          ]
        };

        const result = await service.validateWorkflowCompleteness(workflow);

        expect(result.isValid).toBe(true);
        expect(result.completenessScore).toBeGreaterThan(0.8);
      });

      it('should detect missing required steps', async () => {
        const incompleteWorkflow = {
          id: 'test-workflow',
          name: 'Test Workflow',
          description: 'Test description',
          steps: [
            {
              id: 'step1',
              name: 'Step 1',
              type: 'webhook',
              order: 1,
              dependencies: []
            }
            // Missing action step
          ]
        };

        const result = await service.validateWorkflowCompleteness(incompleteWorkflow);

        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Workflow missing action step after trigger');
      });

      it('should suggest workflow improvements', async () => {
        const basicWorkflow = {
          id: 'test-workflow',
          name: 'Test Workflow',
          description: 'Test description',
          steps: [
            {
              id: 'step1',
              name: 'Step 1',
              type: 'webhook',
              order: 1,
              dependencies: []
            },
            {
              id: 'step2',
              name: 'Step 2',
              type: 'api_call',
              order: 2,
              dependencies: ['step1']
            }
          ]
        };

        const result = await service.suggestWorkflowImprovements(basicWorkflow);

        expect(result.suggestions).toContain('Consider adding error handling');
        expect(result.suggestions).toContain('Add data validation between steps');
      });
    });

    describe('P0.1.8: Error Handling Improvements', () => {
      it('should provide specific error messages for different failure types', async () => {
        const errorTypes = [
          'no_apis_available',
          'unclear_request',
          'api_connection_failed',
          'workflow_too_complex',
          'invalid_parameters'
        ];

        for (const errorType of errorTypes) {
          const error = await service.generateSpecificErrorMessage(errorType, mockRequest);
          expect(error).toContain('Please');
          expect(error).toContain('Try');
        }
      });

      it('should implement retry logic for transient failures', async () => {
        const mockFailingOpenAI = jest.fn()
          .mockRejectedValueOnce(new Error('Rate limit exceeded'))
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValue({ choices: [{ finish_reason: 'function_call', message: { function_call: { name: 'test', arguments: '{}' } } }] });

        (service as any).openai.chat.completions.create = mockFailingOpenAI;

        const result = await service.generateMultiStepWorkflowWithRetry(mockRequest);

        expect(result.success).toBe(true);
        expect(mockFailingOpenAI).toHaveBeenCalledTimes(3);
      });

      it('should provide fallback workflows for common scenarios', async () => {
        const fallbackWorkflows = await service.generateFallbackWorkflows(mockRequest);

        expect(fallbackWorkflows).toHaveLength(3);
        expect(fallbackWorkflows[0].name).toContain('Simple');
        expect(fallbackWorkflows[1].name).toContain('Alternative');
        expect(fallbackWorkflows[2].name).toContain('Basic');
      });
    });
  });

  describe('Integration with Existing Workflow Engine', () => {
    it('should integrate with step runner engine', async () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test description',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'webhook',
            order: 1,
            dependencies: []
          },
          {
            id: 'step2',
            name: 'Step 2',
            type: 'api_call',
            order: 2,
            dependencies: ['step1']
          }
        ]
      };

      const executionPlan = await service.createExecutionPlan(workflow);

      expect(executionPlan.steps).toHaveLength(2);
      expect(executionPlan.dependencies).toBeDefined();
      expect(executionPlan.executionOrder).toEqual(['step1', 'step2']);
    });

    it('should handle workflow execution state management', async () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test description',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'webhook',
            order: 1,
            dependencies: []
          }
        ]
      };

      const stateManager = await service.createExecutionStateManager(workflow);

      expect(stateManager.getCurrentState()).toBe('PENDING');
      expect(stateManager.getStepStates()).toHaveLength(1);
    });
  });
}); 