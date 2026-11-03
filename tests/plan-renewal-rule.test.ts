/**
 * #1459: the renewal rule lives in one place on the server (apps/api/lib/plan-renewal.ts).
 * Same plan: ≤ 7 Vietnam days left, trial, or expired. Upgrade: any time. Auto-renewing: nothing to buy.
 * Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  RENEW_WINDOW_DAYS,
  channelFromStore,
  deviceStoreFromHeaders,
  inAppPlans,
  planTierFromName,
  renewalOffer,
  storeProduct,
  storeProductIdsForPlanName,
} from '../apps/api/lib/plan-renewal';

const PLANS = inAppPlans([
  { id: 3, name: 'Professional', isActive: true },
  { id: 1, name: 'Trial', isActive: true },
  { id: 4, name: 'Enterprise', isActive: true },
  { id: 2, name: 'Basic', isActive: true },
  { id: 9, name: 'Basic old', isActive: false },
]);

// 2026-11-02 10:00 in Vietnam
const NOW = new Date('2026-11-02T03:00:00.000Z');
/** End of the Vietnam day `days` days after NOW's day (23:00 VN) */
const endIn = (days: number) => new Date(Date.parse('2026-11-02T16:00:00.000Z') + days * 86400000);

const basic = (over: Partial<Parameters<typeof renewalOffer>[0]> = {}) =>
  renewalOffer({ dbStatus: 'ACTIVE', currentPeriodEnd: endIn(20), planId: 2, planName: 'Basic', autoRenew: false, now: NOW, ...over }, PLANS);

describe('store products and plan tiers', () => {
  it('maps the four products, with or without a Google Play base plan', () => {
    expect(storeProduct('anyrent_merchant_semi_annual')).toMatchObject({ tier: 'basic', months: 6 });
    expect(storeProduct('anyrent_merchant_annual')).toMatchObject({ tier: 'basic', months: 12 });
    expect(storeProduct('anyrent_professional_semi_annual')).toMatchObject({ tier: 'professional', months: 6 });
    expect(storeProduct('anyrent_professional_annual:annual')).toMatchObject({ tier: 'professional', months: 12, id: 'anyrent_professional_annual' });
    expect(storeProduct('something_else')).toBeNull();
    expect(storeProduct(undefined)).toBeNull();
  });

  it('plan names give the tier; Trial and Enterprise are not sold in the apps', () => {
    expect(planTierFromName('Basic')).toBe('basic');
    expect(planTierFromName('Professional')).toBe('professional');
    expect(planTierFromName('pro')).toBe('professional');
    expect(planTierFromName('Trial')).toBeNull();
    expect(planTierFromName('Enterprise')).toBeNull();
    expect(storeProductIdsForPlanName('Basic')).toEqual({ semiAnnual: 'anyrent_merchant_semi_annual', annual: 'anyrent_merchant_annual' });
    expect(storeProductIdsForPlanName('Professional')).toEqual({
      semiAnnual: 'anyrent_professional_semi_annual',
      annual: 'anyrent_professional_annual',
    });
    expect(storeProductIdsForPlanName('Enterprise')).toBeNull();
  });

  it('in-app plans: active ones with a tier, Basic before Professional', () => {
    expect(PLANS).toEqual([{ id: 2, tier: 'basic' }, { id: 3, tier: 'professional' }]);
  });

  it('RevenueCat stores map to channels', () => {
    expect(channelFromStore('APP_STORE')).toBe('APP_STORE');
    expect(channelFromStore('PLAY_STORE')).toBe('PLAY_STORE');
    expect(channelFromStore('PROMOTIONAL')).toBe('MANUAL');
    expect(channelFromStore(undefined)).toBe('MANUAL');
  });
});

