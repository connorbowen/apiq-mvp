import logger from './logger';

export interface OpenApiCacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of cached items
  maxSizeBytes: number; // Maximum total size in bytes
  compression: boolean; // Whether to compress cached data
  slowSpecTimeout: number; // Timeout for slow spec fetches in ms
}

export interface CachedSpec {
  spec: any;
  timestamp: number;
  size: number;
  compressed?: boolean;
}

export class OpenApiCache {
  private cache = new Map<string, CachedSpec>();
  private config: OpenApiCacheConfig;

  constructor(config: Partial<OpenApiCacheConfig> = {}) {
    this.config = {
      ttl: 3600, // 1 hour default
      maxSize: 100, // 100 specs max
      maxSizeBytes: 50 * 1024 * 1024, // 50MB default
      compression: true, // Enable compression by default
      slowSpecTimeout: 30000, // 30 seconds default
      ...config,
    };
  }

  /**
   * Get a cached OpenAPI spec
   */
  get(url: string): any | null {
    const cached = this.cache.get(url);
    
    if (!cached) {
      logger.info('OpenAPI cache miss', { url });
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;
    const ttlMs = this.config.ttl * 1000;

    if (age > ttlMs) {
      logger.info('OpenAPI cache expired', { url, age, ttl: this.config.ttl });
      this.cache.delete(url);
      return null;
    }

    logger.info('OpenAPI cache hit', { url, age, ttl: this.config.ttl });
    return cached.spec;
  }

  /**
   * Set a cached OpenAPI spec
   */
  set(url: string, spec: any): boolean {
    const specString = JSON.stringify(spec);
    const size = Buffer.byteLength(specString, 'utf8');

    // Check if adding this would exceed max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    // Check if adding this would exceed max bytes
    const currentTotalSize = this.getTotalSize();
    if (currentTotalSize + size > this.config.maxSizeBytes) {
      this.evictBySize(size);
    }

    const cachedSpec: CachedSpec = {
      spec,
      timestamp: Date.now(),
      size,
    };

    // Apply compression if enabled
    if (this.config.compression && size > 1024) { // Only compress if > 1KB
      try {
        const compressed = this.compress(specString);
        if (compressed.length < size) {
          cachedSpec.spec = compressed;
          cachedSpec.size = compressed.length;
          cachedSpec.compressed = true;
        }
      } catch (error) {
        logger.warn('Failed to compress OpenAPI spec', { url, error: (error as Error).message });
      }
    }

    this.cache.set(url, cachedSpec);
    logger.info('OpenAPI spec cached', { 
      url, 
      size: cachedSpec.size, 
      compressed: cachedSpec.compressed,
      cacheSize: this.cache.size 
    });

    return true;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('OpenAPI cache cleared', { previousSize: size });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalSize = this.getTotalSize();
    const entries = Array.from(this.cache.entries()).map(([url, cached]) => ({
      url,
      age: Date.now() - cached.timestamp,
      size: cached.size,
      compressed: cached.compressed,
    }));

    return {
      size: this.cache.size,
      totalSizeBytes: totalSize,
      maxSize: this.config.maxSize,
      maxSizeBytes: this.config.maxSizeBytes,
      ttl: this.config.ttl,
      entries,
    };
  }

  /**
   * Get the total size of all cached items in bytes
   */
  private getTotalSize(): number {
    return Array.from(this.cache.values()).reduce((total, cached) => total + cached.size, 0);
  }

  /**
   * Evict the oldest cached item
   */
  private evictOldest(): void {
    let oldestUrl: string | null = null;
    let oldestTime = Date.now();

    for (const [url, cached] of Array.from(this.cache.entries())) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.cache.delete(oldestUrl);
      logger.info('OpenAPI cache evicted oldest', { url: oldestUrl });
    }
  }

  /**
   * Evict items to make room for new item of given size
   */
  private evictBySize(requiredSize: number): void {
    const currentTotal = this.getTotalSize();
    const targetSize = this.config.maxSizeBytes - requiredSize;

    if (currentTotal <= targetSize) return;

    // Sort by timestamp (oldest first) and evict until we have enough space
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    let remainingSize = currentTotal;
    for (const [url, cached] of entries) {
      if (remainingSize <= targetSize) break;
      
      this.cache.delete(url);
      remainingSize -= cached.size;
      logger.info('OpenAPI cache evicted for size', { url, size: cached.size });
    }
  }

  /**
   * Simple compression using gzip
   */
  private compress(data: string): Buffer {
    const zlib = require('zlib');
    return zlib.gzipSync(data);
  }

  /**
   * Decompress gzipped data
   */
  private decompress(data: Buffer): string {
    const zlib = require('zlib');
    return zlib.gunzipSync(data).toString('utf8');
  }
}

// Export a default instance with environment-based config
export const openApiCache = new OpenApiCache({
  ttl: parseInt(process.env.OPENAPI_CACHE_TTL || '3600'),
  maxSize: parseInt(process.env.OPENAPI_CACHE_MAX_SIZE || '100'),
  maxSizeBytes: parseInt(process.env.OPENAPI_CACHE_MAX_SIZE_BYTES || '52428800'), // 50MB
  compression: process.env.OPENAPI_CACHE_COMPRESSION !== 'false',
  slowSpecTimeout: parseInt(process.env.OPENAPI_SLOW_SPEC_TIMEOUT || '30000'),
}); 