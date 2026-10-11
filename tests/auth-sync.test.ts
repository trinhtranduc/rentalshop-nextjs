/**
 * #744: another useAuth() instance (the sidebar) takes the saved name; the instance that refreshed keeps its state.
 */
import { describe, expect, it } from '@jest/globals';
import { storedUserDiffers, userSyncSignature } from '../packages/hooks/src/hooks/auth-sync';

const user = { id: 3, firstName: 'Merchant', lastName: '2', name: '2 Merchant', phone: '+1-555-0002', email: 'm@x.test', role: 'MERCHANT', isActive: true, updatedAt: '2026-10-10T07:00:00.000Z' };

describe('storedUserDiffers (#744)', () => {
  it('is false for the same user and values (the instance that just refreshed)', () => {
    expect(storedUserDiffers({ ...user, merchant: { id: 1 } } as any, user)).toBe(false);
  });

  it('is true when the same user was saved with another last name, name or phone', () => {
    expect(storedUserDiffers(user, { ...user, lastName: 'Probe' })).toBe(true);
    expect(storedUserDiffers(user, { ...user, name: 'Probe Merchant' })).toBe(true);
    expect(storedUserDiffers(user, { ...user, phone: '0987654321' })).toBe(true);
    expect(storedUserDiffers(user, { ...user, updatedAt: '2026-10-10T07:05:00.000Z' })).toBe(true);
  });

  it('is true for another user and for no user yet', () => {
    expect(storedUserDiffers(user, { ...user, id: 4 })).toBe(true);
    expect(storedUserDiffers(null, user)).toBe(true);
    expect(storedUserDiffers(undefined, user)).toBe(true);
  });

  it('is false without a stored user (nothing to take)', () => {
    expect(storedUserDiffers(user, null)).toBe(false);
    expect(storedUserDiffers(null, null)).toBe(false);
  });

  it('reads a Date and a string updatedAt alike and ignores fields the shell does not show', () => {
    const d = new Date('2026-10-10T07:00:00.000Z');
    expect(userSyncSignature({ ...user, updatedAt: d })).toBe(userSyncSignature(user));
    expect(storedUserDiffers(user, { ...user, permissions: ['x'] } as any)).toBe(false);
  });
});
