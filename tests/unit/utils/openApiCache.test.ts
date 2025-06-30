import { OpenApiCache, OpenApiCacheConfig } from '../../../src/utils/openApiCache';

describe('OpenApiCache', () => {
  let cache: OpenApiCache;
  const testUrl = 'https://api.example.com/openapi.json';
  const testSpec = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: { '/test': { get: {} } }
  };

  beforeEach(() => {
    cache = new OpenApiCache({
      ttl: 1, // 1 second for testing
      maxSize: 3,
      maxSizeBytes: 1024,
      compression: false,
      slowSpecTimeout: 5000,
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const defaultCache = new OpenApiCache();
      expect(defaultCache.getStats().ttl).toBe(3600);
      expect(defaultCache.getStats().maxSize).toBe(100);
    });

    it('should use provided config', () => {
      const config: Partial<OpenApiCacheConfig> = {
        ttl: 1800,
        maxSize: 50,
        maxSizeBytes: 1024 * 1024,
        compression: true,
        slowSpecTimeout: 15000,
      };
      const customCache = new OpenApiCache(config);
      const stats = customCache.getStats();
      expect(stats.ttl).toBe(1800);
      expect(stats.maxSize).toBe(50);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve a spec', () => {
      cache.set(testUrl, testSpec);
      const retrieved = cache.get(testUrl);
      expect(retrieved).toEqual(testSpec);
    });

    it('should return null for non-existent URL', () => {
      const retrieved = cache.get('https://nonexistent.com/api.json');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired spec', async () => {
      cache.set(testUrl, testSpec);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const retrieved = cache.get(testUrl);
      expect(retrieved).toBeNull();
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest when max size reached', () => {
      cache.set('url1', { spec: '1' });
      cache.set('url2', { spec: '2' });
      cache.set('url3', { spec: '3' });
      
      // This should evict the oldest (url1)
      cache.set('url4', { spec: '4' });
      
      expect(cache.get('url1')).toBeNull();
      expect(cache.get('url2')).not.toBeNull();
      expect(cache.get('url3')).not.toBeNull();
      expect(cache.get('url4')).not.toBeNull();
    });

    it('should evict by size when max bytes reached', () => {
      const largeSpec = { data: 'x'.repeat(600) }; // ~600 bytes
      
      cache.set('url1', largeSpec);
      cache.set('url2', largeSpec);
      
      // This should evict some items to make room
      cache.set('url3', largeSpec);
      
      const stats = cache.getStats();
      expect(stats.totalSizeBytes).toBeLessThanOrEqual(1024);
    });
  });

  describe('compression', () => {
    it('should compress large specs when enabled', () => {
      const cacheWithCompression = new OpenApiCache({ compression: true });
      const largeSpec = { data: 'x'.repeat(2000) }; // > 1KB
      
      cacheWithCompression.set(testUrl, largeSpec);
      const stats = cacheWithCompression.getStats();
      const entry = stats.entries.find(e => e.url === testUrl);
      
      expect(entry?.compressed).toBe(true);
    });

    it('should not compress small specs', () => {
      const cacheWithCompression = new OpenApiCache({ compression: true });
      
      cacheWithCompression.set(testUrl, testSpec);
      const stats = cacheWithCompression.getStats();
      const entry = stats.entries.find(e => e.url === testUrl);
      
      expect(entry?.compressed).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('url1', testSpec);
      cache.set('url2', testSpec);
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.ttl).toBe(1);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0].url).toBe('url1');
      expect(stats.entries[1].url).toBe('url2');
    });
  });

  describe('clear', () => {
    it('should clear all cached items', () => {
      cache.set('url1', testSpec);
      cache.set('url2', testSpec);
      
      expect(cache.getStats().size).toBe(2);
      
      cache.clear();
      
      expect(cache.getStats().size).toBe(0);
      expect(cache.get('url1')).toBeNull();
      expect(cache.get('url2')).toBeNull();
    });
  });
}); 