describe('renewalOffer (#1459)', () => {
  it('Basic with 20 days left: only the upgrade', () => {
    const offer = basic();
    expect(offer).toMatchObject({ expired: false, daysRemaining: 20, canRenew: false, canUpgrade: true, purchasablePlanIds: [3] });
  });

  it(`Basic with ${RENEW_WINDOW_DAYS} days left: renew and upgrade; 8 days: upgrade only`, () => {
    expect(basic({ currentPeriodEnd: endIn(7) })).toMatchObject({ daysRemaining: 7, canRenew: true, canUpgrade: true, purchasablePlanIds: [2, 3] });
    expect(basic({ currentPeriodEnd: endIn(8) })).toMatchObject({ daysRemaining: 8, canRenew: false, purchasablePlanIds: [3] });
  });

  it('the window counts Vietnam days, not hours: 7 days at 23:59 VN, 8 at 00:00 VN the day after', () => {
    // 2026-11-09 23:59:59 VN = 16:59:59Z, 2026-11-10 00:00 VN = 17:00:00Z
    expect(basic({ currentPeriodEnd: new Date('2026-11-09T16:59:59.000Z') }).daysRemaining).toBe(7);
    expect(basic({ currentPeriodEnd: new Date('2026-11-09T17:00:00.000Z') }).daysRemaining).toBe(8);
  });

  it('last day (0 left) is still inside the window', () => {
    expect(basic({ currentPeriodEnd: new Date('2026-11-02T16:59:00.000Z') })).toMatchObject({ daysRemaining: 0, canRenew: true });
  });

  it('expired: every plan, including a lower one', () => {
    const offer = renewalOffer(
      { dbStatus: 'ACTIVE', currentPeriodEnd: new Date('2026-10-31T10:00:00Z'), planId: 3, planName: 'Professional', autoRenew: true, now: NOW },
      PLANS,
    );
    expect(offer).toMatchObject({ expired: true, daysRemaining: null, autoRenew: false, canRenew: true, canUpgrade: false, purchasablePlanIds: [2, 3] });
  });

  it('a missing period end counts as expired', () => {
    expect(basic({ currentPeriodEnd: null })).toMatchObject({ expired: true, purchasablePlanIds: [2, 3] });
  });

  it('trial on the Trial plan: every plan, and choosing one is an upgrade', () => {
    const offer = renewalOffer({ dbStatus: 'TRIAL', currentPeriodEnd: endIn(40), planId: 1, planName: 'Trial', autoRenew: false, now: NOW }, PLANS);
    expect(offer).toMatchObject({ isTrial: true, planTier: null, canRenew: false, canUpgrade: true, purchasablePlanIds: [2, 3] });
  });

  it('trial on Basic: renew allowed far from the end', () => {
    expect(basic({ dbStatus: 'TRIAL', currentPeriodEnd: endIn(40) })).toMatchObject({ canRenew: true, canUpgrade: true, purchasablePlanIds: [2, 3] });
  });

  it('auto-renewing: nothing to buy, even inside the window', () => {
    expect(basic({ autoRenew: true, currentPeriodEnd: endIn(3) })).toMatchObject({
      autoRenew: true, canRenew: false, canUpgrade: false, purchasablePlanIds: [],
    });
  });

  it('Professional with 30 days left: nothing (no higher plan); with 5 days: renew only', () => {
    const pro = (end: Date) =>
      renewalOffer({ dbStatus: 'ACTIVE', currentPeriodEnd: end, planId: 3, planName: 'Professional', autoRenew: false, now: NOW }, PLANS);
    expect(pro(endIn(30))).toMatchObject({ canRenew: false, canUpgrade: false, purchasablePlanIds: [] });
    expect(pro(endIn(5))).toMatchObject({ canRenew: true, canUpgrade: false, purchasablePlanIds: [3] });
  });

  it('Enterprise (admin-managed, not sold in the apps) active: nothing; expired: any in-app plan', () => {
    const ent = (end: Date) =>
      renewalOffer({ dbStatus: 'ACTIVE', currentPeriodEnd: end, planId: 4, planName: 'Enterprise', autoRenew: false, now: NOW }, PLANS);
    expect(ent(endIn(3))).toMatchObject({ canRenew: false, canUpgrade: false, purchasablePlanIds: [] });
    expect(ent(new Date('2026-10-01T00:00:00Z'))).toMatchObject({ canRenew: false, canUpgrade: true, purchasablePlanIds: [2, 3] });
  });

  it('no plans readable: nothing purchasable, flags false', () => {
    expect(renewalOffer({ dbStatus: 'ACTIVE', currentPeriodEnd: endIn(3), planId: 2, planName: 'Basic', autoRenew: false, now: NOW }, [])).toMatchObject({
      canRenew: false, canUpgrade: false, purchasablePlanIds: [],
    });
  });
});

