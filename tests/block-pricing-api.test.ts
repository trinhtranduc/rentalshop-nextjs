/**
 * #1189 server-side pieces of day-block pricing, without HTTP: product option normalizing, what an old client sees,
 * which order lines are BLOCK lines, and the PUT /api/orders/[orderId] repricing.
 */
// The order lib needs only these two helpers of @rentalshop/utils (the package index pulls in React helpers)
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../packages/utils/src/core/block-pricing'),
  parseProductImages: () => [],
  countRentalDays: jest.requireActual('../packages/utils/src/core/rental-days').countRentalDays,
}));

import { normalizePricingOptions } from '../packages/database/src/product-pricing-normalize';
import golden from './fixtures/block-pricing-golden.json';
import { isCompleteBlockTable } from '../packages/utils/src/core/block-pricing';
import { blockOptionsIssue } from '../apps/api/lib/block-options-issue';
import { pricingOptionsForClient, productForClient } from '../apps/api/lib/block-pricing-legacy';
import { hasCapability, getClientCapabilities } from '../apps/api/lib/client-capabilities';
import { toPublicProduct } from '../apps/api/lib/public-product';
import {
  findBlockOption,
  priceBlockLine,
  readOldAppsMode,
  repriceOrderEdit,
  tableOf,
  totalAfterReprice,
} from '../apps/api/lib/order-block-pricing';

const BLOCK = { id: 31, type: 'BLOCK', price: 80000, isDefault: true, isActive: true, blockTiers: [80000, 100000, 120000], blockStartDay: null, blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000 };
const FIXED = { id: 32, type: 'FIXED', price: 50000, isDefault: false, isActive: true };
const DAILY = { id: 33, type: 'DAILY', price: 30000, isDefault: false, isActive: true };
const req = (value?: string) => ({ headers: { get: (n: string) => (n.toLowerCase() === 'x-client-capabilities' && value !== undefined ? value : null) } });

describe('normalizePricingOptions with a BLOCK option', () => {
  const sent = { type: 'BLOCK', price: 1, blockTiers: [80000, 100000], blockStartDay: 1, blockExtraMode: 'HOLD_LAST', isDefault: true };

  it('drops BLOCK unless the caller allows it (an old client)', () => {
    expect(normalizePricingOptions([sent, { type: 'FIXED', price: 5 }])).toEqual([
      { type: 'FIXED', price: 5, unit: null, blockSize: null, isDefault: true, isActive: true, sortOrder: 0 },
    ]);
  });

  it('keeps it for pricingSchemaVersion 2: price = day-1 price, table stored', () => {
    const [block] = normalizePricingOptions([sent], { allowBlock: true });
    expect(block).toMatchObject({ type: 'BLOCK', price: 80000, blockTiers: [80000, 100000], blockStartDay: null, blockExtraMode: 'HOLD_LAST', blockExtraPrice: null, isDefault: true });
  });

  it('FIXED / DAILY options keep exactly the old keys', () => {
    const [fixed] = normalizePricingOptions([{ type: 'FIXED', price: 5 }], { allowBlock: true });
    expect(Object.keys(fixed).sort()).toEqual(['blockSize', 'isActive', 'isDefault', 'price', 'sortOrder', 'type', 'unit']);
  });

  it('keeps one BLOCK option and drops a broken one', () => {
    expect(normalizePricingOptions([sent, sent], { allowBlock: true })).toHaveLength(1);
    expect(normalizePricingOptions([{ ...sent, blockTiers: [] }], { allowBlock: true })).toEqual([]);
    expect(normalizePricingOptions([{ ...sent, blockTiers: [-1] }], { allowBlock: true })).toEqual([]);
    expect(normalizePricingOptions([{ ...sent, blockExtraMode: 'X' }], { allowBlock: true })).toEqual([]);
  });

  it('a BLOCK option next to FIXED / DAILY', () => {
    const list = normalizePricingOptions([{ type: 'FIXED', price: 5, isDefault: true }, sent, { type: 'DAILY', price: 9 }], { allowBlock: true });
    expect(list.map((o) => o.type)).toEqual(['FIXED', 'BLOCK', 'DAILY']);
    expect(list.filter((o) => o.isDefault)).toHaveLength(1);
  });
});

