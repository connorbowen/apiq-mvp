import 'openai/shims/node';

// Mock the OpenAI wrapper
jest.mock('../../../src/lib/openaiWrapper', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { WorkflowGenerationRequest, ApiConnection, WorkflowStep } from '../../../src/types';
import { Role } from '../../../src/generated/prisma';
import axios from 'axios';
import getOpenAIClient from '../../../src/lib/openaiWrapper';

// Mock axios
jest.mock('axios', () => jest.fn());

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn()
}));

describe('OpenAIService', () => {
  let openaiService: any;
  let mockCreate: jest.Mock;

  const mockApiConnection: ApiConnection = {
    id: 'test-connection-1',
    name: 'Test API',
    description: 'A test API connection',
    baseUrl: 'https://api.test.com',
    authType: 'NONE',
    status: 'ACTIVE',
    ingestionStatus: 'SUCCEEDED',
    endpointCount: 5,
    authConfig: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockWorkflowStep: WorkflowStep = {
    id: 'test-step-1',
    workflowId: 'test-workflow-1',
    stepOrder: 1,
    name: 'Test Step',
    description: 'A test workflow step',
    action: 'GET',
    apiConnectionId: 'test-connection-1',
    parameters: { path: '/test' },
    conditions: {},
    retryConfig: {},
    timeout: 30000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Set up environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';

    // Clear mocks and set up mockCreate
    jest.clearAllMocks();
    mockCreate = jest.fn();
    (getOpenAIClient as jest.Mock).mockReturnValue({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    });

    // Clear require cache for OpenAIService
    delete require.cache[require.resolve('../../../src/services/openaiService')];

    // Import OpenAIService
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OpenAIService } = require('../../../src/services/openaiService');
    openaiService = new OpenAIService();

    ((axios as unknown) as jest.Mock).mockReset();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  describe('Constructor', () => {
    it('should initialize with valid API key', () => {
      const { OpenAIService } = require('../../../src/services/openaiService');
      expect(openaiService).toBeInstanceOf(OpenAIService);
    });

    it('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      const { OpenAIService } = require('../../../src/services/openaiService');
      expect(() => new OpenAIService()).toThrow('OPENAI_API_KEY environment variable is required');
    });

    it('should use default model when not specified', () => {
      delete process.env.OPENAI_MODEL;
      const { OpenAIService } = require('../../../src/services/openaiService');
      const service = new OpenAIService();
      expect(service).toBeInstanceOf(OpenAIService);
    });
  });

  describe('generateWorkflow', () => {
    const mockRequest: WorkflowGenerationRequest = {
      description: 'Create a workflow to fetch user data and send notifications',
      apiConnections: [mockApiConnection],
      parameters: { userId: '123' }
    };

    it('should generate workflow successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_workflow',
              arguments: JSON.stringify({
                workflow: {
                  name: 'User Data Workflow',
                  description: 'Fetch user data and send notifications'
                },
                steps: [
                  {
                    stepOrder: 1,
                    name: 'Fetch User Data',
                    description: 'Get user information',
                    action: 'GET',
                    apiConnectionId: 'test-connection-1',
                    parameters: { path: '/users/{userId}' }
                  }
                ],
                explanation: 'This workflow fetches user data and processes it'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.generateWorkflow(mockRequest);

      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('explanation');
      expect(result.workflow.name).toBe('User Data Workflow');
      expect(result.steps).toHaveLength(1);
    });

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(openaiService.generateWorkflow(mockRequest))
        .rejects.toThrow('Workflow generation failed: API Error');
    });

    it('should handle invalid function call response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'invalid_function',
              arguments: '{}'
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(openaiService.generateWorkflow(mockRequest))
        .rejects.toThrow('Failed to generate workflow: Invalid response from OpenAI');
    });

    it('should handle missing function call', async () => {
      const mockResponse = {
        choices: [{
          message: {}
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(openaiService.generateWorkflow(mockRequest))
        .rejects.toThrow('Failed to generate workflow: Invalid response from OpenAI');
    });

    it('should handle invalid JSON in function arguments', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_workflow',
              arguments: 'invalid json'
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(openaiService.generateWorkflow(mockRequest))
        .rejects.toThrow('Workflow generation failed');
    });
  });

  describe('executeWorkflowStep', () => {
    it('should execute API call successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'execute_api_call',
              arguments: JSON.stringify({
                method: 'GET',
                url: '/test',
                headers: {},
                body: {},
                query: {}
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);
      ((axios as unknown) as jest.Mock).mockResolvedValue({
        data: { data: 'test response' }
      });

      const result = await openaiService.executeWorkflowStep(
        mockWorkflowStep,
        mockApiConnection,
        {},
        {}
      );

      expect(result).toHaveProperty('result');
      expect(result.result).toEqual({ data: 'test response' });
    });

    it('should handle error function call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'handle_error',
              arguments: JSON.stringify({
                error: 'API call failed',
                shouldRetry: false,
                nextStep: 'error_handler'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.executeWorkflowStep(
        mockWorkflowStep,
        mockApiConnection,
        {},
        {}
      );

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('nextStep');
      expect(result.error).toBe('API call failed');
      expect(result.nextStep).toBe('error_handler');
    });

    it('should handle unknown function call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'unknown_function',
              arguments: '{}'
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.executeWorkflowStep(
        mockWorkflowStep,
        mockApiConnection,
        {},
        {}
      );

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unknown function call returned from OpenAI');
    });

    it('should handle missing function call', async () => {
      const mockResponse = {
        choices: [{
          message: {}
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.executeWorkflowStep(
        mockWorkflowStep,
        mockApiConnection,
        {},
        {}
      );

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('No function call returned from OpenAI');
    });

    it('should handle OpenAI API errors during execution', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await openaiService.executeWorkflowStep(
        mockWorkflowStep,
        mockApiConnection,
        {},
        {}
      );

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('API Error');
    });
  });

  describe('validateConfig', () => {
    it('should return true when API key is present', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const { OpenAIService } = require('../../../src/services/openaiService');
      const service = new OpenAIService();
      expect(service.validateConfig()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      // Create a service instance first, then delete the key for validation
      const { OpenAIService } = require('../../../src/services/openaiService');
      const service = new OpenAIService();
      delete process.env.OPENAI_API_KEY;
      expect(service.validateConfig()).toBe(false);
    });
  });
}); 