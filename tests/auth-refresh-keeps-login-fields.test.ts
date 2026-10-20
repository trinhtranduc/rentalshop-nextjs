/**
 * #1140: GET /api/users/profile has no `permissions` (and fewer merchant fields) than the login payload.
 * refreshUser replaced the user with it, so the owner lost `merchant.manage` and Thông tin cửa hàng turned read-only.
 */
import { describe, expect, it } from '@jest/globals';
import { mergeRefreshedUser } from '../packages/hooks/src/hooks/auth-sync';

const login = {
  id: 2,
  firstName: 'Merchant',
  role: 'MERCHANT',
  permissions: ['merchant.manage', 'outlet.manage'],
  publicProductLink: 'https://x/shop/products',
  merchant: { id: 1, name: 'Shop', tenantKey: 'shop', currency: 'VND' },
};
const profile = { id: 2, firstName: 'New', role: 'MERCHANT', phone: null, merchant: { id: 1, name: 'Shop 2', onlineBookingEnabled: true } };

describe('mergeRefreshedUser (#1140)', () => {
  it('keeps login-only fields the profile does not send', () => {
    const u = mergeRefreshedUser(login, profile) as Record<string, any>;
    expect(u.permissions).toEqual(['merchant.manage', 'outlet.manage']);
    expect(u.publicProductLink).toBe('https://x/shop/products');
    expect(u.merchant).toEqual({ id: 1, name: 'Shop 2', tenantKey: 'shop', currency: 'VND', onlineBookingEnabled: true });
  });

  it('takes the profile values it does send, including nulls', () => {
    const u = mergeRefreshedUser(login, profile) as Record<string, any>;
    expect(u.firstName).toBe('New');
    expect(u.phone).toBeNull();
  });

  it('never mixes two different users', () => {
    expect(mergeRefreshedUser({ ...login, id: 9 }, profile)).toEqual(profile);
    expect(mergeRefreshedUser(null, profile)).toEqual(profile);
  });
});
