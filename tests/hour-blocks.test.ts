/**
 * #1621 hour-block pricing ("Theo khối giờ"): the money examples the owner confirmed on the mockup, the save rules
 * (web/API copies kept equal), what an old client sees and keeps, and the order lines (create + edit).
 */
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../packages/utils/src/core/block-pricing'),
  parseProductImages: () => [],
  countRentalDays: jest.requireActual('../packages/utils/src/core/rental-days').countRentalDays,
}));

import * as shared from '../packages/utils/src/core/hour-blocks';
import { computeOrderLineTotal } from '../packages/utils/src/core/order-line-pricing';
import { hourBlocksIssue as apiHourBlocksIssue } from '../apps/api/lib/hour-blocks-issue';
import { normalizePricingOptions, pricingOptionsDeleteWhere } from '../packages/database/src/product-pricing-normalize';
import { pricingOptionsForClient, productForClient } from '../apps/api/lib/block-pricing-legacy';
import { stampHourBlockLine, hourBlockSnapshotOf, findHourBlockOption } from '../apps/api/lib/order-hour-blocks';
import { repriceOrderEdit } from '../apps/api/lib/order-block-pricing';

const req = (value?: string) => ({ headers: { get: (n: string) => (n.toLowerCase() === 'x-client-capabilities' && value !== undefined ? value : null) } });

// Váy cưới trắng: Theo lần 500.000 · 2 giờ 150.000 · 4 giờ 250.000 · 8 giờ 400.000
const VAY = [
  { id: 1, type: 'FIXED', price: 500000, isDefault: true, isActive: true },
  { id: 2, type: 'HOURLY', price: 150000, unit: 'HOUR', blockSize: 2, isDefault: false, isActive: true },
  { id: 3, type: 'HOURLY', price: 250000, unit: 'HOUR', blockSize: 4, isDefault: false, isActive: true },
  { id: 4, type: 'HOURLY', price: 400000, unit: 'HOUR', blockSize: 8, isDefault: false, isActive: true },
];
// Vest nam đen: Theo lần 250.000 · 2 giờ 80.000 · 8 giờ 200.000
const VEST = [
  { id: 11, type: 'FIXED', price: 250000, isDefault: true, isActive: true },
  { id: 12, type: 'HOURLY', price: 80000, unit: 'HOUR', blockSize: 2, isDefault: false, isActive: true },
  { id: 13, type: 'HOURLY', price: 200000, unit: 'HOUR', blockSize: 8, isDefault: false, isActive: true },
];

describe('money examples (mockup confirmed 2026-11-18)', () => {
  const line = (options: any[], id: number, quantity = 1) => {
    const o = options.find((x) => x.id === id);
    return { quantity, unitPrice: o.price, pricingType: o.type, selectedPricingOptionId: id, product: { pricingOptions: options } };
  };
  it.each([
    ['14/11, Váy khối 2 giờ', [line(VAY, 2)], 1, 150000],
    ['14/11, Váy khối 4 giờ', [line(VAY, 3)], 1, 250000],
    ['14/11, Vest khối 2 giờ × 2', [line(VEST, 12, 2)], 1, 160000],
    ['14/11, Váy 4 giờ + Vest 2 giờ', [line(VAY, 3), line(VEST, 12)], 1, 330000],
    ['14/11, Váy theo lần', [line(VAY, 1)], 1, 500000],
    ['14/11 → 16/11 (3 ngày), Váy khối 4 giờ: once, not × 3', [line(VAY, 3)], 3, 250000],
  ])('%s = %d', (_name, lines, days, total) => {
    expect(lines.reduce((sum, l) => sum + computeOrderLineTotal(l, 'RENT', days), 0)).toBe(total);
  });

  it('the shared helpers read the blocks shortest first', () => {
    expect(shared.hourBlocksOf([VAY[3], VAY[0], VAY[1], VAY[2]])).toEqual([
      { hours: 2, price: 150000 }, { hours: 4, price: 250000 }, { hours: 8, price: 400000 },
    ]);
    expect(shared.hourBlockOf(VAY[0])).toBeNull();
    expect(shared.hourBlockOf({ type: 'HOURLY', price: 1, blockSize: 25 })).toBeNull();
  });
});

