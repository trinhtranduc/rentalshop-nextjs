import { describe, expect, it } from 'vitest';
import { calculateEffectivelyAvailable } from '../../../apps/api/lib/availability';

describe('calculateEffectivelyAvailable', () => {
  it('PICKUPED-only overlap: subtract conflicts from totalAvailableStock (user scenario)', () => {
    // stock=20, sold/renting leaves available=19, 1 PICKUPED overlaps check day
    const result = calculateEffectivelyAvailable({
      totalStock: 20,
      totalAvailableStock: 19,
      conflictingQuantity: 1,
      reservedConflictQuantity: 0,
    });

    expect(result).toBe(18);
  });

  it('no overlap: use totalStock even when totalAvailableStock is reduced by renting', () => {
    const result = calculateEffectivelyAvailable({
      totalStock: 1,
      totalAvailableStock: 0,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });

    expect(result).toBe(1);
  });

  it('RESERVED + PICKUPED overlap: subtract all conflicts from totalStock', () => {
    const result = calculateEffectivelyAvailable({
      totalStock: 5,
      totalAvailableStock: 3,
      conflictingQuantity: 3,
      reservedConflictQuantity: 1,
    });

    expect(result).toBe(2);
  });
});
