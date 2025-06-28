import { NextApiRequest, NextApiResponse } from 'next';
import { logWarn } from '../utils/logger';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  keyGenerator?: (req: NextApiRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean;     // Skip rate limiting for failed requests
}

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, count: number, resetTime: number): Promise<void>;
  increment(key: string): Promise<{ count: number; resetTime: number }>;
}

/**
 * In-memory rate limit store (for development)
 */
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = this.store.get(key);
    if (!data) return null;
    
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return data;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store.set(key, { count, resetTime });
  }

  async increment(key: string): Promise<{ count: number; resetTime: number }> {
    const data = this.store.get(key);
    if (!data) {
      throw new Error('Key not found in store');
    }
    
    data.count++;
    this.store.set(key, data);
    return data;
  }
}

/**
 * Default key generator for rate limiting
 */
const defaultKeyGenerator = (req: NextApiRequest): string => {
  const ip = (req.headers['x-forwarded-for'] as string) || 
             req.socket.remoteAddress || 
             'unknown';
  return `rate_limit:${ip}`;
};

/**
 * Rate limiter middleware factory
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  // Use memory store for now - can be replaced with Redis in production
  const store = new MemoryStore();

  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const resetTime = now + windowMs;

      // Get current rate limit data
      let rateLimitData = await store.get(key);

      if (!rateLimitData) {
        // First request in this window
        await store.set(key, 1, resetTime);
        rateLimitData = { count: 1, resetTime };
      } else if (rateLimitData.count >= maxRequests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
        
        logWarn('Rate limit exceeded', {
          key,
          count: rateLimitData.count,
          maxRequests,
          retryAfter
        });

        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString());
        res.setHeader('Retry-After', retryAfter.toString());
        
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter
        });
        return;
      } else {
        // Increment request count
        rateLimitData = await store.increment(key);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitData.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString());

      // Call next middleware
      next();

    } catch (error) {
      console.error('Rate limiter error:', error);
      // Continue without rate limiting if there's an error
      next();
    }
  };
};

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  // Strict rate limiter for sensitive endpoints
  strict: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10
  }),

  // Standard rate limiter for most endpoints
  standard: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }),

  // Loose rate limiter for public endpoints
  loose: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  }),

  // API-specific rate limiter
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  }),

  // Authentication rate limiter
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  })
};

/**
 * Custom rate limiter for specific use cases
 */
export const customRateLimiter = (
  windowMs: number,
  maxRequests: number,
  keyGenerator?: (req: NextApiRequest) => string
) => {
  return createRateLimiter({
    windowMs,
    maxRequests,
    keyGenerator
  });
};

/**
 * User-specific rate limiter
 */
export const userRateLimiter = (maxRequests: number = 100) => {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests,
    keyGenerator: (req: NextApiRequest) => {
      const userId = (req as any).session?.user?.id || 'anonymous';
      return `rate_limit:user:${userId}`;
    }
  });
};

/**
 * IP-based rate limiter
 */
export const ipRateLimiter = (maxRequests: number = 100) => {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests,
    keyGenerator: (req: NextApiRequest) => {
      const ip = (req.headers['x-forwarded-for'] as string) || 
                 req.socket.remoteAddress || 
                 'unknown';
      return `rate_limit:ip:${ip}`;
    }
  });
}; 