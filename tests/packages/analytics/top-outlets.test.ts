/**
 * Top shop ranking: most orders first, then revenue as a tie-breaker.
 */

import { describe, expect, it } from '@jest/globals';
import { rankOutletsByOrderCount } from '../../../packages/utils/src/analytics/top-outlet-rank';

describe('rankOutletsByOrderCount', () => {
  const outlets = [
    { id: 1, name: 'Shop A', city: 'Hanoi', merchant: { id: 10, name: 'Merchant A' } },
    { id: 2, name: 'Shop B', city: 'HCMC', merchant: { id: 20, name: 'Merchant B' } },
    { id: 3, name: 'Shop C', city: null, merchant: { id: 10, name: 'Merchant A' } }
  ];

  it('puts the shop with the most orders first', () => {
    const ranked = rankOutletsByOrderCount(
      [
        { outletId: 1, orderCount: 4, totalRevenue: 9_000_000 },
        { outletId: 2, orderCount: 12, totalRevenue: 3_000_000 },
        { outletId: 3, orderCount: 8, totalRevenue: 5_000_000 }
      ],
      outlets
    );

    expect(ranked.map((row) => row.id)).toEqual([2, 3, 1]);
    expect(ranked[0].name).toBe('Shop B');
    expect(ranked[0].orderCount).toBe(12);
    expect(ranked[0].merchantName).toBe('Merchant B');
  });

  it('breaks ties by revenue and drops unknown outlet ids', () => {
    const ranked = rankOutletsByOrderCount(
      [
        { outletId: 1, orderCount: 5, totalRevenue: 1_000 },
        { outletId: 2, orderCount: 5, totalRevenue: 8_000 },
        { outletId: 99, orderCount: 50, totalRevenue: 99_000 }
      ],
      outlets
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0].id).toBe(2);
    expect(ranked[1].id).toBe(1);
  });
});
