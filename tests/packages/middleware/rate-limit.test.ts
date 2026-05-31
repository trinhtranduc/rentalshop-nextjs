/**
 * Unit tests for @rentalshop/middleware - Rate Limiting
 */

// Mock NextRequest and NextResponse
class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}));
  }
  get(key: string) { return this.headers.get(key) || null; }
  set(key: string, value: string) { this.headers.set(key, value); }
  entries() { return this.headers.entries(); }
}

const createMockRequest = (overrides: { headers?: Record<string, string>; ip?: string } = {}) => {
  return {
    headers: new MockHeaders(overrides.headers || {}),
    ip: overrides.ip || '127.0.0.1',
  } as any;
};

// We need to mock next/server before importing the module
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      body,
      status: init?.status || 200,
      headers: init?.headers || {},
    }),
  },
}));

import { createRateLimiter } from '../../../packages/middleware/src/rate-limit/rate-limit';

describe('@rentalshop/middleware - Rate Limiting', () => {
  beforeEach(() => {
    // Reset the rate limit store between tests by using unique IPs
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within the limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const request = createMockRequest({ ip: '10.0.0.1' });

      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        const result = limiter(request);
        expect(result).toBeNull();
      }
    });

    it('should block requests exceeding the limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      const request = createMockRequest({ ip: '10.0.0.2' });

      // First 3 requests pass
      for (let i = 0; i < 3; i++) {
        expect(limiter(request)).toBeNull();
      }

      // 4th request should be blocked
      const result = limiter(request);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
      expect(result!.body.error).toBe('Too many requests');
    });

    it('should reset after the time window expires', () => {
      const limiter = createRateLimiter({
        windowMs: 1000, // 1 second
        maxRequests: 2,
      });

      const request = createMockRequest({ ip: '10.0.0.3' });

      // Use up the limit
      expect(limiter(request)).toBeNull();
      expect(limiter(request)).toBeNull();
      expect(limiter(request)).not.toBeNull(); // blocked

      // Advance time past the window
      jest.advanceTimersByTime(1100);

      // Should be allowed again
      expect(limiter(request)).toBeNull();
    });

    it('should use custom key generator', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req: any) => `custom:${req.headers.get('x-api-key') || 'anon'}`,
      });

      const request1 = createMockRequest({ headers: { 'x-api-key': 'key-A' }, ip: '10.0.0.4' });
      const request2 = createMockRequest({ headers: { 'x-api-key': 'key-B' }, ip: '10.0.0.4' });

      // Each key has its own limit
      expect(limiter(request1)).toBeNull();
      expect(limiter(request1)).toBeNull();
      expect(limiter(request1)).not.toBeNull(); // key-A blocked

      // key-B should still work
      expect(limiter(request2)).toBeNull();
      expect(limiter(request2)).toBeNull();
      expect(limiter(request2)).not.toBeNull(); // key-B blocked
    });

    it('should use x-forwarded-for header for IP detection', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      const request = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
        ip: '10.0.0.5',
      });

      expect(limiter(request)).toBeNull();
      expect(limiter(request)).not.toBeNull(); // blocked
    });

    it('should include rate limit headers in blocked response', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      const request = createMockRequest({ ip: '10.0.0.6' });
      limiter(request); // use up limit

      const result = limiter(request);
      expect(result).not.toBeNull();
      expect(result!.headers['X-RateLimit-Limit']).toBe('1');
      expect(result!.headers['X-RateLimit-Remaining']).toBe('0');
      expect(result!.headers['Retry-After']).toBeDefined();
    });

    it('should include retryAfter in response body', () => {
      const limiter = createRateLimiter({
        windowMs: 30000,
        maxRequests: 1,
      });

      const request = createMockRequest({ ip: '10.0.0.7' });
      limiter(request);

      const result = limiter(request);
      expect(result!.body.retryAfter).toBeDefined();
      expect(result!.body.retryAfter).toBeGreaterThan(0);
      expect(result!.body.retryAfter).toBeLessThanOrEqual(30);
    });
  });
});