describe('blockOptionsIssue (product save of a pricingSchemaVersion 2 client)', () => {
  it.each([
    [[], undefined, null],
    [[{ type: 'BLOCK' }], undefined, null], // old client: ignored, not checked
    [[{ type: 'BLOCK', blockTiers: [1, 2], blockExtraPrice: 5 }], 2, null],
    [[{ type: 'BLOCK', blockTiers: [1, 2], blockExtraMode: 'HOLD_LAST' }], 2, null],
    [[{ type: 'BLOCK', blockTiers: [1, 2], blockExtraPrice: 0 }], 2, null],
    [[{ type: 'BLOCK', blockTiers: [1, 2] }], 2, 'BLOCK_TABLE_INVALID'], // #1223 EXTRA_PER_DAY without X
    [[{ type: 'BLOCK', blockTiers: [1, 2], blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: null }], 2, 'BLOCK_TABLE_INVALID'],
    [[{ type: 'BLOCK' }], 2, 'BLOCK_TABLE_INVALID'],
    [[{ type: 'BLOCK', blockTiers: [] }], 2, 'BLOCK_TABLE_INVALID'],
    [[{ type: 'BLOCK', blockTiers: [1] }, { type: 'BLOCK', blockTiers: [1] }], 2, 'BLOCK_TABLE_INVALID'],
    [[{ type: 'BLOCK', blockTiers: new Array(32).fill(1) }], 2, 'BLOCK_TABLE_INVALID'],
  ])('%j v%s -> %s', (options, version, expected) => {
    expect(blockOptionsIssue(options as any, version as any)).toBe(expected);
  });

  it('applies the same rules as isCompleteBlockTable', () => {
    const tables = [
      { tiers: [1] }, { tiers: [] }, { tiers: [-1] }, { tiers: [1], startDay: 0 }, { tiers: [1], startDay: 31 }, { tiers: [1], startDay: 32 },
      { tiers: [1], extraMode: 'HOLD_LAST' }, { tiers: [1], extraMode: 'NOPE' }, { tiers: [1], extraPrice: -1 }, { tiers: [1], extraPrice: 5 }, { tiers: [1], extraMode: 'EXTRA_PER_DAY' }, { tiers: [1], extraMode: 'EXTRA_PER_DAY', extraPrice: 0 },
      { tiers: new Array(31).fill(0) }, { tiers: new Array(32).fill(0) }, { tiers: [NaN] }, { tiers: [1], startDay: 1.5 },
    ];
    for (const t of tables) {
      const option = { type: 'BLOCK', blockTiers: t.tiers, blockStartDay: (t as any).startDay, blockExtraMode: (t as any).extraMode, blockExtraPrice: (t as any).extraPrice };
      expect([JSON.stringify(t), blockOptionsIssue([option], 2) === null]).toEqual([JSON.stringify(t), isCompleteBlockTable(t as any)]);
    }
  });
});

describe('#1223 golden tables the API refuses to save', () => {
  const bad = golden.invalidSaveTables as Record<string, any>;
  it.each(Object.keys(bad).filter((k) => !k.startsWith('_')))('%s -> BLOCK_TABLE_INVALID', (name) => {
    const t = bad[name];
    const option = { type: 'BLOCK', blockTiers: t.tiers, blockStartDay: t.startDay, blockExtraMode: t.extraMode, blockExtraPrice: t.extraPrice };
    expect(blockOptionsIssue([option], 2)).toBe('BLOCK_TABLE_INVALID');
  });
  it.each(Object.entries(golden.tables))('valid golden table %s is saved', (_n, t: any) => {
    const option = { type: 'BLOCK', blockTiers: t.tiers, blockStartDay: t.startDay, blockExtraMode: t.extraMode, blockExtraPrice: t.extraPrice };
    expect(blockOptionsIssue([option], 2)).toBeNull();
  });
});

