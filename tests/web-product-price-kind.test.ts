/**
 * #1249 product form: ONE choice, "Theo lần" or "Theo ngày" (= the day-block table on the form itself). No
 * "mặc định tính" switch. Old DAILY products open with the table filled from their day price and save as before
 * when the table is left alone. Pure modules; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/block-pricing') as object),
}));
import { blockToSave, seedFromDaily } from '../apps/client/app/products/block-model';
import {
  buildPayload,
  emptyForm,
  formFromProduct,
  validateForm,
  type FormState,
  type ProductSource,
} from '../apps/client/app/products/form/form-model';

const outlets = [{ id: 1, name: 'Main' }];
const categories = [{ id: 7 }];
const base = (over: Partial<ProductSource> = {}): ProductSource =>
  ({ id: 12, name: 'Áo dài', category: { id: 7 }, outletStock: [{ outletId: 1, stock: 2 }], images: [], ...over }) as ProductSource;

const filled = (over: Partial<FormState> = {}): FormState => ({
  ...emptyForm(outlets, categories, '123'),
  name: 'Vest',
  totalStock: 2,
  outletStock: [{ outletId: 1, stock: 2 }],
  ...over,
});

const tableOptions = {
  type: 'BLOCK',
  price: 80000,
  isDefault: true,
  blockTiers: [80000, 100000, 120000],
  blockStartDay: null,
  blockExtraMode: 'EXTRA_PER_DAY',
  blockExtraPrice: 20000,
};

describe('the kind a product opens with', () => {
  it('new product: Theo lần, an empty table ready for Theo ngày', () => {
    const f = emptyForm(outlets, categories, '1');
    expect(f.priceKind).toBe('ONCE');
    expect(f.block).toEqual({ tiers: [null], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: null });
  });

  it('per-rental product: Theo lần', () => {
    const f = formFromProduct(base({ pricingType: 'FIXED', pricingOptions: [{ type: 'FIXED', price: 250000, isDefault: true }] }), outlets, categories);
    expect(f.priceKind).toBe('ONCE');
    expect(f.perRental).toBe(250000);
  });

  it('old DAILY product without a table: Theo ngày, row 1 = the day price, +the day price per extra day', () => {
    const f = formFromProduct(base({ pricingType: 'DAILY', pricingOptions: [{ type: 'DAILY', price: 150000, isDefault: true }] }), outlets, categories);
    expect(f.priceKind).toBe('DAY');
    expect(f.block).toEqual({ tiers: [150000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 150000 });
    expect(f.perDay).toBe(150000);
  });

  it('product with a saved table: Theo ngày with that table', () => {
    const f = formFromProduct(base({ pricingType: 'FIXED', pricingOptions: [tableOptions] }), outlets, categories);
    expect(f.priceKind).toBe('DAY');
    expect(f.block).toEqual({ tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000 });
  });

  it('seedFromDaily needs a day price', () => {
    expect(seedFromDaily(null)).toEqual({ tiers: [null], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: null });
    expect(seedFromDaily(0).tiers).toEqual([0]);
  });
});

describe('blockToSave: what the table sends', () => {
  const seed = seedFromDaily(150000);
  it('an untouched seed is the old DAILY price, not a table', () => {
    expect(blockToSave(seed, 150000)).toBeNull();
  });
  it('an edited seed is a table', () => {
    expect(blockToSave({ ...seed, tiers: [150000, 280000] }, 150000)).toEqual({ ...seed, tiers: [150000, 280000] });
  });
  it('an empty table is nothing', () => {
    expect(blockToSave(seedFromDaily(null), null)).toBeNull();
  });
});

describe('payload', () => {
  const hadNothing = { canEditPricing: true as const, productId: 12 };

  it('Theo lần: FIXED default, no table, no schema version on a product that never had one', () => {
    const p = buildPayload(filled({ perRental: 250000 }), { canEditPricing: true });
    expect(p.pricingOptions).toEqual([{ type: 'FIXED', price: 250000, isDefault: true }]);
    expect(p.rentPrice).toBe(250000);
    expect(p).not.toHaveProperty('pricingSchemaVersion');
  });

  it('Theo lần keeps the old day price as a non-default option', () => {
    const p = buildPayload(filled({ perRental: 250000, perDay: 150000 }), { canEditPricing: true });
    expect(p.pricingOptions).toEqual([
      { type: 'FIXED', price: 250000, isDefault: true },
      { type: 'DAILY', price: 150000, isDefault: false },
    ]);
  });

  it('Theo lần on a product that had a table sends schema 2 so the API drops the table', () => {
    const p = buildPayload(filled({ perRental: 250000 }), { ...hadNothing, hadBlock: true });
    expect(p.pricingSchemaVersion).toBe(2);
    expect((p.pricingOptions as Array<{ type: string }>).map((o) => o.type)).toEqual(['FIXED']);
  });

  it('Theo ngày with a typed table: BLOCK default, rentPrice = day 1, schema 2', () => {
    const block = { tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY' as const, extraPrice: 20000 };
    const p = buildPayload(filled({ priceKind: 'DAY', block }), { canEditPricing: true });
    expect(p.pricingSchemaVersion).toBe(2);
    expect(p.rentPrice).toBe(80000);
    expect(p.pricingOptions).toEqual([
      { type: 'BLOCK', price: 80000, isDefault: true, blockTiers: [80000, 100000, 120000], blockStartDay: null, blockExtraMode: 'EXTRA_PER_DAY', blockExtraPrice: 20000 },
    ]);
  });

  it('Theo ngày with a typed table keeps other old prices as non-default', () => {
    const block = { tiers: [80000], startDay: 1, extraMode: 'HOLD_LAST' as const, extraPrice: null };
    const p = buildPayload(filled({ priceKind: 'DAY', block, perRental: 250000, perDay: 150000 }), { canEditPricing: true });
    expect((p.pricingOptions as Array<{ type: string; isDefault: boolean }>).map((o) => [o.type, o.isDefault])).toEqual([
      ['FIXED', false],
      ['DAILY', false],
      ['BLOCK', true],
    ]);
  });

  it('old DAILY product, table left alone: saves exactly as before (DAILY default, no schema version)', () => {
    const f = formFromProduct(base({ pricingType: 'DAILY', pricingOptions: [{ type: 'DAILY', price: 150000, isDefault: true }] }), outlets, categories);
    const p = buildPayload({ ...f, totalStock: 2 }, { canEditPricing: true, productId: 12 });
    expect(p.pricingOptions).toEqual([{ type: 'DAILY', price: 150000, isDefault: true }]);
    expect(p.rentPrice).toBe(150000);
    expect(p).not.toHaveProperty('pricingSchemaVersion');
  });
});

describe('validation', () => {
  const ok = { canEditPricing: true };
  it('Theo lần: no price is allowed (as today)', () => {
    expect(validateForm(filled(), ok)).toEqual({});
  });
  it('Theo ngày with nothing typed and no old day price: ask for the table', () => {
    expect(validateForm(filled({ priceKind: 'DAY' }), ok)).toEqual({ block: 'blockEmpty' });
  });
  it('Theo ngày: a half-typed table (empty box, or no extra price) stops the save', () => {
    const half = { tiers: [80000, null], startDay: 1, extraMode: 'EXTRA_PER_DAY' as const, extraPrice: 20000 };
    expect(validateForm(filled({ priceKind: 'DAY', block: half }), ok)).toEqual({ block: 'blockIncomplete' });
    const noExtra = { tiers: [80000], startDay: 1, extraMode: 'EXTRA_PER_DAY' as const, extraPrice: null };
    expect(validateForm(filled({ priceKind: 'DAY', block: noExtra }), ok)).toEqual({ block: 'blockIncomplete' });
  });
  it('Theo ngày: a complete table, or an untouched old DAILY price, saves', () => {
    const full = { tiers: [80000], startDay: 1, extraMode: 'HOLD_LAST' as const, extraPrice: null };
    expect(validateForm(filled({ priceKind: 'DAY', block: full }), ok)).toEqual({});
    const old = formFromProduct(base({ pricingType: 'DAILY', pricingOptions: [{ type: 'DAILY', price: 150000, isDefault: true }] }), outlets, categories);
    expect(validateForm({ ...old, totalStock: 2 }, ok)).toEqual({});
  });
  it('no price rights: the kind is not validated', () => {
    expect(validateForm(filled({ priceKind: 'DAY' }), { canEditPricing: false })).toEqual({});
  });
});
