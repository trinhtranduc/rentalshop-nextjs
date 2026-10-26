/**
 * #870 (owner 2026-10-11): every manual path that starts or extends a paid period charges plan + renewed add-ons,
 * through `addonRenewalLines`. A catalog row's pack size, like its price, applies from the next renewal.
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { addonRenewalLines } from '../../../packages/utils/src/core/addon-pricing';
import {
  calculateExtensionTotal,
  calculatePlanChangeTotal,
} from '../../../packages/utils/src/core/subscription-billing-calculations';
import { calculateSubscriptionPrice } from '../../../packages/utils/src/core/pricing-calculator';

// 12 Oct 00:00 VN → 11 Nov 00:00 VN = 30 Vietnam days
const start = new Date('2026-10-11T17:00:00Z');
const end = new Date('2026-11-10T17:00:00Z');
const now = new Date('2026-10-24T03:00:00Z'); // 18 of 30 days left

describe('addonRenewalLines (#870)', () => {
  const catalog = {
    1: { id: 1, monthlyPrice: 40000, isActive: true, packSize: 3 }, // pack size raised from 2 to 3
    2: { id: 2, monthlyPrice: 20000, isActive: false, packSize: 100 }, // paused
  };
  const items = [
    { id: 10, addonPriceId: 1, packs: 2, unitPrice: 35000, packSize: 2, limitKind: 'users', users: 4, isActive: true },
    { id: 11, addonPriceId: 2, packs: 1, unitPrice: 20000, packSize: 100, limitKind: 'products', products: 100, isActive: true },
    { id: 12, addonPriceId: null, packs: 1, unitPrice: null, users: 1, isActive: true },
  ];

  it('a renewed item takes the current pack size; the others keep theirs', () => {
    const { lines } = addonRenewalLines(items as any, catalog as any, now);
    expect(lines.map((l: any) => [l.id, l.renew, l.packSize, l.limitKind])).toEqual([
      [10, true, 3, 'users'],
      [11, false, 100, 'products'],
      [12, true, null, null],
    ]);
  });

  it('paidMonthlyTotal = captured price × packs of the renewed items (what the current period was paid at)', () => {
    const r = addonRenewalLines(items as any, catalog as any, now);
    expect(r.monthlyTotal).toBe(80000);
    expect(r.paidMonthlyTotal).toBe(70000);
  });
});

describe('calculateExtensionTotal with add-ons (#870)', () => {
  it('extension = plan part + add-on part, same formula; extensionPrice stays the plan part', () => {
    const e = calculateExtensionTotal({ oldEndDate: end, newEndDate: new Date('2026-11-20T17:00:00Z'), plan: { basePrice: 300000 }, addonMonthlyTotal: 60000, selectedInterval: 'monthly' });
    // 10 Vietnam days of a 30-day month (11 Nov → 11 Dec VN)
    expect(e.extensionDays).toBe(10);
    expect(e.selectedIntervalDays).toBe(30);
    expect(e.extensionPrice).toBeCloseTo(100000, 6);
    expect(e.addonPrice).toBeCloseTo(20000, 6);
    expect(e.totalDue).toBeCloseTo(120000, 6);
  });

  it('without add-ons nothing changes', () => {
    const e = calculateExtensionTotal({ oldEndDate: end, newEndDate: new Date('2026-11-20T17:00:00Z'), plan: { basePrice: 300000 }, selectedInterval: 'monthly' });
    expect(e.addonPrice).toBe(0);
    expect(e.totalDue).toBeCloseTo(e.extensionPrice, 6);
  });
});

describe('calculatePlanChangeTotal with add-ons (#870)', () => {
  const subscription = { currentPeriodStart: start, currentPeriodEnd: end, billingInterval: 'monthly', plan: { basePrice: 300000 } } as any;

  it('due = new plan + add-on cycle − plan credit − add-on credit for the paid days left', () => {
    const c = calculatePlanChangeTotal({ subscription, newPlan: { basePrice: 399000 }, selectedInterval: 'quarterly', addonMonthlyTotal: 40000, paidAddonMonthlyTotal: 30000, now });
    const addonCycle = calculateSubscriptionPrice({ basePrice: 40000 } as any, 'quarterly');
    expect(c.addonPeriodPrice).toBe(addonCycle);
    expect(c.addonCreditValue).toBeCloseTo((18 / 30) * 30000, 6);
    expect(c.totalDue).toBeCloseTo(c.newPlanPeriodPrice + addonCycle - c.remainingCreditValue - c.addonCreditValue, 6);
  });

  it('a trial shop gets no add-on credit (nothing was paid)', () => {
    const c = calculatePlanChangeTotal({ subscription: { ...subscription, status: 'TRIAL' }, newPlan: { basePrice: 399000 }, selectedInterval: 'monthly', addonMonthlyTotal: 40000, paidAddonMonthlyTotal: 40000, now });
    expect(c.addonCreditValue).toBe(0);
    expect(c.addonPeriodPrice).toBe(40000);
  });

  it('without add-ons nothing changes', () => {
    const a = calculatePlanChangeTotal({ subscription, newPlan: { basePrice: 399000 }, selectedInterval: 'monthly', now });
    expect(a.addonPeriodPrice).toBe(0);
    expect(a.addonCreditValue).toBe(0);
    expect(a.totalDue).toBeCloseTo(Math.max(0, 399000 - a.remainingCreditValue), 6);
  });
});

describe('fewer packs wait for the next period (#870)', () => {
  it('a renewed item with nextPacks renews (and is charged) for nextPacks', () => {
    const { lines, monthlyTotal } = addonRenewalLines(
      [{ id: 20, addonPriceId: 1, packs: 3, nextPacks: 1, unitPrice: 40000, packSize: 2, limitKind: 'users', isActive: true }] as any,
      { 1: { id: 1, monthlyPrice: 40000, isActive: true, packSize: 2 } } as any,
      now
    );
    expect(lines[0]).toMatchObject({ id: 20, renew: true, packs: 1, monthlyAmount: 40000 });
    expect(monthlyTotal).toBe(40000);
  });
});

describe('schemas and guard (#870)', () => {
  const { merchantAddonUpdateSchema } = jest.requireActual('../../../packages/utils/src/core/addon-pricing');
  const { outletAddonsBlockPlan } = jest.requireActual('../../../packages/utils/src/core/plan-addon-rules');

  it('PATCH takes removeAtPeriodEnd or a whole number of packs (1..1000)', () => {
    expect(merchantAddonUpdateSchema.safeParse({ removeAtPeriodEnd: true }).success).toBe(true);
    expect(merchantAddonUpdateSchema.safeParse({ packs: 3, method: 'TRANSFER', transactionId: 'T1' }).success).toBe(true);
    expect(merchantAddonUpdateSchema.safeParse({ packs: 0 }).success).toBe(false);
    expect(merchantAddonUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('never blocks a plan switch (#1187 extra outlets are allowed on any plan)', () => {
    const single = { outlets: 1 };
    const multi = { outlets: 3 };
    const branch = { id: 1, outlets: 1, isActive: true };
    expect(outletAddonsBlockPlan([branch], single, now)).toBe(false);
    expect(outletAddonsBlockPlan([branch], multi, now)).toBe(false);
    expect(outletAddonsBlockPlan([{ ...branch, removeAtPeriodEnd: true, endsAt: end }], single, now)).toBe(false);
    expect(outletAddonsBlockPlan([{ ...branch, isActive: false }], single, now)).toBe(false);
    expect(outletAddonsBlockPlan([{ id: 2, users: 2, isActive: true }], single, now)).toBe(false);
    expect(outletAddonsBlockPlan([branch], JSON.stringify({ outlets: -1 }), now)).toBe(false);
  });
});
