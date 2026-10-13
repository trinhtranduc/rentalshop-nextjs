/**
 * #951: a product may be priced 0đ (rent and sale), and an order line may be given free (unit price 0).
 * 0 is a real price; only a missing price asks for one. Negative prices stay refused.
 * Pure schemas and helpers; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  orderCreateSchema,
  orderUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
} from '../packages/utils/src/core/validation-schemas';
import { ProductCreateSchema, ProductUpdateSchema } from '../packages/validation/src/product';
import { normalizePricingOptions } from '../packages/database/src/product-pricing-normalize';
import { changedSharedFields } from '../apps/api/lib/product-branch-rules';

const base = { name: 'Túi quà', deposit: 0, outletStock: [{ outletId: 1, stock: 5 }] };

describe('POST /api/products and PUT /api/products/[id] schemas (#951)', () => {
  it('accept a 0đ per-rental or per-day option', () => {
    const fixed0 = [{ type: 'FIXED', price: 0, isDefault: true }];
    const daily0 = [{ type: 'DAILY', price: 0, isDefault: true }];
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 0, pricingOptions: fixed0 }).success).toBe(true);
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 0, pricingOptions: daily0 }).success).toBe(true);
    expect(productUpdateSchema.safeParse({ ...base, id: 5, rentPrice: 0, pricingOptions: fixed0 }).success).toBe(true);
  });

  it('accept a 0đ sale price', () => {
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 0, salePrice: 0 }).success).toBe(true);
    expect(productUpdateSchema.safeParse({ id: 5, salePrice: 0 }).success).toBe(true);
  });

  it('still refuse a negative price', () => {
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 0, pricingOptions: [{ type: 'FIXED', price: -1, isDefault: true }] }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, rentPrice: -1 }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, rentPrice: 0, salePrice: -5 }).success).toBe(false);
    expect(productUpdateSchema.safeParse({ id: 5, pricingOptions: [{ type: 'DAILY', price: -1 }] }).success).toBe(false);
  });
});

describe('@rentalshop/validation product schemas (#951)', () => {
  const v = { name: 'Túi quà', deposit: 0, totalStock: 1 };

  it('accept rentPrice 0 and salePrice 0', () => {
    expect(ProductCreateSchema.safeParse({ ...v, rentPrice: 0 }).success).toBe(true);
    expect(ProductCreateSchema.safeParse({ ...v, rentPrice: 0, salePrice: 0 }).success).toBe(true);
    expect(ProductUpdateSchema.safeParse({ ...v, rentPrice: 0, salePrice: 0 }).success).toBe(true);
  });

  it('refuse negative prices', () => {
    expect(ProductCreateSchema.safeParse({ ...v, rentPrice: -1 }).success).toBe(false);
    expect(ProductCreateSchema.safeParse({ ...v, rentPrice: 0, salePrice: -1 }).success).toBe(false);
  });
});

describe('stored pricing options keep a 0đ price (#951)', () => {
  it('keeps price 0, drops a missing or negative price and unknown types', () => {
    const out = normalizePricingOptions([
      { type: 'FIXED', price: 0, isDefault: true },
      { type: 'DAILY', price: null },
      { type: 'DAILY', price: -3 },
      { type: 'HOURLY', price: 10 },
    ]);
    expect(out).toEqual([{ type: 'FIXED', price: 0, unit: null, blockSize: null, isDefault: true, isActive: true, sortOrder: 0 }]);
  });

  it('one default (first one when none is marked)', () => {
    const out = normalizePricingOptions([
      { type: 'FIXED', price: 0 },
      { type: 'DAILY', price: 50_000 },
    ]);
    expect(out.map((o) => [o.type, o.price, o.isDefault])).toEqual([
      ['FIXED', 0, true],
      ['DAILY', 50_000, false],
    ]);
    expect(normalizePricingOptions(undefined)).toEqual([]);
  });
});

describe('branch rules: a 0đ option is a price (#951)', () => {
  const stored = { name: 'Túi quà', rentPrice: 0, pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true, isActive: true }] };

  it('the same 0đ option sent again is not a change', () => {
    expect(changedSharedFields({ pricingOptions: [{ type: 'FIXED', price: 0, isDefault: true }] }, stored)).toEqual([]);
  });

  it('removing the 0đ price is a change', () => {
    expect(changedSharedFields({ pricingOptions: [] }, stored)).toEqual(['pricingOptions']);
  });
});

describe('orders accept a free line (unit price 0) (#951)', () => {
  const rent = {
    orderType: 'RENT',
    outletId: 1,
    customerId: 2,
    totalAmount: 150_000,
    orderItems: [
      { productId: 1, quantity: 1, unitPrice: 150_000, totalPrice: 150_000, pricingType: 'FIXED' },
      { productId: 2, quantity: 2, unitPrice: 0, totalPrice: 0, pricingType: 'FIXED' },
    ],
  };

  it('create and update', () => {
    expect(orderCreateSchema.safeParse(rent).success).toBe(true);
    expect(orderCreateSchema.safeParse({ ...rent, orderType: 'SALE', totalAmount: 0, orderItems: [{ productId: 2, quantity: 1, unitPrice: 0, totalPrice: 0 }] }).success).toBe(true);
    expect(orderUpdateSchema.safeParse({ orderItems: rent.orderItems, totalAmount: 150_000 }).success).toBe(true);
  });

  it('still refuse a negative line price', () => {
    expect(orderCreateSchema.safeParse({ ...rent, orderItems: [{ productId: 2, quantity: 1, unitPrice: -1 }] }).success).toBe(false);
  });
});
