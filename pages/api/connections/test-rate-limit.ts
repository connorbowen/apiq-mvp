import { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { requireAdmin, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { z } from 'zod';

// Input validation schema
const rateLimitTestSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  action: z.string().min(1, 'Action is required')
});

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `user:${userId}`;
  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }

  // Increment count
  userLimit.count++;
  rateLimitStore.set(key, userLimit);
  
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count, 
    resetTime: userLimit.resetTime 
  };
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require admin authentication for rate limit testing
    const user = await requireAdmin(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Validate input using Zod schema
    const validationResult = rateLimitTestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      });
    }

    const { provider, action } = validationResult.data;

    // Check internal rate limit
    const rateLimit = checkRateLimit(user.id);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded - too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        data: {
          remaining: rateLimit.remaining,
          resetTime: new Date(rateLimit.resetTime).toISOString(),
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        }
      });
    }

    // Simulate provider-specific rate limiting
    let providerRateLimited = false;
    let providerError = null;

    switch (provider.toLowerCase()) {
      case 'github':
        // Simulate GitHub rate limiting (5000 requests per hour)
        if (Math.random() < 0.1) { // 10% chance of rate limit
          providerRateLimited = true;
          providerError = 'API rate limit exceeded for github.com';
        }
        break;

      case 'google':
        // Simulate Google rate limiting (10000 requests per 100 seconds)
        if (Math.random() < 0.05) { // 5% chance of rate limit
          providerRateLimited = true;
          providerError = 'Quota exceeded for quota group';
        }
        break;

      case 'slack':
        // Simulate Slack rate limiting (50 requests per minute)
        if (Math.random() < 0.15) { // 15% chance of rate limit
          providerRateLimited = true;
          providerError = 'Rate limit exceeded';
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported provider: ${provider}`,
          code: 'VALIDATION_ERROR'
        });
    }

    if (providerRateLimited) {
      logInfo('Provider rate limit simulated', {
        userId: user.id,
        provider,
        action,
        error: providerError
      });

      return res.status(429).json({
        success: false,
        error: providerError,
        code: 'PROVIDER_RATE_LIMIT',
        data: {
          provider,
          action,
          retryAfter: 60, // Retry after 1 minute
          resetTime: new Date(Date.now() + 60 * 1000).toISOString()
        }
      });
    }

    // Simulate successful response
    const responseData = {
      provider,
      action,
      success: true,
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: new Date(rateLimit.resetTime).toISOString()
      }
    };

    logInfo('Rate limit test completed successfully', {
      userId: user.id,
      provider,
      action,
      remainingRequests: rateLimit.remaining
    });

    return res.status(200).json({
      success: true,
      data: responseData,
      message: 'Rate limit test completed successfully'
    });

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 