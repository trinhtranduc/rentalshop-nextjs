/**
 * Unit tests for @rentalshop/middleware - Subscription Manager (pure functions)
 */

// Mock next/server and database before imports
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
}));

jest.mock('@rentalshop/database', () => ({
  prisma: {},
}));

jest.mock('@rentalshop/constants', () => ({
  API: { STATUS: { NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401, INTERNAL_SERVER_ERROR: 500 } },
}));

import {
  canPerformOperation,
  getSubscriptionErrorMessage,
  getAllowedOperations,
} from '../../../packages/middleware/src/subscription-manager';

describe('@rentalshop/middleware - Subscription Manager (Pure Functions)', () => {
  describe('canPerformOperation', () => {
    it('should allow all operations for active subscription', () => {
      expect(canPerformOperation('ACTIVE', 'create')).toBe(true);
      expect(canPerformOperation('ACTIVE', 'read')).toBe(true);
      expect(canPerformOperation('ACTIVE', 'update')).toBe(true);
      expect(canPerformOperation('ACTIVE', 'delete')).toBe(true);
      expect(canPerformOperation('ACTIVE', 'admin')).toBe(true);
    });

    it('should only allow read for paused subscription', () => {
      expect(canPerformOperation('PAUSED', 'read')).toBe(true);
      expect(canPerformOperation('PAUSED', 'create')).toBe(false);
      expect(canPerformOperation('PAUSED', 'update')).toBe(false);
      expect(canPerformOperation('PAUSED', 'delete')).toBe(false);
      expect(canPerformOperation('PAUSED', 'admin')).toBe(false);
    });

    it('should deny all operations for expired subscription', () => {
      expect(canPerformOperation('EXPIRED', 'create')).toBe(false);
      expect(canPerformOperation('EXPIRED', 'read')).toBe(false);
      expect(canPerformOperation('EXPIRED', 'update')).toBe(false);
      expect(canPerformOperation('EXPIRED', 'delete')).toBe(false);
    });

    it('should deny all operations for cancelled subscription', () => {
      expect(canPerformOperation('CANCELLED', 'create')).toBe(false);
      expect(canPerformOperation('CANCELLED', 'read')).toBe(false);
    });

    it('should deny all operations for past_due subscription', () => {
      expect(canPerformOperation('PAST_DUE', 'create')).toBe(false);
      expect(canPerformOperation('PAST_DUE', 'read')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(canPerformOperation('active', 'create')).toBe(true);
      expect(canPerformOperation('Active', 'read')).toBe(true);
      expect(canPerformOperation('paused', 'read')).toBe(true);
    });

    it('should deny for unknown status', () => {
      expect(canPerformOperation('unknown', 'read')).toBe(false);
      expect(canPerformOperation('', 'read')).toBe(false);
    });
  });

  describe('getSubscriptionErrorMessage', () => {
    it('should return correct message for paused status', () => {
      const msg = getSubscriptionErrorMessage('PAUSED');
      expect(msg).toContain('paused');
    });

    it('should return correct message for expired status', () => {
      const msg = getSubscriptionErrorMessage('EXPIRED');
      expect(msg).toContain('expired');
      expect(msg).toContain('renew');
    });

    it('should return correct message for cancelled status', () => {
      const msg = getSubscriptionErrorMessage('CANCELLED');
      expect(msg).toContain('cancelled');
    });

    it('should return correct message for past_due status', () => {
      const msg = getSubscriptionErrorMessage('PAST_DUE');
      expect(msg).toContain('past due');
    });

    it('should return merchant-level error when merchant status is not active', () => {
      const msg = getSubscriptionErrorMessage('ACTIVE', 'suspended');
      expect(msg).toContain('Merchant');
      expect(msg).toContain('suspended');
    });

    it('should return generic message for unknown status', () => {
      const msg = getSubscriptionErrorMessage('unknown_status');
      expect(msg).toContain('contact support');
    });
  });

  describe('getAllowedOperations', () => {
    it('should return all operations for active status', () => {
      const ops = getAllowedOperations('ACTIVE');
      expect(ops).toContain('create');
      expect(ops).toContain('read');
      expect(ops).toContain('update');
      expect(ops).toContain('delete');
      expect(ops).toContain('admin');
    });

    it('should return only read for paused status', () => {
      const ops = getAllowedOperations('PAUSED');
      expect(ops).toEqual(['read']);
    });

    it('should return empty array for expired status', () => {
      const ops = getAllowedOperations('EXPIRED');
      expect(ops).toEqual([]);
    });

    it('should return empty array for cancelled status', () => {
      const ops = getAllowedOperations('CANCELLED');
      expect(ops).toEqual([]);
    });

    it('should return empty array for past_due status', () => {
      const ops = getAllowedOperations('PAST_DUE');
      expect(ops).toEqual([]);
    });

    it('should return empty array for unknown status', () => {
      const ops = getAllowedOperations('something_else');
      expect(ops).toEqual([]);
    });
  });
});
