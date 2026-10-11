/**
 * #830 shop web: OUTLET_ADMIN / kho see the other outlets' stock read only (`otherOutlets` from the API);
 * a branch user's own stock table shows only its outlet. Pure module; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { buildRow, otherOutletsAvailable, ownStockRows, type ProductLike } from '../apps/client/app/products/list/list-model';

const ROWS = [
  { stock: 2, renting: 1, available: 1, outlet: { id: 1, name: 'Main' } },
  { stock: 5, renting: 0, available: 5, outlet: { id: 3, name: 'Second' } },
];
const P: ProductLike = {
  id: 11,
  name: 'Áo dài',
  totalStock: 7,
  outletStock: ROWS,
  otherOutlets: [
    { outletId: 3, outletName: 'Second', stock: 5, available: 5, renting: 0 },
    { outletId: 5, outletName: 'New', stock: 2, available: 1, renting: 1 },
  ],
};

describe('#830 other outlets on the list row', () => {
  it('sums the free units at the other outlets', () => {
    expect(otherOutletsAvailable(P)).toBe(6);
    expect(buildRow(P, 1).otherAvailable).toBe(6);
  });

  it('is null when the API sends no otherOutlets (staff, merchant) or an empty list', () => {
    expect(otherOutletsAvailable({ id: 1 })).toBeNull();
    expect(otherOutletsAvailable({ id: 1, otherOutlets: [] })).toBeNull();
    expect(buildRow({ ...P, otherOutlets: undefined }).otherAvailable).toBeNull();
  });

  it('shows 0 when the other outlets have nothing free', () => {
    expect(otherOutletsAvailable({ id: 1, otherOutlets: [{ outletId: 3, stock: 2, available: 0, renting: 2 }] })).toBe(0);
  });
});

describe('#830 own stock table on the detail page', () => {
  it.each(['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'])('%s sees only its own outlet', (role) => {
    expect(ownStockRows(ROWS, { role, outletId: 1 }).map((r) => r.outlet.id)).toEqual([1]);
  });

  it('a merchant sees every outlet', () => {
    expect(ownStockRows(ROWS, { role: 'MERCHANT' }).map((r) => r.outlet.id)).toEqual([1, 3]);
  });

  it('a branch user without a known outlet keeps the rows (nothing to filter by)', () => {
    expect(ownStockRows(ROWS, { role: 'OUTLET_STAFF' })).toHaveLength(2);
    expect(ownStockRows(null, { role: 'OUTLET_ADMIN', outletId: 1 })).toEqual([]);
  });
});