describe('capability header', () => {
  it('no header, empty, junk = no capability; tokens are case-insensitive', () => {
    expect(hasCapability(req(), 'block-pricing')).toBe(false);
    expect(hasCapability(req(''), 'block-pricing')).toBe(false);
    expect(hasCapability(req('???'), 'block-pricing')).toBe(false);
    expect(hasCapability(req('Installments, BLOCK-Pricing'), 'block-pricing')).toBe(true);
    expect(getClientCapabilities(req('installments')).has('block-pricing')).toBe(false);
  });
});

describe('what an old client sees of a BLOCK option', () => {
  it('becomes a plain FIXED option at the day-1 price, same id, no table', () => {
    const out = pricingOptionsForClient([BLOCK], req());
    expect(out).toEqual([{ id: 31, type: 'FIXED', price: 80000, isDefault: true, isActive: true }]);
  });

  it('is dropped when the product already has a real FIXED option', () => {
    expect(pricingOptionsForClient([BLOCK, FIXED], req())).toEqual([FIXED]);
  });

  it('a client with the capability gets the options as stored; products without BLOCK are untouched', () => {
    expect(pricingOptionsForClient([BLOCK], req('block-pricing'))).toEqual([BLOCK]);
    const list = [FIXED, DAILY];
    expect(pricingOptionsForClient(list, req())).toBe(list);
    const product = { id: 1, rentPrice: 80000, pricingOptions: [BLOCK] };
    expect(productForClient(product, req())).toMatchObject({ id: 1, rentPrice: 80000, pricingOptions: [{ type: 'FIXED', price: 80000 }] });
    expect(productForClient({ id: 2 } as any, req())).toEqual({ id: 2 });
  });
});

describe('public shop product', () => {
  const source: any = { id: 1, name: 'Áo', rentPrice: 80000, pricingType: 'FIXED', pricingOptions: [BLOCK, FIXED] };
  it('shows the table of a BLOCK option and hides it with the other prices', () => {
    const shown = toPublicProduct(source);
    expect(shown.pricingOptions[0]).toMatchObject({ type: 'BLOCK', price: 80000, blockTiers: [80000, 100000, 120000], blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000 });
    expect(Object.keys(shown.pricingOptions[1]).sort()).toEqual(['blockSize', 'isDefault', 'price', 'type', 'unit']);
    const hidden = toPublicProduct(source, { hidePrices: true });
    expect(hidden.pricingOptions[0]).toMatchObject({ type: 'BLOCK', price: null, blockTiers: null, blockExtraPrice: null });
    expect(JSON.stringify(hidden)).not.toContain('100000');
  });
});

describe('findBlockOption: which order lines are BLOCK lines', () => {
  const only = { pricingOptions: [BLOCK] };
  it('old iOS ($0 FIXED, no id) and old Android (FIXED day-1 price) on a BLOCK-default product', () => {
    expect(findBlockOption(only, { pricingType: 'FIXED' })?.id).toBe(31);
    expect(findBlockOption(only, { pricingType: null })?.id).toBe(31);
    expect(findBlockOption(only, { pricingOptionId: 31, pricingType: 'FIXED' })?.id).toBe(31);
    expect(findBlockOption(only, { pricingOptionId: 999, pricingType: 'FIXED' })?.id).toBe(31); // stale id
  });
  it('an explicit FIXED / DAILY option or type is not a BLOCK line', () => {
    const many = { pricingOptions: [BLOCK, FIXED, DAILY] };
    expect(findBlockOption(many, { pricingOptionId: 32 })).toBeNull();
    expect(findBlockOption(many, { pricingOptionId: 33 })).toBeNull();
    expect(findBlockOption(many, { pricingType: 'DAILY' })).toBeNull();
    expect(findBlockOption(many, { pricingOptionId: 31 })?.id).toBe(31);
    expect(findBlockOption(many, { pricingType: 'BLOCK' })?.id).toBe(31);
  });
  it('the default option decides when the line says nothing', () => {
    expect(findBlockOption({ pricingOptions: [{ ...BLOCK, isDefault: false }, { ...FIXED, isDefault: true }] }, { pricingType: 'FIXED' })).toBeNull();
  });
  it('no BLOCK option, an inactive one or a broken table is never a BLOCK line', () => {
    expect(findBlockOption({ pricingOptions: [FIXED] }, { pricingType: 'FIXED' })).toBeNull();
    expect(findBlockOption({ pricingOptions: [{ ...BLOCK, isActive: false }] }, { pricingType: 'FIXED' })).toBeNull();
    expect(findBlockOption({ pricingOptions: [{ ...BLOCK, blockTiers: [] }] }, { pricingType: 'FIXED' })).toBeNull();
    expect(findBlockOption(null, {})).toBeNull();
    expect(tableOf(FIXED as any)).toBeNull();
  });
});

