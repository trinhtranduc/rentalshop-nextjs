import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
          retryAfter: Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitStore[key].resetTime - now) / 1000).toString(),
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
  maxRequests: 20, // 20 requests per 30 seconds
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

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000); 