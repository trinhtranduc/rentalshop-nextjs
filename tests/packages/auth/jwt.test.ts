/**
 * Unit tests for @rentalshop/auth - JWT utilities
 */

// Mock dependencies that jwt.ts imports
jest.mock('@rentalshop/utils/server', () => ({
  getSubscriptionError: jest.fn(),
}));

import { generateToken, verifyToken, verifyTokenSimple } from '../../../packages/auth/src/jwt';
import type { JWTPayload } from '../../../packages/auth/src/jwt';

describe('@rentalshop/auth - JWT Utilities', () => {
  const mockPayload: JWTPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'ADMIN',
    merchantId: 10,
    outletId: 5,
    sessionId: 'session-123',
    passwordChangedAt: null,
    permissionsChangedAt: null,
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token string', () => {
      const token = generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWT has 3 parts separated by dots
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken(mockPayload);
      const token2 = generateToken({ ...mockPayload, userId: 2 });

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.merchantId).toBe(mockPayload.merchantId);
      expect(decoded.outletId).toBe(mockPayload.outletId);
      expect(decoded.sessionId).toBe(mockPayload.sessionId);
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw for a tampered token', () => {
      const token = generateToken(mockPayload);
      const tampered = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tampered)).toThrow();
    });

    it('should include iat and exp claims', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token) as any;

      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyTokenSimple', () => {
    it('should return user object for valid token', async () => {
      const token = generateToken(mockPayload);
      const user = await verifyTokenSimple(token);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(mockPayload.userId);
      expect(user!.email).toBe(mockPayload.email);
      expect(user!.role).toBe(mockPayload.role);
      expect(user!.merchantId).toBe(mockPayload.merchantId);
      expect(user!.outletId).toBe(mockPayload.outletId);
    });

    it('should return null for invalid token', async () => {
      const user = await verifyTokenSimple('invalid-token');

      expect(user).toBeNull();
    });

    it('should return null for empty token', async () => {
      const user = await verifyTokenSimple('');

      expect(user).toBeNull();
    });

    it('should handle payload with null merchantId and outletId', async () => {
      const payload: JWTPayload = {
        userId: 99,
        email: 'admin@test.com',
        role: 'ADMIN',
        merchantId: null,
        outletId: null,
        passwordChangedAt: null,
        permissionsChangedAt: null,
      };
      const token = generateToken(payload);
      const user = await verifyTokenSimple(token);

      expect(user).not.toBeNull();
      expect(user!.merchantId).toBeNull();
      expect(user!.outletId).toBeNull();
    });
  });
});
