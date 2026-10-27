/**
 * #1249 web product form, design fixed by the owner's mockup: "Thuê theo lần" always, then ONE of "Thuê theo ngày" (one
 * day price) or "Giá theo khối ngày" (the table, set up on its own screen). Pure model; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildPayload,
  buildPricingOptions,
  chooseDayKind,
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

describe('new product', () => {
  it('starts on Thuê theo ngày with empty boxes (mockup case 1)', () => {
    const f = fresh();
    expect(f.dayKind).toBe('DAY');
    expect(f.perRental).toBeNull();
    expect(f.perDay).toBeNull();
    expect(f.block).toBeNull();
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

  it('without a Theo lần price the day price is the default', () => {
    expect(send({ ...fresh(), perDay: 80000 }).pricingOptions).toEqual([{ type: 'DAILY', price: 80000, isDefault: true }]);
    expect(send(fresh()).pricingOptions).toEqual([]);
  });
});

describe('radio: Thuê theo ngày | Giá theo khối ngày', () => {
  it('Thuê theo ngày sends FIXED + DAILY and no BLOCK', () => {
    const f = { ...fresh(), perRental: 150000, perDay: 80000, block: table };
    const body = send(f);
    expect(body.pricingOptions.map((o: any) => o.type)).toEqual(['FIXED', 'DAILY']);
  });

  it('Giá theo khối ngày sends FIXED + BLOCK and no flat DAILY', () => {
    const f = saveBlockTable({ ...fresh(), perRental: 150000, perDay: 80000 }, table);
    expect(f.dayKind).toBe('BLOCK');
    const body = send(f);
    expect(body.pricingOptions).toEqual([
      { type: 'FIXED', price: 150000, isDefault: true },
      { type: 'BLOCK', price: 80000, isDefault: false, blockTiers: [80000, 100000, 120000], blockStartDay: null, blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000 },
    ]);
    expect(body.rentPrice).toBe(150000);
    expect(body.pricingSchemaVersion).toBe(2);
  });

  it('only a table: BLOCK is the default and rentPrice is day 1', () => {
    const body = send(saveBlockTable(fresh(), { ...table, startDay: 2, extraMode: 'HOLD_LAST', extraPrice: null }));
    expect(body.pricingOptions).toEqual([
      { type: 'BLOCK', price: 80000, isDefault: true, blockTiers: [80000, 100000, 120000], blockStartDay: 2, blockExtraMode: 'HOLD_LAST', blockExtraPrice: null },
    ]);
    expect(body.rentPrice).toBe(80000);
  });

  it('switching back and forth keeps what was typed', () => {
    let f = { ...fresh(), perRental: 150000, perDay: 80000 };
    f = saveBlockTable(f, table);
    const day = chooseDayKind(f, 'DAY').form;
    expect(day.dayKind).toBe('DAY');
    expect(day.perDay).toBe(80000);
    expect(day.block).toEqual(table);
    const again = chooseDayKind(day, 'BLOCK');
    expect(again.openSetup).toBe(false);
    expect(again.form.dayKind).toBe('BLOCK');
    expect(again.form.block).toEqual(table);
  });

  it('choosing Giá theo khối ngày without a table opens the setup and keeps the previous choice until it is saved', () => {
    const f = { ...fresh(), perDay: 80000 };
    const r = chooseDayKind(f, 'BLOCK');
    expect(r.openSetup).toBe(true);
    expect(r.form.dayKind).toBe('DAY');
    expect(r.form).toEqual(f);
    // cancel = keep r.form; saving = saveBlockTable
    expect(saveBlockTable(r.form, table).dayKind).toBe('BLOCK');
  });

  it('Tắt giá theo khối ngày = back to Thuê theo ngày, the day price stays', () => {
    const off = turnOffBlock(saveBlockTable({ ...fresh(), perDay: 80000 }, table));
    expect(off.dayKind).toBe('DAY');
    expect(off.block).toBeNull();
    expect(off.perDay).toBe(80000);
    expect(send(off).pricingOptions.map((o: any) => o.type)).toEqual(['DAILY']);
  });
});

describe('opening a saved product', () => {
  const base = { id: 1, name: 'Áo', rentPrice: 150000, outletStock: [] };
  it('with a table: Giá theo khối ngày', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: true }, blockOpt] }, outlets, categories);
    expect(f.dayKind).toBe('BLOCK');
    expect(f.block).toEqual(table);
    expect(f.perRental).toBe(150000);
  });
  it('old DAILY product: Thuê theo ngày with its price, never turned into a table', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: false }, { type: 'DAILY', price: 200000, isDefault: true }] }, outlets, categories);
    expect(f.dayKind).toBe('DAY');
    expect(f.perDay).toBe(200000);
    expect(f.block).toBeNull();
    const body = send(f, { productId: 1 });
    expect(body.pricingOptions).toEqual([
      { type: 'FIXED', price: 150000, isDefault: true },
      { type: 'DAILY', price: 200000, isDefault: false },
    ]);
  });
  it('only Theo lần: Thuê theo ngày is chosen with an empty day box', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: true }] }, outlets, categories);
    expect(f.dayKind).toBe('DAY');
    expect(f.perDay).toBeNull();
    expect(send(f, { productId: 1 }).pricingOptions).toEqual([{ type: 'FIXED', price: 150000, isDefault: true }]);
  });
  it('a product with a table AND a day price keeps the day price in memory, sends only the table', () => {
    const f = formFromProduct({ ...base, pricingOptions: [{ type: 'DAILY', price: 90000 }, blockOpt] }, outlets, categories);
    expect(f.dayKind).toBe('BLOCK');
    expect(f.perDay).toBe(90000);
    expect(send(f, { productId: 1 }).pricingOptions.map((o: any) => o.type)).toEqual(['BLOCK']);
  });
});

describe('payload details', () => {
  it('edit from a table back to Thuê theo ngày still says schema 2, so the API drops the saved table', () => {
    const body = send(turnOffBlock(saveBlockTable({ ...fresh(), perDay: 80000 }, table)), { productId: 1 });
    expect(body.pricingSchemaVersion).toBe(2);
  });
  it('no price rights: no pricing keys at all', () => {
    const body = buildPayload({ ...fresh(), perRental: 1 }, { canEditPricing: false }) as any;
    expect(body).not.toHaveProperty('pricingOptions');
    expect(body).not.toHaveProperty('pricingSchemaVersion');
  });
  it('buildPricingOptions is the one place that decides what is sent', () => {
    expect(buildPricingOptions({ perRental: 0, perDay: null, dayKind: 'DAY', block: null })).toEqual([{ type: 'FIXED', price: 0, isDefault: true }]);
  });
});

describe('setup screen helpers', () => {
  it('Sao chép từ sản phẩm khác: the table and the rule past the last day, nothing else', () => {
    const f = formFromProduct({ name: 'B', rentPrice: 1, salePrice: 9, deposit: 5, pricingOptions: [blockOpt], outletStock: [] }, outlets, categories);
    expect(f.block).toEqual(table);
  });
});
