/**
 * #782 gap 1: a price-list row with `packSize = 1` means "price of one unit", and the number admin types goes in `packs`.
 * +100 products = 100 × the row's price, with no new column. Renewal keeps +100 because the row stays at 1.
 * Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  addonColumnsFor,
  addonQuoteQuerySchema,
  addonRenewalLines,
  addonUnitsFit,
  calculateAddonQuote,
  MAX_ADDON_PACKS,
  merchantAddonCreateSchema,
  merchantAddonUpdateSchema,
} from '../../../packages/utils/src/core/addon-pricing';
import { isBasicPlanName } from '../../../packages/utils/src/core/plan-addon-rules';

const start = new Date('2026-10-15T03:00:00Z');
const end = new Date('2026-11-15T03:00:00Z');
const now = new Date('2026-10-31T03:00:00Z'); // 15 Vietnam days left
const quote = (monthlyPrice: number, packs: number) =>
  calculateAddonQuote({ monthlyPrice, packs, periodStart: start, periodEnd: end, interval: 'month', intervalCount: 1, status: 'ACTIVE', now });

describe('typed amount on a packSize = 1 row (#782)', () => {
  it('+100 products at 500 ₫ a product: 50,000 ₫ a month, 25,000 ₫ now, limit +100', () => {
    const q = quote(500, 100);
    expect(q).toMatchObject({ remainingDays: 15, monthlyAmount: 50000, amountDue: 25000, reason: 'prorated' });
    expect(addonColumnsFor('products', 1, 100)).toEqual({ outlets: 0, users: 0, products: 100, customers: 0, orders: 0 });
  });

  it('+500 orders at 100 ₫ an order: 50,000 ₫ a month, 25,000 ₫ now, limit +500', () => {
    const q = quote(100, 500);
    expect(q).toMatchObject({ monthlyAmount: 50000, amountDue: 25000 });
    expect(addonColumnsFor('orders', 1, 500).orders).toBe(500);
  });

  const row = { id: 3, monthlyPrice: 500, isActive: true, packSize: 1 };
  const item = { id: 30, addonPriceId: 3, limitKind: 'products', packSize: 1, packs: 100, unitPrice: 500, isActive: true };

  it('renewal keeps +100 at the list price', () => {
    const { lines, monthlyTotal } = addonRenewalLines([item], { 3: row }, now);
    expect(lines[0]).toMatchObject({ renew: true, packs: 100, packSize: 1, monthlyAmount: 50000 });
    expect(monthlyTotal).toBe(50000);
  });

  it('a list price change applies at renewal, on the same amount', () => {
    const { lines } = addonRenewalLines([item], { 3: { ...row, monthlyPrice: 600 } }, now);
    expect(lines[0]).toMatchObject({ packs: 100, monthlyAmount: 60000, paidMonthlyAmount: 50000 });
  });

  it('a pending reduction applies at renewal: +100 → +60', () => {
    const { lines } = addonRenewalLines([{ ...item, nextPacks: 60 }], { 3: row }, now);
    expect(lines[0]).toMatchObject({ packs: 60, monthlyAmount: 30000 });
    expect(addonColumnsFor('products', 1, lines[0].packs).products).toBe(60);
  });

  it('an older row with a larger pack keeps working: 2 packs of 100 = +200', () => {
    expect(addonColumnsFor('products', 100, 2).products).toBe(200);
    const { lines } = addonRenewalLines([{ ...item, packSize: 100, packs: 2, unitPrice: 50000 }], { 3: { ...row, packSize: 100, monthlyPrice: 50000 } }, now);
    expect(lines[0]).toMatchObject({ packs: 2, packSize: 100, monthlyAmount: 100000 });
  });
});

describe('packs maximum is 100,000 on the three schemas (#782)', () => {
  it('the constant is 100,000', () => {
    expect(MAX_ADDON_PACKS).toBe(100000);
  });

  it.each([
    ['create', (packs: number) => merchantAddonCreateSchema.safeParse({ addonPriceId: 1, packs })],
    ['update', (packs: number) => merchantAddonUpdateSchema.safeParse({ packs })],
    ['quote', (packs: number) => addonQuoteQuerySchema.safeParse({ addonPriceId: 1, packs })],
  ])('%s: accepts 1,001 and 100,000, refuses 100,001 and 0', (_name, parse) => {
    expect(parse(1001).success).toBe(true);
    expect(parse(100000).success).toBe(true);
    expect(parse(100001).success).toBe(false);
    expect(parse(0).success).toBe(false);
  });
});

describe('addonUnitsFit: the kind column is a 32-bit Int', () => {
  it('a unit row always fits at the maximum', () => {
    expect(addonUnitsFit(1, 100000)).toBe(true);
  });

  it('a very large pack × a large typed number does not fit', () => {
    expect(addonUnitsFit(1000000, 100000)).toBe(false);
    expect(addonUnitsFit(1000000, 1000)).toBe(true);
    expect(addonUnitsFit(1000000, 2147)).toBe(true);
    expect(addonUnitsFit(1000000, 2148)).toBe(false);
  });
});

describe('isBasicPlanName: same rule as the RevenueCat webhook (name contains "basic", any case)', () => {
  it.each(['Basic', 'basic', ' BASIC ', 'Gói Basic'])('%s is Basic', (name) => {
    expect(isBasicPlanName(name)).toBe(true);
  });

  it.each(['Trial', 'Professional', 'Enterprise', '', null, undefined])('%s is not Basic', (name) => {
    expect(isBasicPlanName(name)).toBe(false);
  });
});
