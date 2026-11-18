/**
 * #1621 web "Theo khối giờ": the product form keeps and sends the hour blocks (form-model), the "Giá theo khối giờ"
 * dialog rules (hour-block-draft, the same rules as the API's `hourBlocksIssue`), and the product list label.
 * The cart, the order detail and the slip are in order-form-line-pricing.test.ts and web-receipt-model.test.ts.
 */
import { describe, expect, it } from '@jest/globals';
import {
  HOUR_BLOCK_MAX_COUNT as SHARED_MAX_COUNT,
  HOUR_BLOCK_MAX_HOURS as SHARED_MAX_HOURS,
  HOUR_BLOCK_MIN_HOURS as SHARED_MIN_HOURS,
  hourBlocksIssue,
} from '../packages/utils/src/core/hour-blocks';
import { CLIENT_CAPABILITIES } from '../packages/utils/src/core/client-capabilities';
import {
  HOUR_BLOCK_MAX_COUNT,
  HOUR_BLOCK_MAX_HOURS,
  HOUR_BLOCK_MIN_HOURS,
  addHourRow,
  hourBlockPriceRange,
  hourBlocksFromRows,
  hourRowProblems,
  removeHourRow,
  rowsFromBlocks,
  savedHourBlocksOf,
  type HourBlockRow,
} from '../apps/client/app/products/hour-block-draft';
import {
  buildPayload,
  buildPricingOptions,
  formFromProduct,
  saveHourBlocks,
  turnOffHourBlocks,
  validateForm,
  type FormState,
  type ProductSource,
} from '../apps/client/app/products/form/form-model';
import { productPrices } from '../apps/client/app/products/list/list-model';

const hourly = (id: number, hours: number, price: number, extra: object = {}) => ({ id, type: 'HOURLY', price, unit: 'HOUR', blockSize: hours, isDefault: false, isActive: true, ...extra });
// Váy cưới trắng: Theo lần 500.000 · 2 giờ 150.000 · 4 giờ 250.000 · 8 giờ 400.000 (stored out of order)
const vay: ProductSource = {
  id: 1,
  name: 'Váy cưới trắng',
  rentPrice: 500000,
  pricingType: 'FIXED',
  categoryId: 1,
  pricingOptions: [{ type: 'FIXED', price: 500000, isDefault: true }, hourly(14, 8, 400000), hourly(12, 2, 150000), hourly(13, 4, 250000)],
  outletStock: [{ outletId: 3, stock: 1 }],
};
const outlets = [{ id: 3, name: 'Quận 1' }];
const categories = [{ id: 1 }];
const options = (payload: Record<string, unknown>) => payload.pricingOptions as Array<Record<string, unknown>>;

describe('the web declares hour-blocks', () => {
  it('so the API returns and stores the HOURLY options for it', () => {
    expect(CLIENT_CAPABILITIES).toContain('hour-blocks');
  });
});

describe('product form: hour blocks (#1621)', () => {
  it('edit: reads the saved blocks, shortest first; an old per-hour option or an inactive block is not a block', () => {
    const form = formFromProduct(vay, outlets, categories);
    expect(form.hourBlocks).toEqual([
      { hours: 2, price: 150000 },
      { hours: 4, price: 250000 },
      { hours: 8, price: 400000 },
    ]);
    expect(form.perRental).toBe(500000);
    const old = formFromProduct({ ...vay, pricingOptions: [{ type: 'FIXED', price: 1, isDefault: true }, { type: 'HOURLY', price: 20000 }, hourly(5, 3, 9, { isActive: false })] }, outlets, categories);
    expect(old.hourBlocks).toEqual([]);
  });

  it('save sends every block as an HOURLY row (unit HOUR, blockSize = hours, never the default) next to Theo lần', () => {
    const form = formFromProduct(vay, outlets, categories);
    const payload = buildPayload(form, { canEditPricing: true, productId: 1 });
    expect(payload.pricingSchemaVersion).toBe(2);
    expect(payload.rentPrice).toBe(500000);
    expect(options(payload)).toEqual([
      { type: 'FIXED', price: 500000, isDefault: true },
      { type: 'HOURLY', price: 150000, isDefault: false, unit: 'HOUR', blockSize: 2 },
      { type: 'HOURLY', price: 250000, isDefault: false, unit: 'HOUR', blockSize: 4 },
      { type: 'HOURLY', price: 400000, isDefault: false, unit: 'HOUR', blockSize: 8 },
    ]);
    // the API's own check accepts what the form sends
    expect(hourBlocksIssue(options(payload) as never)).toBeNull();
  });

  it('a save from a form that never opened the dialog still sends the blocks (the set replaces the stored one)', () => {
    const form = { ...formFromProduct(vay, outlets, categories), name: 'Váy cưới trắng (mới)' };
    expect(options(buildPayload(form, { canEditPricing: true, productId: 1 })).filter((o) => o.type === 'HOURLY')).toHaveLength(3);
  });

  it('"Lưu bảng giá" sorts the blocks; "Tắt giá theo khối giờ" sends none, the other prices stay', () => {
    const form = formFromProduct(vay, outlets, categories);
    const saved = saveHourBlocks(form, [{ hours: 8, price: 1 }, { hours: 1, price: 0 }]);
    expect(saved.hourBlocks).toEqual([{ hours: 1, price: 0 }, { hours: 8, price: 1 }]);
    const off = buildPayload(turnOffHourBlocks(form), { canEditPricing: true, productId: 1 });
    expect(options(off)).toEqual([{ type: 'FIXED', price: 500000, isDefault: true }]);
  });

  it('a new product starts without blocks ("Chưa cài") and adds them with a Theo lần price', () => {
    const form = formFromProduct({ name: 'Vest', categoryId: 1 }, outlets, categories);
    expect(form.hourBlocks).toEqual([]);
    const withBlocks: FormState = { ...saveHourBlocks(form, [{ hours: 2, price: 80000 }, { hours: 8, price: 200000 }]), perRental: 250000, totalStock: 3 };
    const payload = buildPayload(withBlocks, { canEditPricing: true });
    expect(options(payload).map((o) => [o.type, o.blockSize ?? null, o.isDefault])).toEqual([
      ['FIXED', null, true],
      ['HOURLY', 2, false],
      ['HOURLY', 8, false],
    ]);
  });

  it('blocks alone cannot be saved: the form asks for another price before the API refuses it', () => {
    const blocksOnly: FormState = { ...formFromProduct(vay, outlets, categories), perRental: null, perDay: null, block: null };
    expect(validateForm(blocksOnly, { canEditPricing: true }).perRental).toBe('hourBlocksNeedPrice');
    expect(hourBlocksIssue(buildPricingOptions(blocksOnly) as never)).toBe('HOUR_BLOCKS_INVALID');
    expect(validateForm({ ...blocksOnly, perDay: 100000 }, { canEditPricing: true }).perRental).toBeUndefined();
    expect(validateForm({ ...blocksOnly, block: { tiers: [80000], startDay: 1, extraMode: 'HOLD_LAST', extraPrice: null } }, { canEditPricing: true }).perRental).toBeUndefined();
    // no blocks, no price: allowed as today
    expect(validateForm({ ...blocksOnly, hourBlocks: [] }, { canEditPricing: true }).perRental).toBeUndefined();
  });

  it('without price rights (OUTLET_STAFF) no price and no block is sent; the API keeps the stored ones', () => {
    const form = formFromProduct(vay, outlets, categories);
    const payload = buildPayload(form, { canEditPricing: false, productId: 1 });
    expect(payload).not.toHaveProperty('pricingOptions');
    expect(validateForm({ ...form, perRental: null }, { canEditPricing: false }).perRental).toBeUndefined();
  });
});