describe('hourBlocksIssue (save of a client with hour-blocks); web and API copies agree', () => {
  const fixed = { type: 'FIXED', price: 500000 };
  const block = (hours: unknown, price: unknown = 100000) => ({ type: 'HOURLY', price, blockSize: hours });
  const cases: Array<[string, any[], 'HOUR_BLOCKS_INVALID' | null]> = [
    ['no hour block', [fixed], null],
    ['2 · 4 · 8 giờ', [fixed, block(2), block(4), block(8)], null],
    ['0đ is a price', [fixed, block(2, 0)], null],
    ['0 hours', [fixed, block(0)], 'HOUR_BLOCKS_INVALID'],
    ['25 hours', [fixed, block(25)], 'HOUR_BLOCKS_INVALID'],
    ['1.5 hours', [fixed, block(1.5)], 'HOUR_BLOCKS_INVALID'],
    ['no hours', [fixed, block(null)], 'HOUR_BLOCKS_INVALID'],
    ['same hours twice', [fixed, block(2), block(2, 5)], 'HOUR_BLOCKS_INVALID'],
    ['negative price', [fixed, block(2, -1)], 'HOUR_BLOCKS_INVALID'],
    ['missing price', [fixed, block(2, null)], 'HOUR_BLOCKS_INVALID'],
    ['only hour blocks (a block is never the default)', [block(2), block(4)], 'HOUR_BLOCKS_INVALID'],
    ['11 blocks', [fixed, ...Array.from({ length: 11 }, (_, i) => block(i + 1))], 'HOUR_BLOCKS_INVALID'],
    ['10 blocks', [fixed, ...Array.from({ length: 10 }, (_, i) => block(i + 1))], null],
  ];
  it.each(cases)('%s', (_name, options, expected) => {
    expect(apiHourBlocksIssue(options)).toBe(expected);
    expect(shared.hourBlocksIssue(options)).toBe(expected);
  });
});

describe('normalizePricingOptions with hour blocks', () => {
  const sent = [
    { type: 'HOURLY', price: 400000, blockSize: 8, isDefault: true },
    { type: 'FIXED', price: 500000 },
    { type: 'HOURLY', price: 150000, blockSize: 2 },
    { type: 'HOURLY', price: 250000, blockSize: 4 },
  ];

  it('drops them for a client without hour-blocks (as before)', () => {
    expect(normalizePricingOptions(sent).map((o) => o.type)).toEqual(['FIXED']);
  });

  it('keeps them for hour-blocks: never default, after the other prices, shortest first, unit HOUR', () => {
    const out = normalizePricingOptions(sent, { allowHourly: true });
    expect(out).toEqual([
      { type: 'FIXED', price: 500000, unit: null, blockSize: null, isDefault: true, isActive: true, sortOrder: 0 },
      { type: 'HOURLY', price: 150000, unit: 'HOUR', blockSize: 2, isDefault: false, isActive: true, sortOrder: 1 },
      { type: 'HOURLY', price: 250000, unit: 'HOUR', blockSize: 4, isDefault: false, isActive: true, sortOrder: 2 },
      { type: 'HOURLY', price: 400000, unit: 'HOUR', blockSize: 8, isDefault: false, isActive: true, sortOrder: 3 },
    ]);
  });

  it('only hour blocks store nothing (the product keeps its saved prices)', () => {
    expect(normalizePricingOptions([sent[0], sent[2]], { allowHourly: true })).toEqual([]);
  });

  it('a repeated or broken block is dropped', () => {
    const out = normalizePricingOptions([{ type: 'FIXED', price: 1 }, sent[2], { ...sent[2], price: 9 }, { type: 'HOURLY', price: 1, blockSize: 30 }], { allowHourly: true });
    expect(out.filter((o) => o.type === 'HOURLY')).toHaveLength(1);
  });
});

describe('an installed app (no hour-blocks) never sees or deletes hour blocks', () => {
  it('delete set keeps HOURLY rows unless the client knows them', () => {
    expect(pricingOptionsDeleteWhere(7, { keepHourlyOptions: true })).toEqual({ productId: 7, type: { notIn: ['HOURLY'] } });
    expect(pricingOptionsDeleteWhere(7, { keepHourlyOptions: true, keepBlockOptions: true })).toEqual({ productId: 7, type: { notIn: ['BLOCK', 'HOURLY'] } });
    expect(pricingOptionsDeleteWhere(7, { keepHourlyOptions: false })).toEqual({ productId: 7 });
  });

  it('responses hide HOURLY without the token (main-real apps send installments, block-pricing, branch-listing)', () => {
    const oldApp = req('installments, block-pricing, branch-listing');
    expect(pricingOptionsForClient(VAY, oldApp).map((o) => o.id)).toEqual([1]);
    expect(pricingOptionsForClient(VAY, req()).map((o) => o.id)).toEqual([1]);
    expect(pricingOptionsForClient(VAY, req('block-pricing, hour-blocks'))).toEqual(VAY);
    expect(productForClient({ id: 5, pricingOptions: VAY, salePrice: 1 }, oldApp).pricingOptions).toHaveLength(1);
  });
});

