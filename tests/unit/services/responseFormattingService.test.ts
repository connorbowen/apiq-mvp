/**
 * ResponseFormattingService Unit Tests
 */

import { ResponseFormattingService } from '../../../src/lib/services/responseFormattingService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAI service
jest.mock('../../../src/services/openaiService');
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('ResponseFormattingService', () => {
  let service: ResponseFormattingService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      client: {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      }
    } as any;

    MockedOpenAIService.mockImplementation(() => mockOpenAIService);
    service = new ResponseFormattingService(mockOpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatApiResponse', () => {
    const mockApiResult = {
      method: 'GET',
      url: '/pets',
      statusCode: 200,
      responseData: [
        { id: 1, name: 'Fluffy', status: 'available' },
        { id: 2, name: 'Buddy', status: 'available' }
      ],
      responseHeaders: { 'content-type': 'application/json' },
      executionTime: 150
    };

    it('should format successful API responses using AI', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              explanation: "I found 2 pets for you! Here's what I retrieved from the Petstore API.",
              suggestedActions: [
                "You can now use this data in workflows",
                "Try filtering for specific pet statuses",
                "Create automated workflows with this data"
              ],
              success: true,
              confidence: 0.9
            })
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockAIResponse as any);

      const result = await service.formatApiResponse({
        apiResult: mockApiResult,
        userMessage: 'Get all available pets',
        context: [],
        connectionName: 'Petstore API',
        endpointSummary: 'Get all pets'
      });

      expect(result).toEqual({
        explanation: "Successfully retrieved data from Petstore API. Found 2 items.",
        suggestedActions: [
          "You can now use this data in workflows",
          "Try filtering or searching for specific items",
          "Create automated workflows with this data"
        ],
        success: true,
        confidence: 0.7
      });
    });

    it('should format error responses appropriately', async () => {
      const errorApiResult = {
        ...mockApiResult,
        statusCode: 401,
        error: 'Unauthorized'
      };

      const result = await service.formatApiResponse({
        apiResult: errorApiResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain('authentication failed');
      expect(result.suggestedActions).toContain('Check your API credentials');
    });

    it('should handle 404 errors with appropriate messaging', async () => {
      const notFoundResult = {
        ...mockApiResult,
        statusCode: 404,
        error: 'Not Found'
      };

      const result = await service.formatApiResponse({
        apiResult: notFoundResult,
        userMessage: 'Get pet by ID 999',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain("wasn't found");
      expect(result.suggestedActions).toContain('Check if the endpoint URL is correct');
    });

    it('should handle server errors (5xx) appropriately', async () => {
      const serverErrorResult = {
        ...mockApiResult,
        statusCode: 500,
        error: 'Internal Server Error'
      };

      const result = await service.formatApiResponse({
        apiResult: serverErrorResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain('server is experiencing issues');
      expect(result.suggestedActions).toContain('Try again in a few minutes');
    });

    it('should fallback to rules-based formatting when AI fails', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(new Error('AI service error'));

      const result = await service.formatApiResponse({
        apiResult: mockApiResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Successfully retrieved data');
      expect(result.suggestedActions).toContain('You can now use this data in workflows');
    });

    it('should handle empty response data gracefully', async () => {
      const emptyResult = {
        ...mockApiResult,
        responseData: []
      };

      const result = await service.formatApiResponse({
        apiResult: emptyResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Found 0 items');
    });

    it('should handle single item responses', async () => {
      const singleItemResult = {
        ...mockApiResult,
        responseData: { id: 1, name: 'Fluffy', status: 'available' }
      };

      const result = await service.formatApiResponse({
        apiResult: singleItemResult,
        userMessage: 'Get pet by ID 1',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Found 1 item');
    });

    it('should handle AI response parsing errors gracefully', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockAIResponse as any);

      const result = await service.formatApiResponse({
        apiResult: mockApiResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      // Should fallback to rules-based formatting
      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Successfully retrieved data');
    });
  });

  describe('formatErrorResponse', () => {
    it('should format 401 authentication errors', () => {
      const errorResult = {
        method: 'GET',
        url: '/pets',
        statusCode: 401,
        responseData: null,
        executionTime: 100,
        error: 'Unauthorized'
      };

      const result = (service as any).formatErrorResponse({
        apiResult: errorResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain('authentication failed');
      expect(result.suggestedActions).toContain('Check your API credentials');
    });

    it('should format 403 permission errors', () => {
      const errorResult = {
        method: 'GET',
        url: '/pets',
        statusCode: 403,
        responseData: null,
        executionTime: 100,
        error: 'Forbidden'
      };

      const result = (service as any).formatErrorResponse({
        apiResult: errorResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain("don't have permission");
      expect(result.suggestedActions).toContain('Check your API permissions');
    });

    it('should format 404 not found errors', () => {
      const errorResult = {
        method: 'GET',
        url: '/pets/999',
        statusCode: 404,
        responseData: null,
        executionTime: 100,
        error: 'Not Found'
      };

      const result = (service as any).formatErrorResponse({
        apiResult: errorResult,
        userMessage: 'Get pet by ID 999',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain("wasn't found");
      expect(result.suggestedActions).toContain('Check if the endpoint URL is correct');
    });

    it('should format 500 server errors', () => {
      const errorResult = {
        method: 'GET',
        url: '/pets',
        statusCode: 500,
        responseData: null,
        executionTime: 100,
        error: 'Internal Server Error'
      };

      const result = (service as any).formatErrorResponse({
        apiResult: errorResult,
        userMessage: 'Get all pets',
        context: [],
        connectionName: 'Petstore API'
      });

      expect(result.success).toBe(false);
      expect(result.explanation).toContain('server is experiencing issues');
      expect(result.suggestedActions).toContain('Try again in a few minutes');
    });
  });
});
