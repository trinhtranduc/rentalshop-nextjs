/**
 * #547 shop web product form (create + edit): form state from a product, pricing options, validation,
 * create / update payload, photo checks; #825 branch roles send only their own stock. Pure module; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  MAX_PHOTO_BYTES,
  buildPayload,
  buildPricingOptions,
  checkPhotos,
  defaultModeOf,
  emptyForm,
  firstError,
  formFromProduct,
  generateBarcode,
  imageSearchState,
  imagesOf,
  isBranchRole,
  sharedFieldsLockedFor,
  branchHoldsProduct,
  roleMayCreateProducts,
  parseCount,
  removedAllSavedPhotos,
  rentalPricesOf,
  setOutletStock,
  setTotalStock,
  validateForm,
  type FormState,
  type ProductSource,
} from '../apps/client/app/products/form/form-model';

const outlets = [
  { id: 1, name: 'Main' },
  { id: 3, name: 'Outlet 2' },
];
const categories = [{ id: 7 }, { id: 8 }];

const product: ProductSource = {
  id: 12,
  name: 'Áo dài lụa đỏ',
  description: 'Lụa tơ tằm',
  barcode: '8930001234',
  category: { id: 8, name: 'Áo dài' },
  rentPrice: 150000,
  salePrice: 0,
  costPrice: null,
  deposit: 500000,
  pricingType: 'FIXED',
  pricingOptions: [
    { type: 'FIXED', price: 250000, isDefault: false },
    { type: 'DAILY', price: 150000, isDefault: true },
  ],
  images: ['https://img/a.jpg', 'https://img/b.jpg'],
  outletStock: [{ stock: 2, outlet: { id: 1 } }, { outletId: 9, stock: 5 }],
};

const valid = (over: Partial<FormState> = {}): FormState => ({
  ...emptyForm(outlets, categories, '123'),
  name: 'Vest',
  salePrice: 100,
  totalStock: 2,
  outletStock: [
    { outletId: 1, stock: 2 },
    { outletId: 3, stock: 0 },
  ],
  ...over,
});

describe('pricing', () => {
  it('reads both prices and the default from options', () => {
    expect(rentalPricesOf(product)).toEqual({ perRental: 250000, perDay: 150000 });
    expect(defaultModeOf(product)).toBe('DAILY');
  });

  it('falls back to rentPrice by pricingType without options', () => {
    expect(rentalPricesOf({ rentPrice: 90, pricingType: 'DAILY', pricingOptions: [] })).toEqual({ perRental: null, perDay: 90 });
    expect(rentalPricesOf({ rentPrice: '20', pricingType: null })).toEqual({ perRental: 20, perDay: null });
    expect(defaultModeOf({ pricingType: null, pricingOptions: [] })).toBe('FIXED');
  });

  it('ignores inactive options', () => {
    expect(rentalPricesOf({ pricingOptions: [{ type: 'DAILY', price: 5, isActive: false }, { type: 'FIXED', price: 7 }] })).toEqual({ perRental: 7, perDay: null });
  });

  it('builds priced options with one default, falling back to the priced mode', () => {
    const of = (perRental: number | null, perDay: number | null) => buildPricingOptions({ perRental, perDay, dayKind: 'DAY', block: null });
    expect(of(250, 150)).toEqual([
      { type: 'FIXED', price: 250, isDefault: true },
      { type: 'DAILY', price: 150, isDefault: false },
    ]);
    expect(of(250, null)).toEqual([{ type: 'FIXED', price: 250, isDefault: true }]);
    expect(of(null, 80)).toEqual([{ type: 'DAILY', price: 80, isDefault: true }]);
    expect(of(null, null)).toEqual([]);
  });
});

describe('form state', () => {
  it('new product: first category, generated code, every outlet at 0', () => {
    const f = emptyForm(outlets, categories, '55');
    expect(f.categoryId).toBe(7);
    expect(f.barcode).toBe('55');
    expect(f.outletStock).toEqual([
      { outletId: 1, stock: 0 },
      { outletId: 3, stock: 0 },
    ]);
    expect(emptyForm([], [], '').categoryId).toBe(0);
  });

  it('edit: saved values, one row per shop outlet, total = sum of those rows', () => {
    const f = formFromProduct(product, outlets, categories);
    expect(f).toMatchObject({
      name: 'Áo dài lụa đỏ',
      categoryId: 8,
      perRental: 250000,
      perDay: 150000,
      dayKind: 'DAY',
      deposit: 500000,
      salePrice: null,
      costPrice: 0,
      keptImages: ['https://img/a.jpg', 'https://img/b.jpg'],
    });
    // outlet 9 is not one of the shop outlets the form shows
    expect(f.outletStock).toEqual([
      { outletId: 1, stock: 2 },
      { outletId: 3, stock: 0 },
    ]);
    expect(f.totalStock).toBe(2);
  });

  it('reads images from arrays, JSON strings and comma strings', () => {
    expect(imagesOf('["https://a", " https://b "]')).toEqual(['https://a', 'https://b']);
    expect(imagesOf('https://a,https://b,')).toEqual(['https://a', 'https://b']);
    expect(imagesOf(['uploading-x', 'https://a', null])).toEqual(['https://a']);
    expect(imagesOf('[bad')).toEqual([]);
    expect(imagesOf(undefined)).toEqual([]);
  });

  it('several outlets: total follows the sum', () => {
    let f = valid();
    f = setOutletStock(f, 3, 4);
    expect(f.totalStock).toBe(6);
    f = setOutletStock(f, 1, 0);
    expect(f.totalStock).toBe(4);
  });

  it('one outlet: the quantity box sets that outlet', () => {
    const one = emptyForm([outlets[0]], categories, '1');
    const f = setTotalStock(one, 5);
    expect(f.totalStock).toBe(5);
    expect(f.outletStock).toEqual([{ outletId: 1, stock: 5 }]);
    expect(setOutletStock(one, 1, 3).totalStock).toBe(3);
  });

  it('quantity text keeps digits only', () => {
    expect(parseCount('1.2a3')).toBe(123);
    expect(parseCount('')).toBe(0);
  });

  it('barcode: 8 clock digits + 3 random digits', () => {
    expect(generateBarcode(1_759_000_123_456, 0.042)).toBe('00123456042');
    expect(generateBarcode(1_759_000_123_456, 0.9999)).toBe('00123456999');
  });
});

describe('validation', () => {
  it('passes a complete form', () => {
    expect(validateForm(valid(), { canEditPricing: true })).toEqual({});
  });

  it('name, category and quantity are required', () => {
    const e = validateForm(valid({ name: '  ', categoryId: 0, totalStock: 0 }), { canEditPricing: false });
    expect(e).toEqual({ name: 'nameRequired', categoryId: 'categoryRequired', totalStock: 'stockRequired' });
    expect(firstError(e)).toBe('name');
  });

  it('price rules only when prices are shown', () => {
    const f = valid({ salePrice: null, perDay: null, perRental: -1 });
    expect(validateForm(f, { canEditPricing: true })).toEqual({ perRental: 'priceNegative' });
    expect(validateForm(f, { canEditPricing: false })).toEqual({});
  });

  it('a product for rent only can be saved without a sale price (#741)', () => {
    const f = valid({ salePrice: null, perRental: 135000, perDay: null });
    expect(validateForm(f, { canEditPricing: true })).toEqual({});
    expect(buildPayload(f, { canEditPricing: true, productId: 5 })).not.toHaveProperty('salePrice');
  });

  it('negative deposit or outlet stock', () => {
    const f = valid({ deposit: -5, outletStock: [{ outletId: 1, stock: -1 }] });
    expect(validateForm(f, { canEditPricing: false })).toEqual({ deposit: 'depositNegative', outletStock: 'outletStockNegative' });
  });
});

describe('payload', () => {
  it('create with price rights: options, default price as rentPrice, sale and cost', () => {
    const f = valid({ perRental: 250, perDay: 150, costPrice: 90, description: 'x', barcode: ' 77 ' });
    expect(buildPayload(f, { canEditPricing: true })).toEqual({
      name: 'Vest',
      description: 'x',
      barcode: '77',
      categoryId: 7,
      totalStock: 2,
      deposit: 0,
      outletStock: [
        { outletId: 1, stock: 2 },
        { outletId: 3, stock: 0 },
      ],
      rentPrice: 250,
      salePrice: 100,
      costPrice: 90,
      pricingOptions: [
        { type: 'FIXED', price: 250, isDefault: true },
        { type: 'DAILY', price: 150, isDefault: false },
      ],
      pricingSchemaVersion: 2,
      images: [],
    });
  });

  it('no typed prices for a user without price rights (OUTLET_STAFF); create sends the required rentPrice 0', () => {
    const p = buildPayload(valid({ perRental: 250, salePrice: 9, costPrice: 4 }), { canEditPricing: false });
    expect(p.rentPrice).toBe(0);
    expect(p).not.toHaveProperty('salePrice');
    expect(p).not.toHaveProperty('costPrice');
    expect(p).not.toHaveProperty('pricingOptions');
    expect(p.deposit).toBe(0);
    // Edit never sends prices without price rights (the API keeps the saved ones)
    const edit = buildPayload(valid({ perRental: 250 }), { canEditPricing: false, productId: 5 });
    expect(edit).not.toHaveProperty('rentPrice');
    expect(edit).not.toHaveProperty('pricingOptions');
  });

  it('no prices typed: rentPrice 0 and an empty options list (clears both)', () => {
    const p = buildPayload(valid(), { canEditPricing: true });
    expect(p.rentPrice).toBe(0);
    expect(p.pricingOptions).toEqual([]);
    expect(p).not.toHaveProperty('costPrice');
  });

  it('edit: id, stock, merchant and the kept photos', () => {
    const f = { ...formFromProduct(product, outlets, categories), keptImages: ['https://img/b.jpg'] };
    const p = buildPayload(f, { canEditPricing: true, productId: 12, merchantId: 1 });
    expect(p).toMatchObject({ id: 12, merchantId: 1, stock: 2, totalStock: 2, images: ['https://img/b.jpg'], rentPrice: 250000 });
    expect(p).not.toHaveProperty('salePrice');
  });
});

describe('photos', () => {
  const file = (name: string, type: string, size = 1000) => ({ name, type, size });

  it('accepts jpg / png / webp up to 5 MB, three in total', () => {
    const r = checkPhotos(1, [
      file('a.jpg', 'image/jpeg'),
      file('b.gif', 'image/gif'),
      file('c.png', 'image/png', MAX_PHOTO_BYTES + 1),
      file('d.webp', 'image/webp'),
      file('e.png', 'image/png'),
      file('f.JPG', ''),
    ]);
    expect(r.accepted.map((f) => f.name)).toEqual(['a.jpg', 'd.webp']);
    expect(r.rejected).toEqual([
      { name: 'b.gif', problem: 'type' },
      { name: 'c.png', problem: 'size' },
      { name: 'e.png', problem: 'count' },
      { name: 'f.JPG', problem: 'count' },
    ]);
  });

  it('flags removing every saved photo without a new one', () => {
    expect(removedAllSavedPhotos(2, 0, 0)).toBe(true);
    expect(removedAllSavedPhotos(2, 0, 1)).toBe(false);
    expect(removedAllSavedPhotos(0, 0, 0)).toBe(false);
  });

  it('image search state', () => {
    expect(imageSearchState(null, true)).toBe('updating');
    expect(imageSearchState('2026-10-06T00:00:00Z', false)).toBe('ready');
    expect(imageSearchState(null, false)).toBe('none');
  });
});

describe('branch roles (#825)', () => {
  it('OUTLET_ADMIN, OUTLET_STAFF and OUTLET_INVENTORY are branch roles; MERCHANT and ADMIN are not', () => {
    expect(['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'].every(isBranchRole)).toBe(true);
    expect(isBranchRole('MERCHANT')).toBe(false);
    expect(isBranchRole('ADMIN')).toBe(false);
    expect(isBranchRole(undefined)).toBe(false);
  });

  it('outlet staff do not add products; the other roles may (owner 2026-10-11)', () => {
    expect(roleMayCreateProducts('OUTLET_STAFF')).toBe(false);
    for (const role of ['MERCHANT', 'ADMIN', 'OUTLET_ADMIN', 'OUTLET_INVENTORY']) expect(roleMayCreateProducts(role)).toBe(true);
  });

  it('a branch holds a product when its row there has stock or rented units (a 0 row from #825 is not holding)', () => {
    expect(branchHoldsProduct({ outletStock: [{ outlet: { id: 1 }, stock: 2 }] }, 1)).toBe(true);
    expect(branchHoldsProduct({ outletStock: [{ outletId: 1, stock: 0 }] }, 1)).toBe(false);
    expect(branchHoldsProduct({ outletStock: [{ outletId: 1, stock: 0, renting: 1 }] }, 1)).toBe(true);
    expect(branchHoldsProduct({ outletStock: [{ outletId: 3, stock: 2 }] }, 1)).toBe(false);
  });

  it('only OUTLET_STAFF has the shared fields locked (owner 2026-10-11)', () => {
    expect(sharedFieldsLockedFor('OUTLET_STAFF')).toBe(true);
    for (const role of ['MERCHANT', 'ADMIN', 'OUTLET_ADMIN', 'OUTLET_INVENTORY']) expect(sharedFieldsLockedFor(role)).toBe(false);
  });

  it('edit by OUTLET_STAFF (stockOnly): only the id and the own branch stock, nothing shared', () => {
    const f = setOutletStock(formFromProduct(product, outlets, categories), 3, 4);
    expect(buildPayload(f, { canEditPricing: false, productId: 12, merchantId: 1, branchOutletId: 3, stockOnly: true })).toEqual({
      id: 12,
      outletStock: [{ outletId: 3, stock: 4 }],
    });
  });

  it('edit by OUTLET_ADMIN / kho: the whole product with the own branch stock only', () => {
    const f = { ...setOutletStock(formFromProduct(product, outlets, categories), 3, 4), name: 'Áo dài xanh' };
    const p = buildPayload(f, { canEditPricing: true, productId: 12, merchantId: 1, branchOutletId: 3 });
    expect(p).toMatchObject({ id: 12, name: 'Áo dài xanh', outletStock: [{ outletId: 3, stock: 4 }] });
    expect(p).toHaveProperty('pricingOptions');
  });

  it('create: the full product with the own branch stock only (the API adds 0 at the other branches)', () => {
    const p = buildPayload(valid(), { canEditPricing: true, branchOutletId: 1 });
    expect(p.name).toBe('Vest');
    expect(p.outletStock).toEqual([{ outletId: 1, stock: 2 }]);
  });
});

// #951: 0đ is a price; an empty box is no price
describe('0đ prices (#951)', () => {
  it('a new form starts with empty prices (not 0đ)', () => {
    const f = emptyForm(outlets, categories, '1');
    expect([f.perRental, f.perDay, f.salePrice]).toEqual([null, null, null]);
  });

  it('reads a 0đ option as a price, a legacy rentPrice 0 without options as no price', () => {
    expect(rentalPricesOf({ pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] })).toEqual({ perRental: 0, perDay: null });
    expect(rentalPricesOf({ pricingOptions: [{ type: 'DAILY', price: '0' }] })).toEqual({ perRental: null, perDay: 0 });
    expect(rentalPricesOf({ rentPrice: 0, pricingType: 'FIXED', pricingOptions: [] })).toEqual({ perRental: null, perDay: null });
    expect(rentalPricesOf({ pricingOptions: [{ type: 'FIXED', price: null }] })).toEqual({ perRental: null, perDay: null });
  });

  it('edit form of a 0đ product shows 0, not empty', () => {
    const f = formFromProduct({ ...product, salePrice: 0, pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] }, outlets, categories);
    expect(f.perRental).toBe(0);
    expect(f.perDay).toBeNull();
    expect(f.dayKind).toBe('DAY');
  });

  it('builds a 0đ option, and a default on it', () => {
    const of = (perRental: number | null, perDay: number | null) => buildPricingOptions({ perRental, perDay, dayKind: 'DAY', block: null });
    expect(of(0, null)).toEqual([{ type: 'FIXED', price: 0, isDefault: true }]);
    expect(of(null, 0)).toEqual([{ type: 'DAILY', price: 0, isDefault: true }]);
    expect(of(0, 50)).toEqual([
      { type: 'FIXED', price: 0, isDefault: true },
      { type: 'DAILY', price: 50, isDefault: false },
    ]);
  });

  it('validation accepts 0đ prices and still refuses negatives', () => {
    expect(validateForm(valid({ perRental: 0, perDay: 0, salePrice: 0 }), { canEditPricing: true })).toEqual({});
    expect(validateForm(valid({ perDay: 0 }), { canEditPricing: true })).toEqual({});
    expect(validateForm(valid({ perDay: -1 }), { canEditPricing: true })).toEqual({ perRental: 'priceNegative' });
    expect(validateForm(valid({ salePrice: -1 }), { canEditPricing: true })).toEqual({ salePrice: 'priceNegative' });
  });

  it('payload sends the 0đ rent option and a 0đ sale price; an empty sale box sends nothing', () => {
    const p = buildPayload(valid({ perRental: 0, salePrice: 0 }), { canEditPricing: true });
    expect(p).toMatchObject({ rentPrice: 0, salePrice: 0, pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] });
    const edit = buildPayload(valid({ perRental: 0, salePrice: null }), { canEditPricing: true, productId: 5 });
    expect(edit.pricingOptions).toEqual([{ type: 'FIXED', price: 0, isDefault: true }]);
    expect(edit).not.toHaveProperty('salePrice');
  });
});