describe('priceBlockLine / totalAfterReprice', () => {
  const table = tableOf(BLOCK as any)!;
  it('line = unit x quantity, rounded to the currency', () => {
    expect(priceBlockLine({ table, optionId: 31, days: 5, quantity: 2, currency: 'VND' })).toMatchObject({ unitPrice: 160000, totalPrice: 320000, rentalDays: 5 });
    const usd = priceBlockLine({ table: { tiers: [9.99], extraMode: 'EXTRA_PER_DAY', extraPrice: 0.333 }, optionId: null, days: 3, quantity: 3, currency: 'USD' });
    expect(usd).toMatchObject({ unitPrice: 10.66, totalPrice: 31.98 });
  });
  it('total = lines - discount, percentage of the new lines, never below 0', () => {
    expect(totalAfterReprice({ lineTotals: [120000, 150000], discountType: 'percentage', discountValue: 10, currency: 'VND' })).toEqual({ subtotal: 270000, discountAmount: 27000, totalAmount: 243000 });
    expect(totalAfterReprice({ lineTotals: [100], discountType: 'amount', discountValue: 500, discountAmount: 500 })).toMatchObject({ discountAmount: 100, totalAmount: 0 });
    expect(totalAfterReprice({ lineTotals: [100] })).toEqual({ subtotal: 100, discountAmount: 0, totalAmount: 100 });
  });
  it('settings: only "block" blocks', () => {
    expect(readOldAppsMode({ blockPricing: { oldApps: 'block' } })).toBe('block');
    expect(readOldAppsMode({ blockPricing: { oldApps: 'recompute' } })).toBe('recompute');
    expect(readOldAppsMode(null)).toBe('recompute');
    expect(readOldAppsMode({})).toBe('recompute');
  });
});