describe('"Giá theo khối giờ" dialog rows (#1621)', () => {
  const rows = (...r: Array<[number | null, number | null]>): HourBlockRow[] => r.map(([hours, price]) => ({ hours, price }));

  it('uses the same limits as the API', () => {
    expect([HOUR_BLOCK_MIN_HOURS, HOUR_BLOCK_MAX_HOURS, HOUR_BLOCK_MAX_COUNT]).toEqual([SHARED_MIN_HOURS, SHARED_MAX_HOURS, SHARED_MAX_COUNT]);
  });

  it('starts from the saved blocks, or one empty row', () => {
    expect(rowsFromBlocks([])).toEqual(rows([null, null]));
    expect(rowsFromBlocks([{ hours: 2, price: 150000 }])).toEqual(rows([2, 150000]));
  });

  it('marks hours outside 1–24, a number of hours used twice (both rows) and a missing price; 0đ is a price', () => {
    expect(hourRowProblems(rows([0, 1], [25, 1], [4, 1], [4, 2], [2, null], [3, 0], [null, null]))).toEqual(['hours', 'hours', 'repeated', 'repeated', 'price', null, null]);
    expect(hourRowProblems(rows([null, 5000]))).toEqual(['hours']);
  });

  it('saving sorts by hours, drops fully empty rows, and stops on any wrong row', () => {
    expect(hourBlocksFromRows(rows([8, 400000], [2, 150000], [null, null], [4, 250000]))).toEqual([
      { hours: 2, price: 150000 },
      { hours: 4, price: 250000 },
      { hours: 8, price: 400000 },
    ]);
    expect(hourBlocksFromRows(rows([4, 1], [4, 2]))).toBeNull();
    expect(hourBlocksFromRows(rows([2, null]))).toBeNull();
    // nothing left = turned off
    expect(hourBlocksFromRows(rows([null, null]))).toEqual([]);
  });

  it('agrees with the API check on the same rows', () => {
    const cases = [rows([2, 1], [4, 2]), rows([4, 1], [4, 2]), rows([0, 1]), rows([25, 1]), rows([2, null]), rows([24, 0], [1, 0])];
    for (const r of cases) {
      const sent = [{ type: 'FIXED', price: 1 }, ...r.map((x) => ({ type: 'HOURLY', price: x.price, blockSize: x.hours }))];
      expect(hourBlocksFromRows(r) == null).toBe(hourBlocksIssue(sent) != null);
    }
  });

  it('"+ Thêm khối" stops at 10 blocks; ✕ removes that row', () => {
    let r: HourBlockRow[] = [];
    for (let i = 0; i < 12; i++) r = addHourRow(r);
    expect(r).toHaveLength(10);
    expect(removeHourRow(rows([2, 1], [4, 2], [8, 3]), 1)).toEqual(rows([2, 1], [8, 3]));
  });

  it('the row summary range: lowest and highest block price', () => {
    expect(hourBlockPriceRange(savedHourBlocksOf(vay.pricingOptions))).toEqual({ min: 150000, max: 400000 });
    expect(hourBlockPriceRange([])).toBeNull();
  });
});

describe('product list: an hour block is not a per-hour price (#1621)', () => {
  it('skips HOURLY rows with hours; an old per-hour option keeps its "/giờ" price', () => {
    expect(productPrices({ id: 1, pricingOptions: vay.pricingOptions as never })).toMatchObject({ once: 500000, hour: null, day: null });
    expect(productPrices({ id: 2, pricingOptions: [{ type: 'HOURLY', price: 20000 }] })).toMatchObject({ hour: 20000 });
  });
});
