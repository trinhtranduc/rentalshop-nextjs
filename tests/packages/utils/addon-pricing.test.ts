/**
 * #850: priced add-ons (owner decisions of 2026-10-11, last comment of #850).
 * - Catalog row = one limit kind + pack size + VND price per pack per month.
 * - Mid-period: price × packs × days left ÷ days of the period, on Vietnam civil days, whole VND.
 * - Effective limit = plan + Σ pack size × packs of the items that have not ended.
 * - Renewal: catalog price of today for items still on sale and not marked for removal.
 * Must give the same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  addonColumnsFor,
  addonRenewalLines,
  calculateAddonQuote,
  isAddonEnded,
  sumAddonLimits,
  addonPriceCreateSchema,
  addonPriceUpdateSchema,
  merchantAddonCreateSchema,
  merchantAddonUpdateSchema,
} from '../../../packages/utils/src/core/addon-pricing';
import { calculateRenewalTotal } from '../../../packages/utils/src/core/subscription-billing-calculations';

// Period of the mockup: 12 Oct 00:00 VN → 11 Nov 00:00 VN = 30 Vietnam days.
const start = new Date('2026-10-11T17:00:00Z');
const end = new Date('2026-11-10T17:00:00Z');

describe('calculateAddonQuote (monthly period)', () => {
  it('mockup: 1 pack of +2 users at 40,000, 18 of 30 days left = 24,000', () => {
    const q = calculateAddonQuote({ monthlyPrice: 40000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', intervalCount: 1, status: 'ACTIVE', now: new Date('2026-10-24T03:00:00Z') });
    expect(q).toMatchObject({ periodDays: 30, remainingDays: 18, monthlyAmount: 40000, amountDue: 24000, reason: 'prorated' });
  });

  it('2 packs at 30,000 with 22 of 30 days left = 44,000', () => {
    const q = calculateAddonQuote({ monthlyPrice: 30000, packs: 2, periodStart: start, periodEnd: end, interval: 'monthly', status: 'ACTIVE', now: new Date('2026-10-20T05:00:00Z') });
    expect(q.remainingDays).toBe(22);
    expect(q.monthlyAmount).toBe(60000);
    expect(q.amountDue).toBe(44000);
  });

  it('counts on the Vietnam day: 23:59 VN on 24 Oct still has 18 days, 00:00 VN on 25 Oct has 17', () => {
    const late = calculateAddonQuote({ monthlyPrice: 40000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', status: 'ACTIVE', now: new Date('2026-10-24T16:59:59Z') });
    const next = calculateAddonQuote({ monthlyPrice: 40000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', status: 'ACTIVE', now: new Date('2026-10-24T17:00:00Z') });
    expect(late.remainingDays).toBe(18);
    expect(next.remainingDays).toBe(17);
    // 40,000 × 17 / 30 = 22,666.67 → whole VND
    expect(next.amountDue).toBe(22667);
    expect(Number.isInteger(next.amountDue)).toBe(true);
  });

  it('first day of the period: the full monthly price', () => {
    const q = calculateAddonQuote({ monthlyPrice: 30000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', status: 'ACTIVE', now: new Date('2026-10-12T01:00:00Z') });
    expect(q.remainingDays).toBe(30);
    expect(q.amountDue).toBe(30000);
  });

  it('ended period: nothing to charge now', () => {
    const q = calculateAddonQuote({ monthlyPrice: 30000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', status: 'ACTIVE', now: new Date('2026-11-12T01:00:00Z') });
    expect(q).toMatchObject({ remainingDays: 0, amountDue: 0, reason: 'ended' });
  });

  it('trial shop: nothing to charge now', () => {
    const q = calculateAddonQuote({ monthlyPrice: 30000, packs: 1, periodStart: start, periodEnd: end, interval: 'month', status: 'TRIAL', now: new Date('2026-10-24T03:00:00Z') });
    expect(q).toMatchObject({ remainingDays: 18, amountDue: 0, reason: 'trial' });
  });
});

describe('calculateAddonQuote (longer periods: the cycle price, with the renewal discount)', () => {
  it('annual (10 % off): 30,000 × 12 × 0.9 × days left / days', () => {
    const yStart = new Date('2026-09-30T17:00:00Z'); // 1 Oct 2026 VN
    const yEnd = new Date('2027-09-30T17:00:00Z'); // 1 Oct 2027 VN = 365 days
    const q = calculateAddonQuote({ monthlyPrice: 30000, packs: 1, periodStart: yStart, periodEnd: yEnd, interval: 'month', intervalCount: 12, status: 'ACTIVE', now: new Date('2027-03-31T03:00:00Z') });
    expect(q.periodDays).toBe(365);
    expect(q.remainingDays).toBe(184);
    expect(q.cyclePrice).toBe(324000);
    expect(q.amountDue).toBe(Math.round((324000 * 184) / 365));
  });

  it('quarterly (no discount): 3 months of price prorated', () => {
    const qStart = new Date('2026-09-30T17:00:00Z'); // 1 Oct VN
    const qEnd = new Date('2026-12-31T17:00:00Z'); // 1 Jan VN = 92 days
    const q = calculateAddonQuote({ monthlyPrice: 20000, packs: 2, periodStart: qStart, periodEnd: qEnd, interval: 'quarterly', status: 'ACTIVE', now: new Date('2026-11-01T03:00:00Z') });
    expect(q.periodDays).toBe(92);
    expect(q.remainingDays).toBe(61);
    expect(q.cyclePrice).toBe(120000);
    expect(q.amountDue).toBe(Math.round((120000 * 61) / 92));
  });
});

describe('add-on limits', () => {
  const now = new Date('2026-10-24T03:00:00Z');
  it('addonColumnsFor puts pack size × packs in the one column of its kind', () => {
    expect(addonColumnsFor('users', 2, 3)).toEqual({ outlets: 0, users: 6, products: 0, customers: 0, orders: 0 });
    expect(addonColumnsFor('outlets', 1, 1)).toEqual({ outlets: 1, users: 0, products: 0, customers: 0, orders: 0 });
  });

  it('an item has ended when inactive or its end has passed; marked items count until then', () => {
    expect(isAddonEnded({ isActive: true, endsAt: null }, now)).toBe(false);
    expect(isAddonEnded({ isActive: true, endsAt: end }, now)).toBe(false);
    expect(isAddonEnded({ isActive: true, endsAt: new Date('2026-10-24T02:59:59Z') }, now)).toBe(true);
    expect(isAddonEnded({ isActive: false, endsAt: null }, now)).toBe(true);
  });

  it('sums the columns of items that have not ended', () => {
    const total = sumAddonLimits([
      { isActive: true, outlets: 0, users: 2, products: 0, customers: 0, orders: 0 },
      { isActive: true, outlets: 0, users: 1, products: 0, customers: 0, orders: 0, endsAt: end },
      { isActive: true, outlets: 1, users: 0, products: 0, customers: 0, orders: 0, endsAt: new Date('2026-10-01T00:00:00Z') },
      { isActive: false, outlets: 0, users: 9, products: 0, customers: 0, orders: 0 },
      { isActive: true, outlets: 0, users: 0, products: 100, customers: 0, orders: 0 },
    ], now);
    expect(total).toEqual({ outlets: 0, users: 3, products: 100, customers: 0, orders: 0 });
  });
});

describe('addonRenewalLines', () => {
  const now = new Date('2026-10-24T03:00:00Z');
  const catalog = {
    1: { id: 1, monthlyPrice: 35000, isActive: true }, // price raised from 30,000
    2: { id: 2, monthlyPrice: 40000, isActive: false }, // paused
    3: { id: 3, monthlyPrice: 150000, isActive: true },
  };

  it('renews at today\'s catalog price; paused rows and marked items are not renewed; old free items stay free', () => {
    const { lines, monthlyTotal } = addonRenewalLines([
      { id: 10, addonPriceId: 1, packs: 2, unitPrice: 30000, isActive: true },
      { id: 11, addonPriceId: 2, packs: 1, unitPrice: 40000, isActive: true },
      { id: 12, addonPriceId: 3, packs: 1, unitPrice: 150000, isActive: true, removeAtPeriodEnd: true, endsAt: end },
      { id: 13, addonPriceId: null, packs: 1, unitPrice: null, isActive: true },
      { id: 14, addonPriceId: 1, packs: 1, unitPrice: 30000, isActive: true, endsAt: new Date('2026-10-01T00:00:00Z') },
    ], catalog, now);
    expect(lines.map((l) => [l.id, l.renew, l.unitPrice, l.monthlyAmount])).toEqual([
      [10, true, 35000, 70000],
      [11, false, 40000, 0],
      [12, false, 150000, 0],
      [13, true, 0, 0],
    ]);
    expect(monthlyTotal).toBe(70000);
  });

  it('feeds the renewal total with the cycle discount (plan 399,000 + add-ons 40,000 monthly)', () => {
    const { monthlyTotal } = addonRenewalLines([{ id: 1, addonPriceId: 3, packs: 1, unitPrice: 40000, isActive: true }], { 3: { id: 3, monthlyPrice: 40000, isActive: true } }, now);
    const r = calculateRenewalTotal({ basePrice: 399000, addonMonthlyTotal: monthlyTotal, interval: 'monthly', currentPeriodEnd: end, now });
    expect(r.totalDue).toBe(439000);
    const y = calculateRenewalTotal({ basePrice: 399000, addonMonthlyTotal: monthlyTotal, interval: 'annual', currentPeriodEnd: end, now });
    expect(y.addonPrice).toBe(Math.round(40000 * 12 * 0.9));
  });
});

describe('zod schemas', () => {
  it('catalog row: name, one of five kinds, integer pack size ≥ 1, integer VND price ≥ 0', () => {
    expect(addonPriceCreateSchema.safeParse({ name: 'Thêm nhân viên', limitKind: 'users', packSize: 1, monthlyPrice: 30000 }).success).toBe(true);
    expect(addonPriceCreateSchema.safeParse({ name: '', limitKind: 'users', packSize: 1, monthlyPrice: 30000 }).success).toBe(false);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'loyalty', packSize: 1, monthlyPrice: 30000 }).success).toBe(false);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'users', packSize: 0, monthlyPrice: 30000 }).success).toBe(false);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'users', packSize: 1, monthlyPrice: -1 }).success).toBe(false);
    expect(addonPriceCreateSchema.safeParse({ name: 'x', limitKind: 'users', packSize: 1, monthlyPrice: 1.5 }).success).toBe(false);
  });

  it('catalog edit never changes the kind', () => {
    const parsed = addonPriceUpdateSchema.parse({ monthlyPrice: 35000, limitKind: 'outlets' });
    expect(parsed).toEqual({ monthlyPrice: 35000 });
  });

  it('adding to a shop takes a catalog row and a whole number of packs; a price in the body is ignored', () => {
    const parsed = merchantAddonCreateSchema.parse({ addonPriceId: 3, packs: 2, unitPrice: 1, monthlyPrice: 1 });
    expect(parsed).toEqual({ addonPriceId: 3, packs: 2 });
    expect(merchantAddonCreateSchema.safeParse({ addonPriceId: 3, packs: 0 }).success).toBe(false);
    expect(merchantAddonCreateSchema.safeParse({ addonPriceId: 3, packs: 1.5 }).success).toBe(false);
    expect(merchantAddonUpdateSchema.safeParse({ removeAtPeriodEnd: true }).success).toBe(true);
    expect(merchantAddonUpdateSchema.safeParse({}).success).toBe(false);
  });
});
