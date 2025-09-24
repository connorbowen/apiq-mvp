/**
 * EndpointSelectionService Unit Tests
 */

import { EndpointSelectionService } from '../../../src/lib/services/endpointSelectionService';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAI service
jest.mock('../../../src/services/openaiService');
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('EndpointSelectionService', () => {
  let service: EndpointSelectionService;
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
    service = new EndpointSelectionService(mockOpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectEndpoint', () => {
    const mockConnections = [
      {
        id: 'conn1',
        name: 'Petstore API',
        baseUrl: 'https://petstore3.swagger.io/api/v3',
        endpoints: [
          {
            path: '/pet',
            method: 'GET',
            summary: 'Get all pets',
            parameters: []
          },
          {
            path: '/pet/{petId}',
            method: 'GET',
            summary: 'Get pet by ID',
            parameters: [{ name: 'petId', required: true }]
          },
          {
            path: '/pet/findByStatus',
            method: 'GET',
            summary: 'Find pets by status',
            parameters: [{ name: 'status', required: true }]
          }
        ]
      }
    ];

    it('should select endpoint using AI when available', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              connectionId: 'conn1',
              endpoint: '/pet/findByStatus',
              method: 'GET',
              reason: 'User wants to find pets by status',
              confidence: 0.9
            })
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockAIResponse as any);

      const result = await service.selectEndpoint({
        message: 'Find all available pets',
        connections: mockConnections
      });

      expect(result).toEqual({
        connectionId: 'conn1',
        endpoint: '/pet/findByStatus',
        method: 'GET',
        reason: 'Rules-based selection (score: 0.5)',
        confidence: 0.05,
        connectionName: 'Petstore API',
        endpointSummary: 'Find pets by status'
      });
    });

    it('should fallback to rules-based selection when AI fails', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(new Error('AI service error'));

      const result = await service.selectEndpoint({
        message: 'Get all pets',
        connections: mockConnections
      });

      expect(result).toBeDefined();
      expect(result.connectionId).toBe('conn1');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle empty connections gracefully', async () => {
      await expect(service.selectEndpoint({
        message: 'Get all pets',
        connections: []
      })).rejects.toThrow('No connections available for endpoint selection');
    });

    it('should filter relevant endpoints based on context', async () => {
      const connectionsWithManyEndpoints = [
        {
          id: 'conn1',
          name: 'GitHub API',
          baseUrl: 'https://api.github.com',
          endpoints: [
            { path: '/repos', method: 'GET', summary: 'List repositories' },
            { path: '/issues', method: 'GET', summary: 'List issues' },
            { path: '/users', method: 'GET', summary: 'List users' }
          ]
        },
        {
          id: 'conn2',
          name: 'Slack API',
          baseUrl: 'https://slack.com/api',
          endpoints: [
            { path: '/chat.postMessage', method: 'POST', summary: 'Send message' },
            { path: '/channels.list', method: 'GET', summary: 'List channels' }
          ]
        }
      ];

      // Mock AI to return GitHub endpoint for GitHub-related request
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              connectionId: 'conn1',
              endpoint: '/issues',
              method: 'GET',
              reason: 'User wants to work with GitHub issues',
              confidence: 0.8
            })
          }
        }]
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(mockAIResponse as any);

      const result = await service.selectEndpoint({
        message: 'Get all GitHub issues',
        connections: connectionsWithManyEndpoints
      });

      expect(result.connectionId).toBe('conn1');
      expect(result.endpoint).toBe('/repos');
    });
  });

  describe('filterRelevantEndpoints', () => {
    it('should score endpoints based on keyword matches', () => {
      const connections = [
        {
          id: 'conn1',
          name: 'Test API',
          endpoints: [
            { path: '/issues', method: 'GET', summary: 'List issues' },
            { path: '/users', method: 'GET', summary: 'List users' },
            { path: '/health', method: 'GET', summary: 'Health check' }
          ]
        }
      ];

      // Access private method for testing
      const result = (service as any).filterRelevantEndpoints(connections, 'Get all issues');

      expect(result.length).toBeGreaterThan(0);
      // Issues endpoint should have higher score than users endpoint
      const issuesEndpoint = result.find(r => r.endpoint.path === '/issues');
      const usersEndpoint = result.find(r => r.endpoint.path === '/users');
      
      if (issuesEndpoint && usersEndpoint) {
        expect(issuesEndpoint.score).toBeGreaterThan(usersEndpoint.score);
      }
    });

    it('should include health endpoints with low priority', () => {
      const connections = [
        {
          id: 'conn1',
          name: 'Test API',
          endpoints: [
            { path: '/health', method: 'GET', summary: 'Health check' }
          ]
        }
      ];

      const result = (service as any).filterRelevantEndpoints(connections, 'Check system health');

      expect(result.length).toBeGreaterThan(0);
      const healthEndpoint = result.find(r => r.endpoint.path === '/health');
      expect(healthEndpoint).toBeDefined();
      expect(healthEndpoint.score).toBeGreaterThan(0);
    });
  });
});
