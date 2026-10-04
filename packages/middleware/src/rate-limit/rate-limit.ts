import { NextRequest, NextResponse } from 'next/server';
// Relative import (bundled by tsup) keeps this file free of the full @rentalshop/utils barrel,
// the same way packages/database pulls single utils files.
import { ResponseBuilder } from '../../../utils/src/api/response-builder';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Function to generate unique keys
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore: RateLimitStore = {};

export const createRateLimiter = (config: RateLimitConfig) => {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 10, // 10 requests per minute default
    keyGenerator = (req: NextRequest) => {
      // Use IP address as default key
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
      return `rate_limit:${ip}`;
    }
  } = config;

  return (request: NextRequest): NextResponse | null => {
    const key = keyGenerator(request);
    const now = Date.now();
    
    // Get or create rate limit entry
    if (!rateLimitStore[key] || now > rateLimitStore[key].resetTime) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      rateLimitStore[key].count++;
    }

    // Check if limit exceeded
    if (rateLimitStore[key].count > maxRequests) {
      const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
      // Standard error body (success/code/message/error) so mobile apps can decode it (#410).
      // retryAfter stays in the body for older clients.
      return NextResponse.json(
        {
          ...ResponseBuilder.error('RATE_LIMIT_EXCEEDED'),
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitStore[key].resetTime.toString()
          }
        }
      );
    }

    // Return null to indicate the request should continue
    // Rate limit headers will be added by the route handler if needed
    return null;
  };
};

// Pre-configured rate limiters for different use cases
export const searchRateLimiter = createRateLimiter({
  windowMs: 30000, // 30 seconds
  maxRequests: 100, // 100 requests per 30 seconds (increased for development)
  keyGenerator: (req: NextRequest) => {
    // Use IP + user agent for search endpoints
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    return `search_rate_limit:${ip}:${userAgent}`;
  }
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

// Auth rate limiter - stricter limits for login/register/password reset
export const authRateLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 10, // 10 attempts per 15 minutes
  keyGenerator: (req: NextRequest) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    return `auth_rate_limit:${ip}`;
  }
});

// Password reset rate limiter - very strict
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 3, // 3 attempts per hour
  keyGenerator: (req: NextRequest) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    return `password_reset_rate_limit:${ip}`;
  }
});

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);
