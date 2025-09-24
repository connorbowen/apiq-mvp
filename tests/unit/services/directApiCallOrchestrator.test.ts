/**
 * DirectApiCallOrchestrator Unit Tests
 */

import { DirectApiCallOrchestrator } from '../../../src/lib/services/directApiCallOrchestrator';
import { EndpointSelectionService } from '../../../src/lib/services/endpointSelectionService';
import { NaturalLanguageParameterExtractor } from '../../../src/lib/services/naturalLanguageParameterExtractor';
import { ResponseFormattingService } from '../../../src/lib/services/responseFormattingService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock all services
jest.mock('../../../src/lib/services/endpointSelectionService');
jest.mock('../../../src/lib/services/naturalLanguageParameterExtractor');
jest.mock('../../../src/lib/services/responseFormattingService');
jest.mock('../../../src/services/openaiService');

const MockedEndpointSelectionService = EndpointSelectionService as jest.MockedClass<typeof EndpointSelectionService>;
const MockedNaturalLanguageParameterExtractor = NaturalLanguageParameterExtractor as jest.MockedClass<typeof NaturalLanguageParameterExtractor>;
const MockedResponseFormattingService = ResponseFormattingService as jest.MockedClass<typeof ResponseFormattingService>;
const MockedOpenAIService = OpenAIService as jest.Mocked<typeof OpenAIService>;

