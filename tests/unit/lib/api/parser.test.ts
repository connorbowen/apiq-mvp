import { parseOpenApiSpec } from '../../../../src/lib/api/parser';

// Mock SwaggerParser
jest.mock('@apidevtools/swagger-parser', () => ({
  __esModule: true,
  default: {
    parse: jest.fn()
  }
}));

import SwaggerParser from '@apidevtools/swagger-parser';

const mockSwaggerParser = SwaggerParser as jest.Mocked<typeof SwaggerParser>;

describe('OpenAPI Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseOpenApiSpec', () => {
    it('should successfully parse a valid OpenAPI spec', async () => {
      const mockSpec = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/test': {
            get: {
              summary: 'Test endpoint',
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      mockSwaggerParser.parse.mockResolvedValue(mockSpec);

      const result = await parseOpenApiSpec('https://api.example.com/swagger.json');

      expect(result).toBeDefined();
      expect(result.title).toBe('Test API');
      expect(result.version).toBe('2.0');
      expect(Object.keys(result.spec.paths)).toHaveLength(1);
      expect(result.specHash).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'ResolverError';
      mockSwaggerParser.parse.mockRejectedValue(networkError);

      await expect(parseOpenApiSpec('https://invalid-url.com/swagger.json'))
        .rejects
        .toThrow('Failed to parse OpenAPI specification: Network error');
    });

    it('should handle invalid JSON responses', async () => {
      const jsonError = new Error('Invalid JSON');
      jsonError.name = 'SyntaxError';
      mockSwaggerParser.parse.mockRejectedValue(jsonError);

      await expect(parseOpenApiSpec('https://api.example.com/swagger.json'))
        .rejects
        .toThrow('Failed to parse OpenAPI specification: Invalid JSON');
    });

    it('should handle invalid OpenAPI spec structure', async () => {
      const invalidSpec = {
        // Missing required fields
        info: {
          title: 'Test API'
        }
      } as any;

      mockSwaggerParser.parse.mockResolvedValue(invalidSpec);

      await expect(parseOpenApiSpec('https://api.example.com/swagger.json'))
        .rejects
        .toThrow('No endpoints found in OpenAPI specification');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = new Error('HTTP ERROR 404');
      httpError.name = 'ResolverError';
      mockSwaggerParser.parse.mockRejectedValue(httpError);

      await expect(parseOpenApiSpec('https://api.example.com/swagger.json'))
        .rejects
        .toThrow('Failed to parse OpenAPI specification: HTTP ERROR 404');
    });

    it('should generate consistent spec hashes', async () => {
      const mockSpec = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/test': {
            get: {
              summary: 'Test endpoint'
            }
          }
        }
      } as any;

      mockSwaggerParser.parse.mockResolvedValue(mockSpec);

      const result1 = await parseOpenApiSpec('https://api.example.com/swagger.json');
      const result2 = await parseOpenApiSpec('https://api.example.com/swagger.json');

      expect(result1.specHash).toBe(result2.specHash);
    });

    it('should handle large OpenAPI specs', async () => {
      const largeSpec = {
        swagger: '2.0',
        info: {
          title: 'Large API',
          version: '1.0.0'
        },
        paths: {}
      } as any;

      // Create many endpoints
      for (let i = 0; i < 100; i++) {
        largeSpec.paths[`/endpoint${i}`] = {
          get: {
            summary: `Endpoint ${i}`,
            responses: { '200': { description: 'Success' } }
          }
        };
      }

      mockSwaggerParser.parse.mockResolvedValue(largeSpec);

      const result = await parseOpenApiSpec('https://api.example.com/swagger.json');

      expect(Object.keys(result.spec.paths)).toHaveLength(100);
      expect(result.title).toBe('Large API');
    });
  });
}); 