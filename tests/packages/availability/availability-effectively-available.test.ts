import { describe, expect, it } from 'vitest';
import {
  calculateEffectivelyAvailable,
  resolveTotalAvailableStock,
} from '../../../apps/api/lib/availability';

describe('calculateEffectivelyAvailable', () => {
  it('PICKUPED-only overlap: subtract conflicts from totalAvailableStock (user scenario)', () => {
    // stock=20, sold/renting leaves available=19, 1 PICKUPED overlaps check day
    const result = calculateEffectivelyAvailable({
      totalStock: 20,
      totalAvailableStock: 19,
      totalRenting: 1,
      conflictingQuantity: 1,
      reservedConflictQuantity: 0,
    });

    expect(result).toBe(18);
  });

  it('no overlap: use totalAvailableStock (SALE-aware shelf count)', () => {
    const result = calculateEffectivelyAvailable({
      totalStock: 20,
      totalAvailableStock: 19,
      totalRenting: 1,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });

    expect(result).toBe(19);
  });

  it('batch no-overlap: shelf=0 but rented unit returns before period', () => {
    const result = calculateEffectivelyAvailable({
      totalStock: 1,
      totalAvailableStock: 0,
      totalRenting: 1,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });

    expect(result).toBe(1);
  });

  it('RESERVED + PICKUPED overlap: subtract all conflicts from totalStock', () => {
    const result = calculateEffectivelyAvailable({
      totalStock: 5,
      totalAvailableStock: 3,
      totalRenting: 2,
      conflictingQuantity: 3,
      reservedConflictQuantity: 1,
    });

    expect(result).toBe(2);
  });
});

describe('resolveTotalAvailableStock', () => {
  it('uses outlet.available when present (SALE-aware)', () => {
    expect(resolveTotalAvailableStock({ stock: 20, available: 19, renting: 1 })).toBe(19);
  });
});
