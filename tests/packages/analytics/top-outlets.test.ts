/**
 * Shop ranking is by revenue first (order count is only a tie-breaker).
 * Product ranking is per shop and can be measured by revenue or quantity.
 */

import { describe, expect, it } from '@jest/globals';
import { paginateRanked } from '../../../packages/utils/src/analytics/ranking-page';
import { rankOutletsByRevenue } from '../../../packages/utils/src/analytics/top-outlet-rank';
import {
  aggregateProductShopSales,
  rankProductShops
} from '../../../packages/utils/src/analytics/top-product-rank';

describe('rankOutletsByRevenue', () => {
  const outlets = [
    { id: 1, name: 'Shop A', city: 'Hanoi', merchant: { id: 10, name: 'Merchant A' } },
    { id: 2, name: 'Shop B', city: 'HCMC', merchant: { id: 20, name: 'Merchant B' } },
    { id: 3, name: 'Shop C', city: null, merchant: { id: 10, name: 'Merchant A' } }
  ];

  it('puts the shop with the highest revenue first', () => {
    const ranked = rankOutletsByRevenue(
      [
        { outletId: 1, orderCount: 40, totalRevenue: 9_000_000 },
        { outletId: 2, orderCount: 12, totalRevenue: 3_000_000 },
        { outletId: 3, orderCount: 8, totalRevenue: 12_000_000 }
      ],
      outlets
    );

    expect(ranked.map((row) => row.id)).toEqual([3, 1, 2]);
    expect(ranked[0].name).toBe('Shop C');
    expect(ranked[0].totalRevenue).toBe(12_000_000);
  });

  it('breaks ties by order count and drops unknown outlet ids', () => {
    const ranked = rankOutletsByRevenue(
      [
        { outletId: 1, orderCount: 5, totalRevenue: 8_000 },
        { outletId: 2, orderCount: 9, totalRevenue: 8_000 },
        { outletId: 99, orderCount: 50, totalRevenue: 99_000 }
      ],
      outlets
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0].id).toBe(2);
    expect(ranked[1].id).toBe(1);
  });
});

describe('rankProductShops', () => {
  it('aggregates the same product per shop then ranks by revenue or quantity', () => {
    const groups = aggregateProductShopSales([
      { productId: 1, outletId: 10, quantity: 2, totalPrice: 100 },
      { productId: 1, outletId: 10, quantity: 1, totalPrice: 50 },
      { productId: 1, outletId: 20, quantity: 8, totalPrice: 80 },
      { productId: 2, outletId: 10, quantity: 3, totalPrice: 300 }
    ]);

    const byRevenue = rankProductShops(groups, 'revenue');
    expect(byRevenue[0]).toMatchObject({ productId: 2, outletId: 10, totalRevenue: 300, quantity: 3 });
    expect(byRevenue[1]).toMatchObject({ productId: 1, outletId: 10, totalRevenue: 150, quantity: 3 });

    const byQuantity = rankProductShops(groups, 'quantity');
    expect(byQuantity[0]).toMatchObject({ productId: 1, outletId: 20, quantity: 8, totalRevenue: 80 });
  });
});

describe('paginateRanked', () => {
  it('returns the requested page and total pages', () => {
    const page = paginateRanked([1, 2, 3, 4, 5], 2, 2);
    expect(page).toEqual({
      items: [3, 4],
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3
    });
  });
});