describe('order lines on an hour block', () => {
  const vay = { pricingOptions: VAY };

  it('a line on block id 3 is stamped Khối 4 giờ, rentalDays 1', () => {
    expect(stampHourBlockLine({ pricingType: 'HOURLY', pricingOptionId: 3 }, vay)).toEqual({
      pricingType: 'HOURLY', pricingOptionId: 3, pricingSnapshot: { type: 'HOURLY', hours: 4, price: 250000 }, rentalDays: 1,
    });
  });

  it('FIXED / DAILY lines, an inactive block, another product\'s id: not an hour-block line', () => {
    expect(stampHourBlockLine({ pricingType: 'FIXED', pricingOptionId: 1 }, vay)).toBeNull();
    expect(stampHourBlockLine({ pricingType: 'HOURLY', pricingOptionId: 99 }, vay)).toBeNull();
    expect(findHourBlockOption({ pricingOptions: [{ ...VAY[2], isActive: false }] }, 3)).toBeNull();
    // an old per-hour HOURLY line without a block or stored snapshot stays as it is
    expect(stampHourBlockLine({ pricingType: 'HOURLY' }, vay)).toBeNull();
  });

  it('snapshot reader', () => {
    expect(hourBlockSnapshotOf({ type: 'HOURLY', hours: 4, price: 250000 })).toEqual({ type: 'HOURLY', hours: 4, price: 250000 });
    expect(hourBlockSnapshotOf({ type: 'BLOCK', tiers: [1] })).toBeNull();
    expect(hourBlockSnapshotOf(null)).toBeNull();
  });
});

describe('editing an order with an hour-block line (PUT /api/orders/[orderId])', () => {
  const snap = { type: 'HOURLY', hours: 4, price: 250000 };
  const stored = [
    { productId: 21, quantity: 1, unitPrice: 250000, totalPrice: 250000, deposit: 0, notes: null, rentalDays: 1, pricingType: 'HOURLY', pricingOptionId: 3, pricingSnapshot: snap },
  ];
  const base = {
    existingItems: stored, pickup: '2026-11-14T02:00:00.000Z', returnDate: '2026-11-16T02:00:00.000Z',
    datesSent: false, totalOrDiscountSent: false, currency: 'VND', timeZone: 'Asia/Ho_Chi_Minh', clientKnowsBlock: true,
    discount: {}, loadProduct: async () => ({ pricingOptions: VAY }), loadOldAppsMode: async () => 'recompute' as const,
  };

  it('old Android sends the line back without pricingOptionId: id and snapshot kept, total not × days', async () => {
    const androidLine = { productId: 21, quantity: 1, unitPrice: 250000, totalPrice: 250000, rentalDays: 1, pricingType: 'HOURLY' };
    const out = await repriceOrderEdit({ ...base, clientKnowsBlock: false, bodyItems: [androidLine] });
    expect(out.items![0]).toMatchObject({ pricingType: 'HOURLY', pricingOptionId: 3, pricingSnapshot: snap, totalPrice: 250000 });
  });

  it('the block was deleted from the product since: the stored snapshot stays', async () => {
    const out = await repriceOrderEdit({ ...base, loadProduct: async () => ({ pricingOptions: [VAY[0]] }), bodyItems: [{ ...stored[0], pricingSnapshot: undefined }] });
    expect(out.items![0]).toMatchObject({ pricingOptionId: 3, pricingSnapshot: snap });
  });

  it('switching the line to another block or to Theo lần', async () => {
    const to8 = await repriceOrderEdit({ ...base, bodyItems: [{ ...stored[0], pricingOptionId: 4, unitPrice: 400000, totalPrice: 400000 }] });
    expect(to8.items![0].pricingSnapshot).toEqual({ type: 'HOURLY', hours: 8, price: 400000 });
    const toFixed = await repriceOrderEdit({ ...base, bodyItems: [{ ...stored[0], pricingType: 'FIXED', pricingOptionId: 1, unitPrice: 500000, totalPrice: 500000 }] });
    expect(toFixed.items![0].pricingSnapshot).toBeUndefined();
    expect(toFixed.items![0].pricingType).toBe('FIXED');
  });

  it('a client-sent hour snapshot on a new line is replaced by the product block', async () => {
    const out = await repriceOrderEdit({ ...base, existingItems: [], bodyItems: [{ productId: 21, quantity: 2, unitPrice: 150000, totalPrice: 300000, pricingType: 'HOURLY', pricingOptionId: 2, pricingSnapshot: { type: 'HOURLY', hours: 24, price: 1 } }] });
    expect(out.items![0]).toMatchObject({ pricingSnapshot: { type: 'HOURLY', hours: 2, price: 150000 }, totalPrice: 300000 });
  });

  it('new dates without lines leave an order without BLOCK lines alone', async () => {
    expect(await repriceOrderEdit({ ...base, bodyItems: null, datesSent: true })).toEqual({});
  });
});
