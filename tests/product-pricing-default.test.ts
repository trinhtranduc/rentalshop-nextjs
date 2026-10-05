/**
 * #460: the web product form and order form follow the iOS pricing rules
 * (`apps/mobile/POS ADBD/Model/ProductsV2.swift`: ProductPricing, ProductFormValidator, CartV2Logic).
 */
import { describe, expect, it } from '@jest/globals';
import { getPreferredPricingOption } from '../packages/utils/src/core/order-line-pricing';
import {
  buildProductPricingOptions,
  getProductDefaultPricingMode,
  getProductRentalPrices,
  offersBothPricingModes,
  validateProductPricing,
} from '../packages/utils/src/core/product-pricing-options';
import { productCreateSchema, productUpdateSchema } from '../packages/utils/src/core/validation-schemas';

const fixed = { id: 1, type: 'FIXED', price: 150_000 };
const daily = { id: 2, type: 'DAILY', price: 100_000 };

describe('new order line starts on the product default (#460)', () => {
  it('per-day default → DAILY', () => {
    expect(getPreferredPricingOption([{ ...fixed, isDefault: false }, { ...daily, isDefault: true }])?.type).toBe('DAILY');
  });

  it('per-rental default → FIXED', () => {
    expect(getPreferredPricingOption([{ ...daily, isDefault: false }, { ...fixed, isDefault: true }])?.type).toBe('FIXED');
  });

  it('only one price → that type', () => {
    expect(getPreferredPricingOption([daily])?.type).toBe('DAILY');
    expect(getPreferredPricingOption([fixed])?.type).toBe('FIXED');
  });

  it('no default flag → first option; inactive options are skipped; none → null', () => {
    expect(getPreferredPricingOption([daily, fixed])?.type).toBe('DAILY');
    expect(getPreferredPricingOption([{ ...daily, isDefault: true, isActive: false }, fixed])?.type).toBe('FIXED');
    expect(getPreferredPricingOption([])).toBeNull();
  });
});

describe('line toggle only when the product offers both (#460)', () => {
  it('both priced → true', () => {
    expect(offersBothPricingModes([fixed, daily])).toBe(true);
  });

  it('one mode, a zero price, an inactive option or none → false', () => {
    expect(offersBothPricingModes([fixed])).toBe(false);
    expect(offersBothPricingModes([fixed, { ...daily, price: 0 }])).toBe(false);
    expect(offersBothPricingModes([fixed, { ...daily, isActive: false }])).toBe(false);
    expect(offersBothPricingModes(null)).toBe(false);
  });
});

describe('product form prices (#460)', () => {
  it('reads the saved default mode', () => {
    expect(getProductDefaultPricingMode({ pricingOptions: [fixed, { ...daily, isDefault: true }] })).toBe('DAILY');
    expect(getProductDefaultPricingMode({ pricingOptions: [{ ...fixed, isDefault: true }, daily] })).toBe('FIXED');
    expect(getProductDefaultPricingMode({ pricingType: 'DAILY' })).toBe('DAILY');
    expect(getProductDefaultPricingMode({})).toBe('FIXED');
  });

  it('reads both prices, and the legacy rent price by pricing type', () => {
    expect(getProductRentalPrices({ pricingOptions: [fixed, daily] })).toEqual({ perRental: 150_000, perDay: 100_000 });
    expect(getProductRentalPrices({ pricingOptions: [daily] })).toEqual({ perRental: null, perDay: 100_000 });
    expect(getProductRentalPrices({ rentPrice: 50_000, pricingType: 'DAILY' })).toEqual({ perRental: null, perDay: 50_000 });
    expect(getProductRentalPrices({ rentPrice: 50_000 })).toEqual({ perRental: 50_000, perDay: null });
    expect(getProductRentalPrices({ rentPrice: 0 })).toEqual({ perRental: null, perDay: null });
  });

  it('builds the options the mobile apps send: priced only, one default', () => {
    expect(buildProductPricingOptions(150_000, 100_000, 'DAILY')).toEqual([
      { type: 'FIXED', price: 150_000, isDefault: false },
      { type: 'DAILY', price: 100_000, isDefault: true },
    ]);
    expect(buildProductPricingOptions(150_000, 100_000, 'FIXED')).toEqual([
      { type: 'FIXED', price: 150_000, isDefault: true },
      { type: 'DAILY', price: 100_000, isDefault: false },
    ]);
    // A default without a price falls back to the mode that has one
    expect(buildProductPricingOptions(null, 100_000, 'FIXED')).toEqual([{ type: 'DAILY', price: 100_000, isDefault: true }]);
    expect(buildProductPricingOptions(150_000, 0, 'DAILY')).toEqual([{ type: 'FIXED', price: 150_000, isDefault: true }]);
    expect(buildProductPricingOptions(null, null, 'FIXED')).toEqual([]);
  });

  it('blocks a per-day default without a per-day price', () => {
    expect(validateProductPricing({ perRental: 150_000, perDay: null, defaultMode: 'DAILY' })).toEqual(['perDayDefaultNeedsPrice']);
    expect(validateProductPricing({ perRental: 150_000, perDay: 0, defaultMode: 'DAILY' })).toEqual(['perDayDefaultNeedsPrice']);
  });

  it('accepts both prices empty, one price, or a per-day default with a per-day price', () => {
    expect(validateProductPricing({ perRental: null, perDay: null, defaultMode: 'FIXED' })).toEqual([]);
    expect(validateProductPricing({ perRental: null, perDay: 100_000, defaultMode: 'FIXED' })).toEqual([]);
    expect(validateProductPricing({ perRental: 150_000, perDay: 100_000, defaultMode: 'DAILY' })).toEqual([]);
  });

  it('rejects a negative price', () => {
    expect(validateProductPricing({ perRental: -1, perDay: null, defaultMode: 'FIXED' })).toEqual(['negativeAmount']);
  });
});

describe('the API accepts the web payload (#460)', () => {
  // Same schemas as POST /api/products and PUT /api/products/[id]
  const base = { name: 'Áo dài', deposit: 0, outletStock: [{ outletId: 1, stock: 2 }] };

  it('per-day default, no pricingType sent', () => {
    const pricingOptions = buildProductPricingOptions(150_000, 100_000, 'DAILY');
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 100_000, pricingOptions }).success).toBe(true);
    expect(productUpdateSchema.safeParse({ ...base, id: 5, rentPrice: 100_000, pricingOptions }).success).toBe(true);
  });

  it('no rental price: rentPrice 0 and empty options', () => {
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 0, pricingOptions: [] }).success).toBe(true);
    expect(productUpdateSchema.safeParse({ ...base, id: 5, rentPrice: 0, pricingOptions: [] }).success).toBe(true);
  });
});
