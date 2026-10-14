/**
 * #967 (owner 2026-10-14): Khách thân thiết (loyalty) is sold as a feature add-on, the #943 flow.
 * Loyalty is on when the plan includes it OR an un-ended `loyalty` feature add-on exists.
 * Money rules, written as numbers (price 79.000 / tháng): mid-period 79.000 ÷ 30 × 18 = 47.400; trial = 0; renewal
 * adds 79.000; turned off = on until the period end, not renewed, nothing refunded; change-plan credits the paid days.
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  addonPriceCreateSchema,
  addonRenewalLines,
  calculateAddonQuote,
} from '../../../packages/utils/src/core/addon-pricing';
import { calculatePlanChangeTotal, calculateRenewalTotal } from '../../../packages/utils/src/core/subscription-billing-calculations';
import {
  MODULES,
  MODULE_KEY,
  describeModuleSources,
  mergeModuleSources,
  planModuleKeys,
  resolveActiveModules,
} from '../../../packages/constants/src/modules';

// 12 Oct 00:00 VN → 11 Nov 00:00 VN = 30 Vietnam days; on 24 Oct 10:00 VN, 18 days are left
const start = new Date('2026-10-11T17:00:00Z');
const end = new Date('2026-11-10T17:00:00Z');
const now = new Date('2026-10-24T03:00:00Z');

const PLAN_WITH = JSON.stringify(['Quản lý đơn', 'loyalty']);
const PLAN_WITHOUT = JSON.stringify(['Quản lý đơn']);
const addonOn = { featureKey: 'loyalty', isActive: true, endsAt: null };
const active = (planFeatures: unknown, addons: any[], at: Date = now) =>
  resolveActiveModules(mergeModuleSources([], addons, at, planModuleKeys(planFeatures)), at);

describe('catalog (#967)', () => {
  it('loyalty is a module with no requirement, after attendance', () => {
    expect(MODULE_KEY.LOYALTY).toBe('loyalty');
    expect(MODULES).toEqual([
      { key: 'attendance', requires: [] },
      { key: 'loyalty', requires: [] },
    ]);
  });

  it('a price-list row "Khách thân thiết · Tính năng" is accepted (pack size 1)', () => {
    const ok = addonPriceCreateSchema.safeParse({ name: 'Khách thân thiết', limitKind: 'feature', featureKey: 'loyalty', packSize: 4, monthlyPrice: 79000 });
    expect(ok.success && ok.data).toMatchObject({ limitKind: 'feature', featureKey: 'loyalty', packSize: 1, monthlyPrice: 79000 });
  });

  it('planModuleKeys reads the plan features (array, JSON string, objects), nothing else', () => {
    expect(planModuleKeys(PLAN_WITH)).toEqual(['loyalty']);
    expect(planModuleKeys(['loyalty'])).toEqual(['loyalty']);
    expect(planModuleKeys([{ name: 'loyalty' }])).toEqual(['loyalty']);
    expect(planModuleKeys(PLAN_WITHOUT)).toEqual([]);
    expect(planModuleKeys(null)).toEqual([]);
    expect(planModuleKeys('not json')).toEqual([]);
  });
});

describe('loyalty on = plan OR un-ended add-on (#967)', () => {
  it('plan only → on (shops on a loyalty plan keep it, no add-on needed)', () => {
    expect(active(PLAN_WITH, [])).toEqual(['loyalty']);
  });

  it('add-on only → on', () => {
    expect(active(PLAN_WITHOUT, [addonOn])).toEqual(['loyalty']);
  });

  it('both → on once', () => {
    expect(active(PLAN_WITH, [addonOn])).toEqual(['loyalty']);
  });

  it('neither → off', () => {
    expect(active(PLAN_WITHOUT, [])).toEqual([]);
  });

  it('add-on ended (turned off, period over) → off; switched-off item → off', () => {
    expect(active(PLAN_WITHOUT, [{ ...addonOn, endsAt: new Date(now.getTime() - 1) }])).toEqual([]);
    expect(active(PLAN_WITHOUT, [{ ...addonOn, isActive: false }])).toEqual([]);
  });

  it('turned off from next period: still on until the period end, then off', () => {
    const off = [{ ...addonOn, endsAt: end }];
    expect(active(PLAN_WITHOUT, off, now)).toEqual(['loyalty']);
    const after = new Date(end.getTime() + 1000);
    expect(active(PLAN_WITHOUT, off, after)).toEqual([]);
  });

  it('loyalty and attendance are independent', () => {
    expect(active(PLAN_WITH, [{ featureKey: 'attendance', isActive: true, endsAt: null }])).toEqual(['attendance', 'loyalty']);
  });

  it('describeModuleSources says where each module comes from (admin "theo gói / theo add-on")', () => {
    const view = describeModuleSources({ rows: [], featureAddons: [addonOn], planFeatures: PLAN_WITH, now });
    expect(view).toEqual([
      { key: 'attendance', active: false, plan: false, addon: false, legacy: false },
      { key: 'loyalty', active: true, plan: true, addon: true, legacy: false },
    ]);
    const addonOnly = describeModuleSources({ rows: [], featureAddons: [addonOn], planFeatures: PLAN_WITHOUT, now });
    expect(addonOnly[1]).toEqual({ key: 'loyalty', active: true, plan: false, addon: true, legacy: false });
    const ended = describeModuleSources({ rows: [], featureAddons: [{ ...addonOn, endsAt: start }], planFeatures: PLAN_WITHOUT, now });
    expect(ended[1]).toEqual({ key: 'loyalty', active: false, plan: false, addon: false, legacy: false });
  });
});

describe('loyalty add-on money (#967, the #943 rules)', () => {
  it('mid-period: 79.000 ÷ 30 × 18 days left = 47.400', () => {
    const q = calculateAddonQuote({ monthlyPrice: 79000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', intervalCount: 1, status: 'ACTIVE', now });
    expect(q.remainingDays).toBe(18);
    expect(q.amountDue).toBe(47400);
  });

  it('trial: 0 now', () => {
    const q = calculateAddonQuote({ monthlyPrice: 79000, packs: 1, periodStart: start, periodEnd: end, status: 'TRIAL', now });
    expect(q).toMatchObject({ amountDue: 0, reason: 'trial' });
  });

  it('renewal: plan 199.000 + loyalty 79.000 = 278.000 for one month', () => {
    const item = { id: 21, addonPriceId: 6, featureKey: 'loyalty', limitKind: 'feature', packSize: 1, packs: 1, unitPrice: 79000, isActive: true };
    const { monthlyTotal } = addonRenewalLines([item], { 6: { id: 6, monthlyPrice: 79000, isActive: true, packSize: 1 } }, now);
    expect(monthlyTotal).toBe(79000);
    expect(calculateRenewalTotal({ basePrice: 199000, addonMonthlyTotal: monthlyTotal, interval: 'monthly', currentPeriodEnd: end, now }).totalDue).toBe(278000);
  });

  it('turned off: not renewed, nothing refunded', () => {
    const item = { id: 21, addonPriceId: 6, featureKey: 'loyalty', limitKind: 'feature', packSize: 1, packs: 1, unitPrice: 79000, isActive: true, removeAtPeriodEnd: true, endsAt: end };
    const { monthlyTotal, lines } = addonRenewalLines([item], { 6: { id: 6, monthlyPrice: 79000, isActive: true, packSize: 1 } }, now);
    expect(lines[0]).toMatchObject({ renew: false, monthlyAmount: 0 });
    expect(monthlyTotal).toBe(0);
  });

  it('change-plan: the paid loyalty add-on is credited for the days left (79.000 × 18 ÷ 30 = 47.400)', () => {
    const r = calculatePlanChangeTotal({
      subscription: { currentPeriodStart: start, currentPeriodEnd: end, billingInterval: 'monthly', plan: { basePrice: 199000 } } as any,
      newPlan: { basePrice: 399000 },
      selectedInterval: 'monthly',
      addonMonthlyTotal: 79000,
      paidAddonMonthlyTotal: 79000,
      now,
    });
    expect(Math.round(r.addonCreditValue)).toBe(47400);
  });
});
