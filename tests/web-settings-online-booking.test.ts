/**
 * #1138 Settings › "Nhận đặt online": the login payload has no merchant.onlineBookingEnabled,
 * only GET /api/users/profile does. A missing key is "unknown" (load the profile), never OFF.
 */
import { describe, expect, it } from '@jest/globals';
import { onlineBookingFlag, showPublicPriceFlag } from '../apps/client/app/settings/settings-model';

describe('onlineBookingFlag (#1138)', () => {
  it('login-shaped merchant (tenantKey, no flag) is unknown, not OFF', () => {
    const loginMerchant = { id: 12, name: 'Shop', tenantKey: 'shop-12', currency: 'VND' };
    expect(onlineBookingFlag(loginMerchant)).toBeNull();
  });

  it('profile-shaped merchant gives the stored value', () => {
    expect(onlineBookingFlag({ id: 12, tenantKey: 'shop-12', onlineBookingEnabled: true })).toBe(true);
    expect(onlineBookingFlag({ id: 12, tenantKey: 'shop-12', onlineBookingEnabled: false })).toBe(false);
  });

  it('no merchant or a non-boolean value is unknown', () => {
    expect(onlineBookingFlag(null)).toBeNull();
    expect(onlineBookingFlag(undefined)).toBeNull();
    expect(onlineBookingFlag({ onlineBookingEnabled: 'true' })).toBeNull();
  });
});

describe('showPublicPriceFlag (#1174)', () => {
  it('login-shaped merchant (no flag) is unknown', () => {
    expect(showPublicPriceFlag({ id: 12, tenantKey: 'shop-12' })).toBeNull();
  });

  it('profile-shaped merchant gives the stored value', () => {
    expect(showPublicPriceFlag({ showPublicPrice: true })).toBe(true);
    expect(showPublicPriceFlag({ showPublicPrice: false })).toBe(false);
  });
});
