/**
 * Unit tests: product list table stock column (merchant rollup vs outlet scope).
 */

import { describe, expect, it } from '@jest/globals';
import {
  resolveProductListStockDisplay,
  resolveScopedOutletIdForProductStock,
} from '../packages/utils/src/product-list-stock';
import { USER_ROLE } from '@rentalshop/constants';

describe('resolveProductListStockDisplay', () => {
  it('uses product-level rollup when no outlet rows and no scope', () => {
    const r = resolveProductListStockDisplay(
      { totalStock: 10, renting: 3, available: 7 },
      undefined
    );
    expect(r).toEqual({
      totalStock: 10,
      renting: 3,
      available: 7,
      showBranchesHint: false,
      outletBranchCount: 0,
    });
  });

  it('falls back to stock when totalStock missing', () => {
    const r = resolveProductListStockDisplay({ stock: 5, renting: 1, available: 4 }, undefined);
    expect(r.totalStock).toBe(5);
    expect(r.showBranchesHint).toBe(false);
  });

  it('shows branches hint when multiple outlets and no scoped outlet', () => {
    const r = resolveProductListStockDisplay(
      {
        totalStock: 100,
        renting: 10,
        available: 90,
        outletStock: [
          { stock: 60, renting: 4, available: 56, outlet: { id: 1, name: 'A' } },
          { stock: 40, renting: 6, available: 34, outlet: { id: 2, name: 'B' } },
        ],
      },
      undefined
    );
    expect(r.showBranchesHint).toBe(true);
    expect(r.outletBranchCount).toBe(2);
    expect(r.totalStock).toBe(100);
    expect(r.renting).toBe(10);
    expect(r.available).toBe(90);
  });

  it('hides branches hint when only one outlet row (no scope)', () => {
    const r = resolveProductListStockDisplay(
      {
        totalStock: 20,
        renting: 2,
        available: 18,
        outletStock: [
          { stock: 20, renting: 2, available: 18, outlet: { id: 1 } },
        ],
      },
      undefined
    );
    expect(r.showBranchesHint).toBe(false);
    expect(r.outletBranchCount).toBe(1);
  });

  it('uses only the scoped outlet row when scopedOutletId matches', () => {
    const r = resolveProductListStockDisplay(
      {
        totalStock: 100,
        renting: 10,
        available: 90,
        outletStock: [
          { stock: 60, renting: 4, available: 56, outlet: { id: 1 } },
          { stock: 40, renting: 6, available: 34, outlet: { id: 2 } },
        ],
      },
      2
    );
    expect(r.totalStock).toBe(40);
    expect(r.renting).toBe(6);
    expect(r.available).toBe(34);
    expect(r.showBranchesHint).toBe(false);
    expect(r.outletBranchCount).toBe(2);
  });

  it('falls back to rollup when scoped id not found in outletStock', () => {
    const r = resolveProductListStockDisplay(
      {
        totalStock: 100,
        renting: 10,
        available: 90,
        outletStock: [{ stock: 100, renting: 10, available: 90, outlet: { id: 1 } }],
      },
      999
    );
    expect(r.totalStock).toBe(100);
    expect(r.renting).toBe(10);
    expect(r.available).toBe(90);
    expect(r.showBranchesHint).toBe(false);
  });
});

describe('resolveScopedOutletIdForProductStock', () => {
  it('prefers URL/filter outlet id over user outlet', () => {
    expect(
      resolveScopedOutletIdForProductStock(5, {
        role: USER_ROLE.OUTLET_ADMIN,
        outletId: 99,
      })
    ).toBe(5);
  });

  it('uses JWT outlet for OUTLET_ADMIN when no filter', () => {
    expect(
      resolveScopedOutletIdForProductStock(undefined, {
        role: USER_ROLE.OUTLET_ADMIN,
        outletId: 42,
      })
    ).toBe(42);
  });

  it('uses JWT outlet for OUTLET_STAFF when no filter', () => {
    expect(
      resolveScopedOutletIdForProductStock(undefined, {
        role: USER_ROLE.OUTLET_STAFF,
        outletId: 7,
      })
    ).toBe(7);
  });

  it('returns undefined for MERCHANT without filter', () => {
    expect(
      resolveScopedOutletIdForProductStock(undefined, {
        role: USER_ROLE.MERCHANT,
        outletId: 1,
      })
    ).toBeUndefined();
  });

  it('returns undefined when user missing', () => {
    expect(resolveScopedOutletIdForProductStock(undefined, null)).toBeUndefined();
  });
});
