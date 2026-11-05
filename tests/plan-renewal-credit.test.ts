/**
 * #1459 A13: the renewal credit rules in apps/api/lib/plan-renewal.ts (pure).
 * - storeCreditForPurchase: the credit a store purchase or renewal carries (design 1 and 3);
 * - manualExtensionBilling: an admin / manual / SePay extension while a store plan runs joins the credit (design 5);
 * - storeRenewsAt: the store's next charge for GET /api/subscriptions/status (design 7).
 */
import { manualExtensionBilling, storeCreditForPurchase, storeRenewsAt } from '../apps/api/lib/plan-renewal';

const DAY = 86400000;
const NOW = new Date('2026-11-03T03:00:00.000Z');
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

const storeRow = (over: Record<string, unknown> = {}) => ({
  status: 'ACTIVE', billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', autoRenew: true,
  currentPeriodEnd: at(102), storeBonusMs: 2 * DAY, billingIssueAt: null, ...over,
});
const manualRow = (over: Record<string, unknown> = {}) => ({
  status: 'ACTIVE', billingChannel: 'MANUAL', storeProductId: null, autoRenew: false, currentPeriodEnd: at(2), storeBonusMs: null, ...over,
});

describe('storeCreditForPurchase', () => {
  it('no subscription: 0', () => {
    expect(storeCreditForPurchase(null, 'APP_STORE', NOW)).toBe(0);
  });

  it('a manual, trial or Lemon plan with days left: the days left', () => {
    expect(storeCreditForPurchase(manualRow(), 'APP_STORE', NOW)).toBe(2 * DAY);
    expect(storeCreditForPurchase(manualRow({ billingChannel: null, status: 'TRIAL', currentPeriodEnd: at(10) }), 'PLAY_STORE', NOW)).toBe(10 * DAY);
    expect(storeCreditForPurchase(manualRow({ billingChannel: 'LEMON', currentPeriodEnd: at(5) }), 'APP_STORE', NOW)).toBe(5 * DAY);
  });

  it('expired: 0', () => {
    expect(storeCreditForPurchase(manualRow({ currentPeriodEnd: at(-1) }), 'APP_STORE', NOW)).toBe(0);
    expect(storeCreditForPurchase(storeRow({ currentPeriodEnd: at(-1) }), 'APP_STORE', NOW)).toBe(0);
  });

  it('the same store subscription (renewal, upgrade): its credit, never the store days', () => {
    expect(storeCreditForPurchase(storeRow(), 'APP_STORE', NOW)).toBe(2 * DAY);
    expect(storeCreditForPurchase(storeRow({ storeBonusMs: null }), 'APP_STORE', NOW)).toBe(0);
  });

  it('the same store, charged late: what is left of the credit', () => {
    expect(storeCreditForPurchase(storeRow({ currentPeriodEnd: at(1) }), 'APP_STORE', NOW)).toBe(DAY);
  });

  it('the other store: the days left (that store never prorates them)', () => {
    expect(storeCreditForPurchase(storeRow({ autoRenew: false }), 'PLAY_STORE', NOW)).toBe(102 * DAY);
  });
});

describe('manualExtensionBilling', () => {
  it('an auto-renewing store plan: the extension joins the credit, the store fields stay', () => {
    const result = manualExtensionBilling(storeRow(), at(132), NOW);
    expect(result.keepsStore).toBe(true);
    expect(result.data).toEqual({ currentPeriodEnd: at(132), storeBonusMs: 32 * DAY });
  });

  it('a store plan with auto-renew off, still running: the same (Bật lại tự gia hạn keeps the days)', () => {
    const result = manualExtensionBilling(storeRow({ autoRenew: false }), at(132), NOW);
    expect(result.keepsStore).toBe(true);
    expect(result.data).toEqual({ currentPeriodEnd: at(132), storeBonusMs: 32 * DAY });
  });

  it('a store plan that ended: manual (A10)', () => {
    const result = manualExtensionBilling(storeRow({ currentPeriodEnd: at(-3), status: 'EXPIRED' }), at(30), NOW);
    expect(result.keepsStore).toBe(false);
    expect(result.data).toEqual({
      currentPeriodEnd: at(30), billingChannel: 'MANUAL', autoRenew: false, storeProductId: null, billingIssueAt: null, storeBonusMs: null,
    });
  });

  it('a manual plan: manual (A10)', () => {
    expect(manualExtensionBilling(manualRow(), at(32), NOW).keepsStore).toBe(false);
  });

  it('a Lemon plan: manual (phase 2 decides Lemon credit)', () => {
    expect(manualExtensionBilling(manualRow({ billingChannel: 'LEMON', autoRenew: true }), at(32), NOW).keepsStore).toBe(false);
  });
});

describe('storeRenewsAt', () => {
  it('auto-renewing store plan: the store date = end − credit', () => {
    expect(storeRenewsAt(storeRow(), NOW)?.toISOString()).toBe(at(100).toISOString());
    expect(storeRenewsAt(storeRow({ storeBonusMs: null }), NOW)?.toISOString()).toBe(at(102).toISOString());
  });

  it('null when nothing renews: auto-renew off, manual, Lemon, expired, billing issue', () => {
    expect(storeRenewsAt(storeRow({ autoRenew: false }), NOW)).toBeNull();
    expect(storeRenewsAt(manualRow(), NOW)).toBeNull();
    expect(storeRenewsAt(manualRow({ billingChannel: 'LEMON', autoRenew: true }), NOW)).toBeNull();
    expect(storeRenewsAt(storeRow({ currentPeriodEnd: at(-1) }), NOW)).toBeNull();
    expect(storeRenewsAt(storeRow({ billingIssueAt: at(-1) }), NOW)).toBeNull();
  });
});
