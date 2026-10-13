/**
 * #943 (owner 2026-10-13): the attendance module is sold as a "feature" add-on (no packs, a featureKey).
 * Money rules, written as numbers: mid-period charge 99.000 ÷ 30 × 18 = 59.400; trial = 0; renewal adds the feature
 * price; turning off ends at the period end (not renewed, no refund); a price edit applies from the next renewal;
 * change-plan credits the paid feature for the days left.
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  addonColumnsFor,
  addonPriceCreateSchema,
  addonPriceUpdateSchema,
  addonRenewalLines,
  calculateAddonQuote,
  FEATURE_KIND,
  isFeatureAddon,
  merchantAddonCreateSchema,
  sumAddonLimits,
} from '../../../packages/utils/src/core/addon-pricing';
import { calculatePlanChangeTotal, calculateRenewalTotal } from '../../../packages/utils/src/core/subscription-billing-calculations';
import { mergeModuleSources, resolveActiveModules } from '../../../packages/constants/src/modules';

// 12 Oct 00:00 VN → 11 Nov 00:00 VN = 30 Vietnam days; on 24 Oct 10:00 VN, 18 days are left
const start = new Date('2026-10-11T17:00:00Z');
const end = new Date('2026-11-10T17:00:00Z');
const now = new Date('2026-10-24T03:00:00Z');

const feature = { id: 20, addonPriceId: 5, featureKey: 'attendance', limitKind: 'feature', packSize: 1, packs: 1, unitPrice: 99000, isActive: true };

describe('feature add-on: price list schema (#943)', () => {
  it('a feature row needs a known featureKey and stores pack size 1', () => {
    const ok = addonPriceCreateSchema.safeParse({ name: 'Chấm công', limitKind: 'feature', featureKey: 'attendance', monthlyPrice: 99000 });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data).toMatchObject({ limitKind: 'feature', featureKey: 'attendance', packSize: 1, monthlyPrice: 99000 });

    const sized = addonPriceCreateSchema.safeParse({ name: 'Chấm công', limitKind: 'feature', featureKey: 'attendance', packSize: 5, monthlyPrice: 99000 });
    expect(sized.success && sized.data.packSize).toBe(1);

    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'feature', monthlyPrice: 1 }).success).toBe(false);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'feature', featureKey: 'payroll', monthlyPrice: 1 }).success).toBe(false);
  });

  it('a limit row keeps its rules and cannot carry a featureKey', () => {
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'users', packSize: 2, monthlyPrice: 40000 }).success).toBe(true);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'users', packSize: 0, monthlyPrice: 1 }).success).toBe(false);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'users', featureKey: 'attendance', packSize: 1, monthlyPrice: 1 }).success).toBe(false);
  });

  it('the featureKey is not editable (dropped from an update)', () => {
    const parsed = addonPriceUpdateSchema.safeParse({ monthlyPrice: 120000, featureKey: 'payroll' });
    expect(parsed.success && parsed.data).toEqual({ monthlyPrice: 120000 });
  });

  it('a purchase may be paid by transfer or cash', () => {
    expect(merchantAddonCreateSchema.safeParse({ addonPriceId: 5, packs: 1, method: 'CASH' }).success).toBe(true);
    expect(merchantAddonCreateSchema.safeParse({ addonPriceId: 5, packs: 1, method: 'PAYPAL' }).success).toBe(false);
  });
});

describe('feature add-on: no limit columns (#943)', () => {
  it('addonColumnsFor a feature is all zeros, so the limit check does not change', () => {
    expect(addonColumnsFor(FEATURE_KIND as any, 1, 1)).toEqual({ outlets: 0, users: 0, products: 0, customers: 0, orders: 0 });
    expect(sumAddonLimits([{ ...feature, outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }], now)).toEqual({
      outlets: 0, users: 0, products: 0, customers: 0, orders: 0,
    });
  });

  it('isFeatureAddon tells a feature item / row from a limit one', () => {
    expect(isFeatureAddon(feature)).toBe(true);
    expect(isFeatureAddon({ limitKind: 'users', featureKey: null })).toBe(false);
    expect(isFeatureAddon({ limitKind: null })).toBe(false);
  });
});

describe('feature add-on: money (#943)', () => {
  it('mid-period: 99.000 ÷ 30 × 18 days left = 59.400', () => {
    const q = calculateAddonQuote({ monthlyPrice: 99000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', intervalCount: 1, status: 'ACTIVE', now });
    expect(q.remainingDays).toBe(18);
    expect(q.amountDue).toBe(59400);
    expect(q.reason).toBe('prorated');
  });

  it('trial: 0 now', () => {
    const q = calculateAddonQuote({ monthlyPrice: 99000, packs: 1, periodStart: start, periodEnd: end, status: 'TRIAL', now });
    expect(q).toMatchObject({ amountDue: 0, reason: 'trial' });
  });

  it('6-month cycle: the 5% cycle discount applies before ÷ 30 (94.050 ÷ 30 × 18 = 56.430)', () => {
    const q = calculateAddonQuote({ monthlyPrice: 99000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', intervalCount: 6, status: 'ACTIVE', now });
    expect(q.amountDue).toBe(56430);
  });

  it('renewal adds the feature price: plan 399.000 + 99.000 = 498.000 for one month', () => {
    const { monthlyTotal, lines } = addonRenewalLines([feature], { 5: { id: 5, monthlyPrice: 99000, isActive: true, packSize: 1 } }, now);
    expect(lines[0]).toMatchObject({ renew: true, packs: 1, unitPrice: 99000, monthlyAmount: 99000 });
    expect(monthlyTotal).toBe(99000);
    const r = calculateRenewalTotal({ basePrice: 399000, addonMonthlyTotal: monthlyTotal, interval: 'monthly', currentPeriodEnd: end, now });
    expect(r.totalDue).toBe(498000);
  });

  it('a price edit (99.000 → 120.000) applies from the next renewal; the current period stays paid at 99.000', () => {
    const { monthlyTotal, paidMonthlyTotal } = addonRenewalLines([feature], { 5: { id: 5, monthlyPrice: 120000, isActive: true, packSize: 1 } }, now);
    expect(monthlyTotal).toBe(120000);
    expect(paidMonthlyTotal).toBe(99000);
  });

  it('turned off ("Tắt từ kỳ sau"): still on until the period end, not renewed, nothing refunded', () => {
    const off = { ...feature, removeAtPeriodEnd: true, endsAt: end };
    const { lines, monthlyTotal } = addonRenewalLines([off], { 5: { id: 5, monthlyPrice: 99000, isActive: true, packSize: 1 } }, now);
    expect(lines[0]).toMatchObject({ renew: false, monthlyAmount: 0 });
    expect(monthlyTotal).toBe(0);
    // the module stays on until the end, then goes off
    const source = (at: Date) => mergeModuleSources([], [{ featureKey: 'attendance', isActive: true, endsAt: off.endsAt }], at);
    expect(resolveActiveModules(source(now), now)).toEqual(['attendance']);
    const after = new Date(end.getTime() + 1000);
    expect(resolveActiveModules(source(after), after)).toEqual([]);
  });

  it('change-plan: the paid feature is credited for the days left (99.000 × 18 ÷ 30 = 59.400), 0 in trial', () => {
    const base = {
      subscription: { currentPeriodStart: start, currentPeriodEnd: end, billingInterval: 'monthly', plan: { basePrice: 399000 } } as any,
      newPlan: { basePrice: 599000 },
      selectedInterval: 'monthly',
      addonMonthlyTotal: 99000,
      paidAddonMonthlyTotal: 99000,
      now,
    };
    const paid = calculatePlanChangeTotal(base);
    expect(paid.addonPeriodPrice).toBe(99000);
    expect(Math.round(paid.addonCreditValue)).toBe(59400);
    const trial = calculatePlanChangeTotal({ ...base, subscription: { ...base.subscription, status: 'TRIAL' } });
    expect(trial.addonCreditValue).toBe(0);
  });
});

describe('module active = legacy row OR un-ended feature add-on (#943)', () => {
  it('a legacy MerchantModule row still counts', () => {
    const rows = mergeModuleSources([{ key: 'attendance', enabled: true, endsAt: null }], [], now);
    expect(resolveActiveModules(rows, now)).toEqual(['attendance']);
  });

  it('an un-ended feature add-on turns the module on even with the legacy row off', () => {
    const rows = mergeModuleSources(
      [{ key: 'attendance', enabled: false, endsAt: null }],
      [{ featureKey: 'attendance', isActive: true, endsAt: null }],
      now
    );
    expect(resolveActiveModules(rows, now)).toEqual(['attendance']);
  });

  it('a switched-off or ended feature add-on does not; nor does a limit add-on or an unknown key', () => {
    const rows = mergeModuleSources(
      [],
      [
        { featureKey: 'attendance', isActive: false, endsAt: null },
        { featureKey: 'attendance', isActive: true, endsAt: new Date(now.getTime() - 1) },
        { featureKey: null, isActive: true, endsAt: null },
        { featureKey: 'payroll', isActive: true, endsAt: null },
      ],
      now
    );
    expect(resolveActiveModules(rows, now)).toEqual([]);
  });
});