describe('store subscribers on their own store (A5, A6)', () => {
  const store = (over: Partial<Parameters<typeof renewalOffer>[0]> = {}) =>
    renewalOffer(
      { dbStatus: 'ACTIVE', currentPeriodEnd: endIn(3), planId: 2, planName: 'Basic', autoRenew: true, billingChannel: 'APP_STORE', deviceStore: 'APP_STORE', now: NOW, ...over },
      PLANS,
    );

  it('A5 auto-renewing on this device\'s store: the upgrade is offered, the same plan is not', () => {
    expect(store()).toMatchObject({ autoRenew: true, canRenew: false, canUpgrade: true, purchasablePlanIds: [3], reenableAutoRenew: false });
    expect(store({ billingChannel: 'PLAY_STORE', deviceStore: 'PLAY_STORE' })).toMatchObject({ purchasablePlanIds: [3] });
  });

  it('A5 auto-renewing on another store (or Lemon, or an unknown device): nothing, never two subscriptions', () => {
    expect(store({ deviceStore: 'PLAY_STORE' })).toMatchObject({ canUpgrade: false, purchasablePlanIds: [] });
    expect(store({ deviceStore: null })).toMatchObject({ purchasablePlanIds: [] });
    expect(store({ billingChannel: 'LEMON' })).toMatchObject({ purchasablePlanIds: [] });
  });

  it('A6 store plan with auto-renew off, this device\'s store: "Bật lại tự gia hạn" instead of buying the same product; upgrade stays', () => {
    expect(store({ autoRenew: false })).toMatchObject({ reenableAutoRenew: true, canRenew: false, canUpgrade: true, purchasablePlanIds: [3] });
    // far from the end too: turning auto-renew back on is always possible
    expect(store({ autoRenew: false, currentPeriodEnd: endIn(40) })).toMatchObject({ reenableAutoRenew: true, purchasablePlanIds: [3] });
    // Professional: nothing to buy, only re-enable
    expect(store({ autoRenew: false, planId: 3, planName: 'Professional' })).toMatchObject({ reenableAutoRenew: true, purchasablePlanIds: [] });
  });

  it('A6 does not apply on another store, to manual plans, or after the period ended', () => {
    expect(store({ autoRenew: false, deviceStore: 'PLAY_STORE' })).toMatchObject({ reenableAutoRenew: false, canRenew: true, purchasablePlanIds: [2, 3] });
    expect(store({ autoRenew: false, billingChannel: 'MANUAL' })).toMatchObject({ reenableAutoRenew: false, canRenew: true });
    expect(store({ autoRenew: false, currentPeriodEnd: new Date('2026-10-30T00:00:00Z') })).toMatchObject({
      expired: true, reenableAutoRenew: false, canRenew: true, purchasablePlanIds: [2, 3],
    });
  });

  it('deviceStoreFromHeaders: iOS → APP_STORE, Android → PLAY_STORE, else none', () => {
    const h = (map: Record<string, string>) => ({ get: (k: string) => map[k.toLowerCase()] ?? null });
    expect(deviceStoreFromHeaders(h({ 'x-device-type': 'ios' }))).toBe('APP_STORE');
    expect(deviceStoreFromHeaders(h({ 'x-device-type': 'android' }))).toBe('PLAY_STORE');
    expect(deviceStoreFromHeaders(h({}))).toBeNull();
  });
});

