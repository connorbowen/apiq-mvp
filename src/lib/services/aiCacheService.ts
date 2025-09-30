/**
 * AI Cache Service - Caches AI responses to improve performance
 * Uses in-memory cache with TTL for development, can be upgraded to Redis for production
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class AICacheService {
  private static instance: AICacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 1000; // Maximum cache entries

  private constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  /**
   * Generate cache key for workflow generation
   */
  private generateWorkflowCacheKey(
    userDescription: string,
    connections: Array<{ id: string; name: string; endpoints: any[] }>,
    context?: any[]
  ): string {
    const connectionHash = connections
      .map(conn => `${conn.id}-${conn.endpoints.length}`)
      .sort()
      .join('|');
    
    // Include conversation context in cache key to avoid stale results
    const contextHash = context && context.length > 0 
      ? this.hashString(JSON.stringify(context.map(msg => ({ type: msg.type, content: msg.content }))))
      : 'no-context';
    
    return `workflow:${this.hashString(userDescription)}:${this.hashString(connectionHash)}:${contextHash}`;
  }

  /**
   * Generate cache key for message classification
   */
  private generateClassificationCacheKey(message: string): string {
    return `classification:${this.hashString(message)}`;
  }

  /**
   * Generate cache key for connection analysis
   */
  private generateConnectionAnalysisCacheKey(
    message: string,
    connections: Array<{ id: string; name: string }>,
    context?: any[]
  ): string {
    const connectionHash = connections
      .map(conn => conn.id)
      .sort()
      .join('|');
    
    // Include conversation context in cache key to avoid stale results
    const contextHash = context && context.length > 0 
      ? this.hashString(JSON.stringify(context.map(msg => ({ type: msg.type, content: msg.content }))))
      : 'no-context';
    
    return `connection_analysis:${this.hashString(message)}:${this.hashString(connectionHash)}:${contextHash}`;
  }

  /**
   * Get cached workflow generation result
   */
  getWorkflowResult(
    userDescription: string,
    connections: Array<{ id: string; name: string; endpoints: any[] }>,
    context?: any[]
  ): any | null {
    const key = this.generateWorkflowCacheKey(userDescription, connections, context);
    return this.get(key);
  }

  /**
   * Cache workflow generation result
   */
  setWorkflowResult(
    userDescription: string,
    connections: Array<{ id: string; name: string; endpoints: any[] }>,
    result: any,
    ttl?: number,
    context?: any[]
  ): void {
    const key = this.generateWorkflowCacheKey(userDescription, connections, context);
    this.set(key, result, ttl);
  }

  /**
   * Get cached classification result
   */
  getClassificationResult(message: string): any | null {
    const key = this.generateClassificationCacheKey(message);
    return this.get(key);
  }

  /**
   * Cache classification result
   */
  setClassificationResult(message: string, result: any, ttl?: number): void {
    const key = this.generateClassificationCacheKey(message);
    this.set(key, result, ttl);
  }

  /**
   * Get cached connection analysis result
   */
  getConnectionAnalysisResult(
    message: string,
    connections: Array<{ id: string; name: string }>,
    context?: any[]
  ): any | null {
    const key = this.generateConnectionAnalysisCacheKey(message, connections, context);
    return this.get(key);
  }

  /**
   * Cache connection analysis result
   */
  setConnectionAnalysisResult(
    message: string,
    connections: Array<{ id: string; name: string }>,
    result: any,
    ttl?: number,
    context?: any[]
  ): void {
    const key = this.generateConnectionAnalysisCacheKey(message, connections, context);
    this.set(key, result, ttl);
  }

  /**
   * Generic get method
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Generic set method
   */
  private set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Hash string for cache key generation
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 50) + '...',
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
      entries: entries.slice(0, 10) // Show first 10 entries
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear entries by pattern
   */
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
