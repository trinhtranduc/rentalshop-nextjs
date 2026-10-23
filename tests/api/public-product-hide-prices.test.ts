/**
 * #1174 — when the shop hides catalogue prices, public products keep the keys but null the amounts.
 * hasRentPrice still reflects the source so "Đặt thuê" is not blocked.
 */
jest.mock('@rentalshop/utils', () => ({
  parseProductImages: (images: any) => images,
}));

import { toPublicProduct } from '../../apps/api/lib/public-product';

const source = {
  id: 11,
  name: 'Áo dài',
  rentPrice: 350000,
  salePrice: 1200000,
  deposit: 200000,
  pricingOptions: [
    { type: 'FIXED', price: 350000, isDefault: true },
    { type: 'DAILY', price: 120000, isDefault: false },
  ],
};

describe('toPublicProduct hidePrices (#1174)', () => {
  it('keeps amounts when prices are shown', () => {
    const product = toPublicProduct(source);
    expect(product.rentPrice).toBe(350000);
    expect(product.salePrice).toBe(1200000);
    expect(product.deposit).toBe(200000);
    expect(product.pricingOptions.map((o) => o.price)).toEqual([350000, 120000]);
    expect(product.hasRentPrice).toBe(true);
  });

  it('nulls amounts and keeps keys when hidden', () => {
    const product = toPublicProduct(source, { hidePrices: true });
    expect(product).toMatchObject({
      id: 11,
      name: 'Áo dài',
      rentPrice: null,
      salePrice: null,
      deposit: null,
      hasRentPrice: true,
    });
    expect(product.pricingOptions).toEqual([
      expect.objectContaining({ type: 'FIXED', price: null }),
      expect.objectContaining({ type: 'DAILY', price: null }),
    ]);
  });
});