describe('repriceOrderEdit (PUT /api/orders/[orderId])', () => {
  const snapshot = (days: number, total: number) => ({ version: 1, type: 'BLOCK', optionId: 31, tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000, days, totalPrice: total });
  const stored = [
    { productId: 13, quantity: 1, unitPrice: 120000, totalPrice: 120000, deposit: 0, notes: null, rentalDays: 3, pricingType: 'BLOCK', pricingOptionId: 31, pricingSnapshot: snapshot(3, 120000) },
    { productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000, deposit: 0, notes: null, rentalDays: 1, pricingType: 'FIXED', pricingOptionId: null, pricingSnapshot: null },
  ];
  const base = {
    existingItems: stored, pickup: '2026-10-10T02:00:00.000Z', returnDate: '2026-10-12T02:00:00.000Z',
    datesSent: false, totalOrDiscountSent: false, currency: 'VND', timeZone: 'Asia/Ho_Chi_Minh', clientKnowsBlock: false,
    discount: {}, loadProduct: async (id: number) => ({ pricingOptions: id === 14 ? [{ ...BLOCK, blockTiers: [1, 1, 1] }] : [FIXED] }), loadOldAppsMode: async () => 'recompute' as const,
  };

  it('an old app saving the lines it received keeps the stored table and total (the product table changed since)', async () => {
    const body = stored.map((s) => ({ ...s, pricingType: 'FIXED', pricingSnapshot: undefined, unitPrice: 80000, totalPrice: 80000 }));
    const out = await repriceOrderEdit({ ...base, bodyItems: [body[0], stored[1]] });
    expect(out.items![0]).toMatchObject({ unitPrice: 120000, totalPrice: 120000, rentalDays: 3, pricingType: 'BLOCK', pricingOptionId: 31 });
    expect(out.totalAmount).toBe(270000);
  });

  it('new dates reprice the stored lines even when the app sends no lines (5 days = 160.000)', async () => {
    const out = await repriceOrderEdit({ ...base, bodyItems: null, datesSent: true, returnDate: '2026-10-14T02:00:00.000Z' });
    expect(out.items![0]).toMatchObject({ totalPrice: 160000, rentalDays: 5 });
    expect(out.items![0].pricingSnapshot).toMatchObject({ days: 5, extraDays: 2 });
    expect(out.items![1]).toMatchObject({ totalPrice: 150000 });
    expect(out.totalAmount).toBe(310000);
  });

  it('a PUT that sends only totalAmount gets the server total, lines untouched', async () => {
    const out = await repriceOrderEdit({ ...base, bodyItems: null, totalOrDiscountSent: true, discount: { type: 'percentage', value: 10 } });
    expect(out.items).toBeUndefined();
    expect(out).toMatchObject({ totalAmount: 243000, discountAmount: 27000 });
  });

  it('an order without BLOCK lines is left alone and nothing is looked up', async () => {
    const loadProduct = jest.fn(async () => null);
    expect(await repriceOrderEdit({ ...base, existingItems: [stored[1]], bodyItems: null, datesSent: true, loadProduct })).toEqual({});
    expect(loadProduct).not.toHaveBeenCalled();
  });

  it('a new BLOCK line uses the current table; oldApps "block" refuses a new line but not an existing one', async () => {
    const newLine = { productId: 14, quantity: 1, unitPrice: 0, totalPrice: 0, pricingType: 'FIXED' };
    const ok = await repriceOrderEdit({ ...base, existingItems: [stored[1]], bodyItems: [stored[1], newLine] });
    expect(ok.items![1]).toMatchObject({ totalPrice: 1, pricingType: 'BLOCK' }); // product 14: table [1,1,1], day 3 = 1
    const refused = await repriceOrderEdit({ ...base, existingItems: [stored[1]], bodyItems: [stored[1], newLine], loadOldAppsMode: async () => 'block' });
    expect(refused.error).toBe('PRICING_TYPE_REQUIRES_UPDATE');
    const existingOk = await repriceOrderEdit({ ...base, bodyItems: [stored[0]], loadOldAppsMode: async () => 'block' });
    expect(existingOk.error).toBeUndefined();
  });

  it('a client-sent snapshot on a non-BLOCK line is removed', async () => {
    const out = await repriceOrderEdit({ ...base, bodyItems: [{ ...stored[1], pricingSnapshot: { type: 'BLOCK' } }], loadProduct: async () => ({ pricingOptions: [FIXED] }) });
    expect(out.items![0].pricingSnapshot).toBeUndefined();
  });

  it('a client that knows block-pricing: checked, not repriced; its total is kept', async () => {
    const good = await repriceOrderEdit({ ...base, clientKnowsBlock: true, bodyItems: [{ ...stored[0], pricingSnapshot: undefined }, stored[1]] });
    expect(good.error).toBeUndefined();
    expect(good.totalAmount).toBeUndefined();
    const bad = await repriceOrderEdit({ ...base, clientKnowsBlock: true, bodyItems: [{ ...stored[0], totalPrice: 1 }, stored[1]] });
    expect(bad.error).toBe('BLOCK_PRICE_MISMATCH');
    const override = await repriceOrderEdit({ ...base, clientKnowsBlock: true, bodyItems: [{ ...stored[0], totalPrice: 1, priceOverridden: true }, stored[1]] });
    expect(override.error).toBeUndefined();
    expect(override.items![0]).toMatchObject({ totalPrice: 1 });
  });
});
