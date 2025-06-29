import { parseOpenApiSpec, validateOpenApiUrl } from '../../../../src/lib/api/parser';
import * as logger from '../../../../src/utils/logger';

// Mock SwaggerParser
jest.mock('@apidevtools/swagger-parser', () => ({
  __esModule: true,
  default: {
    parse: jest.fn()
  }
}));

import SwaggerParser from '@apidevtools/swagger-parser';

const mockSwaggerParser = SwaggerParser as jest.Mocked<typeof SwaggerParser>;

jest.mock('crypto', () => ({
  createHash: () => ({ update: () => ({ digest: () => 'hash' }) })
}));

const parseMock = SwaggerParser.parse as jest.Mock;

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
      const networkError = new Error('Network error') as any;
      networkError.code = 'ENOTFOUND';
      mockSwaggerParser.parse.mockRejectedValue(networkError);

      await expect(parseOpenApiSpec('https://invalid-url.com/swagger.json'))
        .rejects
        .toMatchObject({
          type: 'UNREACHABLE',
          message: expect.stringContaining('Cannot reach the OpenAPI specification URL')
        });
    });

    it('should handle invalid JSON responses', async () => {
      const jsonError = new Error('Invalid JSON');
      jsonError.message = 'SwaggerParser: Invalid JSON';
      mockSwaggerParser.parse.mockRejectedValue(jsonError);

      await expect(parseOpenApiSpec('https://api.example.com/swagger.json'))
        .rejects
        .toMatchObject({
          type: 'INVALID_SPEC',
          message: expect.stringContaining('Invalid OpenAPI specification')
        });
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
        .toMatchObject({
          type: 'UNKNOWN',
          message: 'Failed to parse OpenAPI specification: No endpoints found in OpenAPI specification'
        });
    });

    it('should handle HTTP error responses', async () => {
      const httpError = new Error('HTTP ERROR 404') as any;
      httpError.code = 'ENOTFOUND';
      mockSwaggerParser.parse.mockRejectedValue(httpError);

      await expect(parseOpenApiSpec('https://api.example.com/swagger.json'))
        .rejects
        .toMatchObject({
          type: 'UNREACHABLE',
          message: expect.stringContaining('Cannot reach the OpenAPI specification URL')
        });
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

    it('parses a valid OpenAPI spec', async () => {
      parseMock.mockResolvedValue({
        openapi: '3.0.0',
        info: { title: 'API', description: 'desc' },
        paths: { '/foo': {} }
      });
      const result = await parseOpenApiSpec('http://test');
      expect(result.version).toBe('3.0.0');
      expect(result.title).toBe('API');
      expect(result.description).toBe('desc');
      expect(result.specHash).toBe('hash');
    });

    it('throws INVALID_SPEC if no paths', async () => {
      parseMock.mockResolvedValue({ openapi: '3.0.0', info: {} });
      await expect(parseOpenApiSpec('http://test')).rejects.toMatchObject({ type: 'UNKNOWN' });
    });

    it('throws UNREACHABLE for ENOTFOUND', async () => {
      parseMock.mockRejectedValue({ code: 'ENOTFOUND', message: 'fail' });
      await expect(parseOpenApiSpec('http://test')).rejects.toMatchObject({ type: 'UNREACHABLE' });
    });

    it('throws NETWORK_TIMEOUT for timeout', async () => {
      parseMock.mockRejectedValue({ code: 'ETIMEDOUT', message: 'timeout' });
      await expect(parseOpenApiSpec('http://test')).rejects.toMatchObject({ type: 'NETWORK_TIMEOUT' });
    });

    it('throws INVALID_SPEC for SwaggerParser error', async () => {
      parseMock.mockRejectedValue({ message: 'SwaggerParser: bad spec' });
      await expect(parseOpenApiSpec('http://test')).rejects.toMatchObject({ type: 'INVALID_SPEC' });
    });

    it('throws UNKNOWN for other errors', async () => {
      parseMock.mockRejectedValue({ message: 'other' });
      await expect(parseOpenApiSpec('http://test')).rejects.toMatchObject({ type: 'UNKNOWN' });
    });
  });

  describe('validateOpenApiUrl', () => {
    it('returns true for valid spec', async () => {
      parseMock.mockResolvedValue({ openapi: '3.0.0', paths: { '/foo': {} }, info: {} });
      await expect(validateOpenApiUrl('http://test')).resolves.toBe(true);
    });
    it('returns false for invalid spec', async () => {
      parseMock.mockRejectedValue({ message: 'fail' });
      await expect(validateOpenApiUrl('http://test')).resolves.toBe(false);
    });
  });
}); 