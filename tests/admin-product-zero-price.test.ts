/**
 * #952 item 6: the admin product form (packages/ui ProductForm, used by apps/admin "Edit Product") keeps a 0đ price.
 * Same rule as the shop web form after #951 (apps/client/app/products/form/form-model.ts):
 * an empty price box is no price, "0" is a 0đ price.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from '@jest/globals';
import {
  buildProductFormPricing,
  buildProductPricingOptions,
  getProductRentalPrices,
  readPriceBox,
  validateProductPricing,
} from '../packages/utils/src/core/product-pricing-options';

describe('admin product form keeps 0đ (#952)', () => {
  it('reads a saved 0đ option as a 0đ price, a missing option as no price', () => {
    expect(getProductRentalPrices({ pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] })).toEqual({ perRental: 0, perDay: null });
    expect(
      getProductRentalPrices({ pricingOptions: [{ type: 'FIXED', price: 150_000 }, { type: 'DAILY', price: 0, isDefault: true }] }),
    ).toEqual({ perRental: 150_000, perDay: 0 });
    // A product without options: rentPrice 0 there is "no price" (legacy rows, as on the shop web form)
    expect(getProductRentalPrices({ rentPrice: 0 })).toEqual({ perRental: null, perDay: null });
  });

  it('a 0 price box sends a 0đ option; an empty box sends none', () => {
    expect(buildProductPricingOptions(0, null, 'FIXED')).toEqual([{ type: 'FIXED', price: 0, isDefault: true }]);
    expect(buildProductPricingOptions(150_000, 0, 'DAILY')).toEqual([
      { type: 'FIXED', price: 150_000, isDefault: false },
      { type: 'DAILY', price: 0, isDefault: true },
    ]);
    expect(buildProductPricingOptions(null, null, 'FIXED')).toEqual([]);
    expect(buildProductPricingOptions(undefined, 100_000, 'FIXED')).toEqual([{ type: 'DAILY', price: 100_000, isDefault: true }]);
  });

  it('a per-day default may be 0đ, but not empty', () => {
    expect(validateProductPricing({ perRental: null, perDay: 0, defaultMode: 'DAILY' })).toEqual([]);
    expect(validateProductPricing({ perRental: 0, perDay: null, defaultMode: 'DAILY' })).toEqual(['perDayDefaultNeedsPrice']);
  });

  it('a price box: empty is null, "0" is 0, digits are a number', () => {
    expect(readPriceBox('')).toBeNull();
    expect(readPriceBox('   ')).toBeNull();
    expect(readPriceBox('0')).toBe(0);
    expect(readPriceBox('150,000')).toBe(150_000);
    expect(readPriceBox('12.5')).toBe(12.5);
  });

  it('editing a 0đ product without touching the prices saves the same 0đ', () => {
    const product = { rentPrice: 0, salePrice: 0, pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] };
    const { perRental, perDay } = getProductRentalPrices(product);
    expect(buildProductFormPricing({ perRental, perDay, defaultMode: 'FIXED', salePrice: null })).toEqual({
      rentPrice: 0,
      pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }],
    });
  });

  it('the sale price: a typed 0 is sent as 0đ, an empty box sends nothing', () => {
    expect(buildProductFormPricing({ perRental: 100_000, perDay: null, defaultMode: 'FIXED', salePrice: 0 })).toEqual({
      rentPrice: 100_000,
      salePrice: 0,
      pricingOptions: [{ type: 'FIXED', price: 100_000, isDefault: true }],
    });
    expect(buildProductFormPricing({ perRental: null, perDay: null, defaultMode: 'FIXED', salePrice: null })).toEqual({
      rentPrice: 0,
      pricingOptions: [],
    });
  });

  it('ProductForm uses these rules: nullable price boxes, no "sale price required"', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../packages/ui/src/components/forms/ProductForm.tsx'), 'utf8');
    expect(src).toMatch(/buildProductFormPricing\(/);
    expect(src).not.toMatch(/salePrice\s*<=\s*0/);
    expect(src).not.toMatch(/perRental \?\? 0|perDay \?\? 0/);
  });
});
