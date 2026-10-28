/**
 * #1249 web product form, design the owner fixed last (mockup v179): "Theo lần", "Theo mỗi ngày" and "Theo block ngày"
 * all exist together and are all sent. Pure model; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildPayload,
  buildPricingOptions,
  emptyForm,
  formFromProduct,
  saveBlockTable,
  turnOffBlock,
} from '../apps/client/app/products/form/form-model';
import type { BlockDraft as BlockTable } from '../apps/client/app/products/block-draft';

const outlets = [{ id: 1, name: 'A' }];
const categories = [{ id: 7 }];
const table: BlockTable = { tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000 };
const blockOpt = { type: 'BLOCK', price: 80000, isDefault: false, blockTiers: table.tiers, blockStartDay: null, blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000 };
const fresh = () => ({ ...emptyForm(outlets, categories, '1'), name: 'Áo', totalStock: 1, outletStock: [{ outletId: 1, stock: 1 }] });
const send = (f: ReturnType<typeof fresh>, extra = {}) => buildPayload(f, { canEditPricing: true, ...extra }) as any;

describe('new product (mockup case 1)', () => {
  it('starts with three empty prices: no day price, block not set up', () => {
    const f = fresh();
    expect(f.perRental).toBeNull();
    expect(f.perDay).toBeNull();
    expect(f.block).toBeNull();
    expect(f).not.toHaveProperty('dayKind');
  });

  it('the default for new orders is always Theo lần (FIXED isDefault)', () => {
    const body = send({ ...fresh(), perRental: 150000, perDay: 80000 });
    expect(body.pricingOptions).toEqual([
      { type: 'FIXED', price: 150000, isDefault: true },
      { type: 'DAILY', price: 80000, isDefault: false },
    ]);
    expect(body.rentPrice).toBe(150000);
    expect(body.pricingSchemaVersion).toBe(2);
  });

  it('without a Theo lần price the next price is the default', () => {
    expect(send({ ...fresh(), perDay: 80000 }).pricingOptions).toEqual([{ type: 'DAILY', price: 80000, isDefault: true }]);
    expect(send(fresh()).pricingOptions).toEqual([]);
  });
});

describe('three prices at once', () => {
  it('Theo lần + Theo mỗi ngày + Theo block ngày: the payload has FIXED + DAILY + BLOCK, FIXED is the default', () => {
    const body = send(saveBlockTable({ ...fresh(), perRental: 150000, perDay: 80000 }, table));
    expect(body.pricingOptions).toEqual([
      { type: 'FIXED', price: 150000, isDefault: true },
      { type: 'DAILY', price: 80000, isDefault: false },
      { type: 'BLOCK', price: 80000, isDefault: false, blockTiers: [80000, 100000, 120000], blockStartDay: null, blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000 },
    ]);
    expect(body.rentPrice).toBe(150000);
    expect(body.pricingSchemaVersion).toBe(2);
    expect(body.pricingOptions.filter((o: any) => o.isDefault)).toHaveLength(1);
  });

  it('an empty day box sends no DAILY, the table still goes', () => {
    const body = send(saveBlockTable({ ...fresh(), perRental: 150000 }, table));
    expect(body.pricingOptions.map((o: any) => o.type)).toEqual(['FIXED', 'BLOCK']);
  });

  it('a typed 0 in the day box is a 0đ price', () => {
    expect(send({ ...fresh(), perRental: 5, perDay: 0 }).pricingOptions.map((o: any) => o.type)).toEqual(['FIXED', 'DAILY']);
  });

  it('only a table: BLOCK is the default and rentPrice is day 1', () => {
    const body = send(saveBlockTable(fresh(), { ...table, startDay: 2, extraMode: 'HOLD_LAST', extraPrice: null }));
    expect(body.pricingOptions).toEqual([
      { type: 'BLOCK', price: 80000, isDefault: true, blockTiers: [80000, 100000, 120000], blockStartDay: 2, blockExtraMode: 'HOLD_LAST', blockExtraPrice: null },
    ]);
    expect(body.rentPrice).toBe(80000);
  });

  it('a day price and a table with no Theo lần: DAILY is the default, BLOCK is not', () => {
    const body = send(saveBlockTable({ ...fresh(), perDay: 80000 }, table));
    expect(body.pricingOptions.map((o: any) => [o.type, o.isDefault])).toEqual([['DAILY', true], ['BLOCK', false]]);
  });

  it('an incomplete table is never sent', () => {
    const half: BlockTable = { ...table, tiers: [80000, null] };
    expect(send(saveBlockTable({ ...fresh(), perRental: 1 }, half)).pricingOptions.map((o: any) => o.type)).toEqual(['FIXED']);
  });

  it('Tắt giá theo khối ngày: no BLOCK in the payload, the other two stay, schema 2 so the API drops the saved table', () => {
    const off = turnOffBlock(saveBlockTable({ ...fresh(), perRental: 150000, perDay: 80000 }, table));
    expect(off.block).toBeNull();
    expect(off.perDay).toBe(80000);
    const body = send(off, { productId: 1 });
    expect(body.pricingOptions.map((o: any) => o.type)).toEqual(['FIXED', 'DAILY']);
    expect(body.pricingSchemaVersion).toBe(2);
  });
});

describe('opening a saved product', () => {
  const base = { id: 1, name: 'Áo', rentPrice: 150000, outletStock: [] };
  it('all three saved (mockup case 2): three prices shown, block summary has the table', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: true }, { type: 'DAILY', price: 80000 }, blockOpt] }, outlets, categories);
    expect(f.perRental).toBe(150000);
    expect(f.perDay).toBe(80000);
    expect(f.block).toEqual(table);
    expect(send(f, { productId: 1 }).pricingOptions.map((o: any) => o.type)).toEqual(['FIXED', 'DAILY', 'BLOCK']);
  });
  it('old DAILY product: the day box has its price, no table is invented', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: false }, { type: 'DAILY', price: 200000, isDefault: true }] }, outlets, categories);
    expect(f.perDay).toBe(200000);
    expect(f.block).toBeNull();
    expect(send(f, { productId: 1 }).pricingOptions).toEqual([
      { type: 'FIXED', price: 150000, isDefault: true },
      { type: 'DAILY', price: 200000, isDefault: false },
    ]);
  });
  it('only Theo lần (mockup case 4): day box empty, block "Chưa cài", only FIXED is sent', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: true }] }, outlets, categories);
    expect(f.perDay).toBeNull();
    expect(f.block).toBeNull();
    expect(send(f, { productId: 1 }).pricingOptions).toEqual([{ type: 'FIXED', price: 150000, isDefault: true }]);
  });
  it('a table with a day price and no Theo lần: both are kept', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'DAILY', price: 90000 }, blockOpt] }, outlets, categories);
    expect(f.perDay).toBe(90000);
    expect(send(f, { productId: 1 }).pricingOptions.map((o: any) => o.type)).toEqual(['DAILY', 'BLOCK']);
  });
});

describe('payload details', () => {
  it('no price rights: no pricing keys at all', () => {
    const body = buildPayload({ ...fresh(), perRental: 1 }, { canEditPricing: false }) as any;
    expect(body).not.toHaveProperty('pricingOptions');
    expect(body).not.toHaveProperty('pricingSchemaVersion');
  });
  it('buildPricingOptions is the one place that decides what is sent', () => {
    expect(buildPricingOptions({ perRental: 0, perDay: null, block: null })).toEqual([{ type: 'FIXED', price: 0, isDefault: true }]);
  });
});

describe('setup screen helpers', () => {
  it('Sao chép từ sản phẩm khác: the table and the rule past the last day, nothing else', () => {
    const f = formFromProduct({ name: 'B', rentPrice: 1, salePrice: 9, deposit: 5, pricingOptions: [blockOpt], outletStock: [] }, outlets, categories);
    expect(f.block).toEqual(table);
  });
});
