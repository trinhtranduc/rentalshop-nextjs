import { describe, expect, it } from 'vitest';
import {
  calculateEffectivelyAvailable,
  resolveTotalAvailableStock,
} from '../../../apps/api/lib/availability';

/**
 * Field semantics (API + mobile):
 * - stock (Kho): outletStock.stock — physical inventory in outlet
 * - totalAvailableStock / outlet.available (Có sẵn): on shelf now, not rented out
 * - effectivelyAvailable (verdict): free for the checked rental period
 */
describe('resolveTotalAvailableStock (Có sẵn)', () => {
  it('prefers outletStock.available (includes SALE decrement)', () => {
    // SALE sold 1: stock may still be 20 in stale data, but available is maintained at 19
    expect(
      resolveTotalAvailableStock({ stock: 20, available: 19, renting: 0 })
    ).toBe(19);
  });

  it('after SALE + RENT PICKUPED: available reflects both', () => {
    // stock=19 after sale, 1 out on rent → available=18
    expect(
      resolveTotalAvailableStock({ stock: 19, available: 18, renting: 1 })
    ).toBe(18);
  });

  it('falls back to stock - renting when available is missing', () => {
    expect(
      resolveTotalAvailableStock({ stock: 20, available: -1, renting: 1 })
    ).toBe(19);
  });
});

describe('User scenario: product 13832, outlet 30, check 10/07/2026', () => {
  const outletStock = {
    stock: 20,
    available: 19,
    renting: 1,
  };

  const shelfAvailable = resolveTotalAvailableStock(outletStock);
  const conflictingQuantity = 1; // PICKUPED RENT 7/7–12/7 overlaps check day
  const reservedConflictQuantity = 0;

  const effectivelyAvailable = calculateEffectivelyAvailable({
    totalStock: outletStock.stock,
    totalAvailableStock: shelfAvailable,
    totalRenting: outletStock.renting,
    conflictingQuantity,
    reservedConflictQuantity,
  });

  it('Có sẵn = 19 (not 20) after selling 1 while 1 is rented', () => {
    expect(shelfAvailable).toBe(19);
    expect(shelfAvailable).not.toBe(outletStock.stock);
  });

  it('verdict effectivelyAvailable = 18 on overlapping check day', () => {
    expect(effectivelyAvailable).toBe(18);
  });

  it('Kho stays 20 when stock field not decremented by SALE (display only)', () => {
    // API returns stock as-is; shelf uses available. Mobile shows stock in Kho column.
    expect(outletStock.stock).toBe(20);
    expect(shelfAvailable).toBe(19);
    expect(effectivelyAvailable).toBe(18);
  });
});

describe('SALE only: sold 1, no active rent', () => {
  it('Có sẵn = 19, verdict = 19 when no schedule conflict', () => {
    const shelf = resolveTotalAvailableStock({ stock: 19, available: 19, renting: 0 });
    const effective = calculateEffectivelyAvailable({
      totalStock: 19,
      totalAvailableStock: shelf,
      totalRenting: 0,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });

    expect(shelf).toBe(19);
    expect(effective).toBe(19);
  });
});

describe('Batch no-overlap fix: rented item returned before period', () => {
  it('stock=1, renting=1, available=0, no date overlap → effectivelyAvailable=1', () => {
    const shelf = resolveTotalAvailableStock({ stock: 1, available: 0, renting: 1 });
    const effective = calculateEffectivelyAvailable({
      totalStock: 1,
      totalAvailableStock: shelf,
      totalRenting: 1,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });

    expect(shelf).toBe(0);
    expect(effective).toBe(1);
  });
});

describe('User scenario: product 13832, check 16/07/2026 (no overlap)', () => {
  it('verdict effectivelyAvailable = 19 after SALE, not 20', () => {
    const outletStock = { stock: 20, available: 19, renting: 1 };
    const shelf = resolveTotalAvailableStock(outletStock);
    const effective = calculateEffectivelyAvailable({
      totalStock: outletStock.stock,
      totalAvailableStock: shelf,
      totalRenting: outletStock.renting,
      conflictingQuantity: 0,
      reservedConflictQuantity: 0,
    });

    expect(shelf).toBe(19);
    expect(effective).toBe(19);
    expect(effective).not.toBe(outletStock.stock);
  });
});

describe('RESERVED overlap uses totalStock', () => {
  it('RESERVED blocks from stock even when renting reduces shelf', () => {
    const shelf = resolveTotalAvailableStock({ stock: 5, available: 3, renting: 2 });
    const effective = calculateEffectivelyAvailable({
      totalStock: 5,
      totalAvailableStock: shelf,
      totalRenting: 2,
      conflictingQuantity: 2,
      reservedConflictQuantity: 1,
    });

    expect(effective).toBe(3); // 5 - 2, not 3 - 2
  });
});
