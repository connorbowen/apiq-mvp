import { OpenApiService } from '../../../src/services/openApiService';

// Mock the cache
jest.mock('../../../src/utils/openApiCache', () => ({
  openApiCache: {
    get: jest.fn(),
    set: jest.fn(),
    getStats: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('OpenApiService', () => {
  let service: OpenApiService;
  const testUrl = 'https://api.example.com/openapi.json';
  const validSpec = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: { '/test': { get: {} } }
  };

  beforeEach(() => {
    service = new OpenApiService(5000); // 5 second timeout
    jest.clearAllMocks();
  });

  describe('fetchSpec', () => {
    it('should return cached spec when available', async () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');
      openApiCache.get.mockReturnValue(validSpec);

      const result = await service.fetchSpec(testUrl);

      expect(result.success).toBe(true);
      expect(result.spec).toEqual(validSpec);
      expect(result.cached).toBe(true);
      expect(openApiCache.get).toHaveBeenCalledWith(testUrl);
    });

    it('should fetch and cache new spec when not cached', async () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');
      openApiCache.get.mockReturnValue(null);

      // Mock axios response
      axios.get.mockResolvedValue({
        status: 200,
        data: validSpec,
        headers: { 'content-type': 'application/json' }
      });

      const result = await service.fetchSpec(testUrl);

      expect(result.success).toBe(true);
      expect(result.spec).toEqual(validSpec);
      expect(result.cached).toBe(false);
      expect(openApiCache.set).toHaveBeenCalledWith(testUrl, validSpec);
    });

    it('should handle HTTP errors', async () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');
      openApiCache.get.mockReturnValue(null);

      axios.get.mockResolvedValue({
        status: 404,
        statusText: 'Not Found'
      });

      const result = await service.fetchSpec(testUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });

    it('should handle network timeouts', async () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');
      openApiCache.get.mockReturnValue(null);

      const timeoutError = new Error('timeout of 5000ms exceeded') as any;
      timeoutError.code = 'ECONNABORTED';
      axios.get.mockRejectedValue(timeoutError);

      const result = await service.fetchSpec(testUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should handle invalid specs', async () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');
      openApiCache.get.mockReturnValue(null);

      const invalidSpec = { info: { title: 'Test' } }; // Missing paths

      axios.get.mockResolvedValue({
        status: 200,
        data: invalidSpec,
        headers: { 'content-type': 'application/json' }
      });

      const result = await service.fetchSpec(testUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid OpenAPI spec');
    });
  });

  describe('validateSpec', () => {
    it('should validate a correct OpenAPI spec', () => {
      const result = service.validateSpec(validSpec);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject null spec', () => {
      const result = service.validateSpec(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Spec is null or undefined');
    });

    it('should reject non-object spec', () => {
      const result = service.validateSpec('not an object');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Spec must be an object');
    });

    it('should reject spec without version', () => {
      const spec = { info: { title: 'Test' }, paths: {} };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing OpenAPI version');
    });

    it('should reject spec without info', () => {
      const spec = { openapi: '3.0.0', paths: {} };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing info object');
    });

    it('should reject spec without title', () => {
      const spec = { openapi: '3.0.0', info: {}, paths: {} };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing info.title');
    });

    it('should reject spec without paths', () => {
      const spec = { openapi: '3.0.0', info: { title: 'Test' } };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing paths object');
    });

    it('should reject spec with invalid paths', () => {
      const spec = { 
        openapi: '3.0.0', 
        info: { title: 'Test' }, 
        paths: 'not an object' 
      };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Paths must be an object');
    });

    it('should warn about empty paths', () => {
      const spec = { 
        openapi: '3.0.0', 
        info: { title: 'Test' }, 
        paths: {} 
      };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No API paths defined');
    });

    it('should warn about missing components', () => {
      const spec = { 
        openapi: '3.0.0', 
        info: { title: 'Test' }, 
        paths: { '/test': { get: {} } } 
      };
      const result = service.validateSpec(spec);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No components object defined');
    });
  });

  describe('cache management', () => {
    it('should get cache stats', () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');
      const mockStats = { size: 5, totalSizeBytes: 1024 };
      openApiCache.getStats.mockReturnValue(mockStats);

      const stats = service.getCacheStats();
      expect(stats).toEqual(mockStats);
      expect(openApiCache.getStats).toHaveBeenCalled();
    });

    it('should clear cache', () => {
      const { openApiCache } = require('../../../src/utils/openApiCache');

      service.clearCache();
      expect(openApiCache.clear).toHaveBeenCalled();
    });
  });
}); 