describe('DirectApiCallOrchestrator', () => {
  let orchestrator: DirectApiCallOrchestrator;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let mockEndpointSelectionService: jest.Mocked<EndpointSelectionService>;
  let mockParameterExtractionService: jest.Mocked<NaturalLanguageParameterExtractor>;
  let mockResponseFormattingService: jest.Mocked<ResponseFormattingService>;

  beforeEach(() => {
    mockOpenAIService = {} as any;
    mockEndpointSelectionService = {
      selectEndpoint: jest.fn()
    } as any;
    mockParameterExtractionService = {
      extractParameterValues: jest.fn()
    } as any;
    mockResponseFormattingService = {
      formatApiResponse: jest.fn()
    } as any;

    // Mock the factory methods instead of constructor
    MockedOpenAIService.createFromEnv = jest.fn().mockReturnValue(mockOpenAIService);
    MockedEndpointSelectionService.mockImplementation(() => mockEndpointSelectionService);
    MockedNaturalLanguageParameterExtractor.mockImplementation(() => mockParameterExtractionService);
    MockedResponseFormattingService.mockImplementation(() => mockResponseFormattingService);

    orchestrator = new DirectApiCallOrchestrator(mockOpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDirectApiCall', () => {
    const mockRequest = {
      message: 'Get all available pets',
      availableConnections: [
        {
          id: 'conn1',
          name: 'Petstore API',
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          endpoints: [
            {
              path: '/pet/findByStatus',
              method: 'GET',
              summary: 'Find pets by status',
              parameters: [{ name: 'status', required: true }]
            }
          ]
        }
      ],
      context: [],
      guidanceResponse: null
    };

    it('should successfully process a direct API call request', async () => {
      // Mock endpoint selection
      mockEndpointSelectionService.selectEndpoint.mockResolvedValue({
        connectionId: 'conn1',
        endpoint: '/pet/findByStatus',
        method: 'GET',
        reason: 'User wants to find pets by status',
        confidence: 0.9,
        connectionName: 'Petstore API',
        endpointSummary: 'Find pets by status'
      });

      // Mock parameter extraction
      mockParameterExtractionService.extractParameterValues.mockResolvedValue({
        parameters: { status: 'available' },
        confidence: 0.8,
        mappings: []
      });

      // Mock response formatting
      mockResponseFormattingService.formatApiResponse.mockResolvedValue({
        explanation: "I'll help you find all available pets from the Petstore API.",
        suggestedActions: [
          'You can now use this data in workflows',
          'Try filtering for specific pet statuses'
        ],
        success: true,
        confidence: 0.9
      });

      const result = await orchestrator.processDirectApiCall(mockRequest);

      expect(result.success).toBe(true);
      expect(result.intent).toBe('api_call');
      expect(result.apiCallResult).toEqual({
        method: 'GET',
        url: '/pet/findByStatus',
        parameters: { status: 'available' },
        requestBody: { status: 'available' },
        headers: undefined,
        connectionId: 'conn1'
      });
      expect(result.explanation).toContain("I'll help you find all available pets");
    });

    it('should handle endpoint selection failure', async () => {
      mockEndpointSelectionService.selectEndpoint.mockRejectedValue(new Error('No suitable endpoint found'));

      const result = await orchestrator.processDirectApiCall(mockRequest);

      expect(result.success).toBe(false);
      expect(result.intent).toBe('general_chat');
      expect(result.explanation).toContain('No suitable endpoint found');
    });

    it('should handle parameter extraction failure', async () => {
      // Mock successful endpoint selection
      mockEndpointSelectionService.selectEndpoint.mockResolvedValue({
        connectionId: 'conn1',
        endpoint: '/pet/findByStatus',
        method: 'GET',
        reason: 'User wants to find pets by status',
        confidence: 0.9,
        connectionName: 'Petstore API',
        endpointSummary: 'Find pets by status'
      });

      // Mock parameter extraction failure
      mockParameterExtractionService.extractParameterValues.mockRejectedValue(
        new Error('Parameter extraction failed')
      );

      const result = await orchestrator.processDirectApiCall(mockRequest);

      expect(result.success).toBe(false);
      expect(result.intent).toBe('general_chat');
      expect(result.explanation).toContain('Parameter extraction failed');
    });

    it('should handle response formatting failure', async () => {
      // Mock successful endpoint selection
      mockEndpointSelectionService.selectEndpoint.mockResolvedValue({
        connectionId: 'conn1',
        endpoint: '/pet/findByStatus',
        method: 'GET',
        reason: 'User wants to find pets by status',
        confidence: 0.9,
        connectionName: 'Petstore API',
        endpointSummary: 'Find pets by status'
      });

      // Mock successful parameter extraction
      mockParameterExtractionService.extractParameterValues.mockResolvedValue({
        parameters: { status: 'available' },
        confidence: 0.8,
        mappings: []
      });

      // Mock response formatting failure
      mockResponseFormattingService.formatApiResponse.mockRejectedValue(
        new Error('Response formatting failed')
      );

      const result = await orchestrator.processDirectApiCall(mockRequest);

      expect(result.success).toBe(false);
      expect(result.intent).toBe('general_chat');
      expect(result.explanation).toContain('I encountered an error while processing your request');
    });

    it('should handle missing connection gracefully', async () => {
      // Mock endpoint selection with non-existent connection
      mockEndpointSelectionService.selectEndpoint.mockResolvedValue({
        connectionId: 'nonexistent',
        endpoint: '/pet/findByStatus',
        method: 'GET',
        reason: 'User wants to find pets by status',
        confidence: 0.9,
        connectionName: 'Petstore API',
        endpointSummary: 'Find pets by status'
      });

      const result = await orchestrator.processDirectApiCall(mockRequest);

      expect(result.success).toBe(false);
      expect(result.intent).toBe('general_chat');
      expect(result.explanation).toContain('Connection not found');
    });

    it('should handle missing endpoint gracefully', async () => {
      // Mock endpoint selection with non-existent endpoint
      mockEndpointSelectionService.selectEndpoint.mockResolvedValue({
        connectionId: 'conn1',
        endpoint: '/nonexistent',
        method: 'GET',
        reason: 'User wants to find pets by status',
        confidence: 0.9,
        connectionName: 'Petstore API',
        endpointSummary: 'Find pets by status'
      });

      const result = await orchestrator.processDirectApiCall(mockRequest);

      expect(result.success).toBe(false);
      expect(result.intent).toBe('general_chat');
      expect(result.explanation).toContain('Endpoint not found');
    });

    it('should handle complex parameter extraction', async () => {
      const complexRequest = {
        ...mockRequest,
        message: 'Create a new pet named Fluffy with status available',
        availableConnections: [
          {
            id: 'conn1',
            name: 'Petstore API',
            baseUrl: 'https://petstore3.swagger.io/api/v3',
            endpoints: [
              {
                path: '/pet',
                method: 'POST',
                summary: 'Add a new pet',
                parameters: []
              }
            ]
          }
        ]
      };

      // Mock endpoint selection for POST request
      mockEndpointSelectionService.selectEndpoint.mockResolvedValue({
        connectionId: 'conn1',
        endpoint: '/pet',
        method: 'POST',
        reason: 'User wants to create a new pet',
        confidence: 0.9,
        connectionName: 'Petstore API',
        endpointSummary: 'Add a new pet'
      });

      // Mock parameter extraction with request body
      mockParameterExtractionService.extractParameterValues.mockResolvedValue({
        parameters: {
          name: 'Fluffy',
          status: 'available'
        },
        confidence: 0.8,
        mappings: []
      });

      // Mock response formatting
      mockResponseFormattingService.formatApiResponse.mockResolvedValue({
        explanation: "I'll help you create a new pet named Fluffy.",
        suggestedActions: [
          'You can now use this data in workflows',
          'Try creating more pets with different names'
        ],
        success: true,
        confidence: 0.9
      });

      const result = await orchestrator.processDirectApiCall(complexRequest);

      expect(result.success).toBe(true);
      expect(result.apiCallResult?.method).toBe('POST');
      expect(result.apiCallResult?.requestBody).toEqual({
        name: 'Fluffy',
        status: 'available'
      });
    });
  });
});
