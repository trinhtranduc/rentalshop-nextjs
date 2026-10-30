/**
 * #1341 (#1335) "Hiện ở chi nhánh" — the pure rules behind OutletStock.isListed.
 * - Only the owner (MERCHANT, and ADMIN of the system) ticks / unticks; one function, `canSetBranchListing(role)`.
 * - A new product is listed at the branch that creates it; every other branch gets a 0 row that is NOT listed.
 * - `GET /api/products?listed=true` filters by one branch: the branch of a branch role, the `outletId` of the owner;
 *   a shop with a single active branch ignores it.
 * - A request without `X-Client-Capabilities: branch-listing` is an old app: it never sees the tick, so the server lists
 *   a product for it when the app puts that product on an order or raises its stock.
 */
import {
  autoListOutletIdsForStockWrite,
  canSetBranchListing,
  isOldListingClient,
  listedOutletForList,
  listedRowsForCreate,
  parseListedParam,
  shopHasSingleActiveOutlet,
} from '../../apps/api/lib/product-listing';
import { holdsOrListsAt, holdsStockAt } from '../../apps/api/lib/product-branch-rules';

const req = (value?: string) => ({ headers: { get: (k: string) => (k.toLowerCase() === 'x-client-capabilities' ? value ?? null : null) } });

describe('canSetBranchListing', () => {
  it.each(['MERCHANT', 'ADMIN'])('%s may tick and untick', (role) => {
    expect(canSetBranchListing(role)).toBe(true);
  });
  it.each(['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF', 'OPS', 'ARTICLE', '', null, undefined, 'merchant'])('%s may not', (role) => {
    expect(canSetBranchListing(role as string)).toBe(false);
  });
});

describe('isOldListingClient', () => {
  it('no header, empty header, other tokens: an old client', () => {
    expect(isOldListingClient(req())).toBe(true);
    expect(isOldListingClient(req(''))).toBe(true);
    expect(isOldListingClient(req('installments,block-pricing'))).toBe(true);
    expect(isOldListingClient({})).toBe(true);
  });
  it('the branch-listing token (any case, with other tokens) is a new client', () => {
    expect(isOldListingClient(req('branch-listing'))).toBe(false);
    expect(isOldListingClient(req('block-pricing, Branch-Listing ,installments'))).toBe(false);
  });
});

describe('shopHasSingleActiveOutlet', () => {
  it('0 or 1 active branch is "single"; 2 or more is not', () => {
    expect(shopHasSingleActiveOutlet(0)).toBe(true);
    expect(shopHasSingleActiveOutlet(1)).toBe(true);
    expect(shopHasSingleActiveOutlet(2)).toBe(false);
    expect(shopHasSingleActiveOutlet(5)).toBe(false);
  });
});

describe('parseListedParam', () => {
  it('only true / 1 turns the filter on (z.coerce.boolean would turn "false" on)', () => {
    expect(parseListedParam('true')).toBe(true);
    expect(parseListedParam('1')).toBe(true);
    expect(parseListedParam('TRUE')).toBe(true);
    for (const v of ['false', '0', '', 'yes', undefined, null]) expect(parseListedParam(v as string)).toBe(false);
  });
});

describe('listedOutletForList', () => {
  it('without listed there is no filter, whoever asks', () => {
    expect(listedOutletForList({ listed: false, role: 'OUTLET_STAFF', userOutletId: 3, queryOutletId: 3 })).toBeUndefined();
    expect(listedOutletForList({ listed: false, role: 'MERCHANT', queryOutletId: 3 })).toBeUndefined();
  });
  it('a branch role is always its own branch (a different outletId in the query is ignored)', () => {
    for (const role of ['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF']) {
      expect(listedOutletForList({ listed: true, role, userOutletId: 3, queryOutletId: 9 })).toBe(3);
      expect(listedOutletForList({ listed: true, role, userOutletId: 3 })).toBe(3);
    }
  });
  it('MERCHANT and ADMIN use the outletId of the query; without one the filter is skipped', () => {
    expect(listedOutletForList({ listed: true, role: 'MERCHANT', queryOutletId: 4 })).toBe(4);
    expect(listedOutletForList({ listed: true, role: 'ADMIN', queryOutletId: 4 })).toBe(4);
    expect(listedOutletForList({ listed: true, role: 'MERCHANT' })).toBeUndefined();
  });
  it('a branch role without an outlet gets no filter (the route refuses such a user elsewhere)', () => {
    expect(listedOutletForList({ listed: true, role: 'OUTLET_STAFF', userOutletId: null })).toBeUndefined();
  });
});

describe('listedRowsForCreate', () => {
  const given = [{ outletId: 1, stock: 5 }];
  it('keeps the given rows (listed unless the owner says false) and adds a 0 row, not listed, for every other active branch', () => {
    expect(listedRowsForCreate(given, [1, 2, 3], 'MERCHANT')).toEqual([
      { outletId: 1, stock: 5, isListed: true },
      { outletId: 2, stock: 0, isListed: false },
      { outletId: 3, stock: 0, isListed: false },
    ]);
  });
  it('the owner can send isListed per row (the web form ticks the branches)', () => {
    const rows = listedRowsForCreate(
      [{ outletId: 1, stock: 5, isListed: true }, { outletId: 2, stock: 0, isListed: true }, { outletId: 3, stock: 2, isListed: false }],
      [1, 2, 3],
      'MERCHANT'
    );
    expect(rows.map((r) => [r.outletId, r.isListed])).toEqual([[1, true], [2, true], [3, false]]);
  });
  it('an old app (one row, no isListed) lists the branch it creates at', () => {
    expect(listedRowsForCreate([{ outletId: 2, stock: 1 }], [1, 2], 'MERCHANT')).toEqual([
      { outletId: 2, stock: 1, isListed: true },
      { outletId: 1, stock: 0, isListed: false },
    ]);
  });
  it('a branch role always lists its own branch, even when it sends isListed: false', () => {
    for (const role of ['OUTLET_ADMIN', 'OUTLET_INVENTORY']) {
      expect(listedRowsForCreate([{ outletId: 1, stock: 5, isListed: false }], [1, 2], role)).toEqual([
        { outletId: 1, stock: 5, isListed: true },
        { outletId: 2, stock: 0, isListed: false },
      ]);
    }
  });
  it('an outlet that is not active is not added; a given row of it is kept as sent', () => {
    expect(listedRowsForCreate([{ outletId: 9, stock: 1 }], [1], 'MERCHANT')).toEqual([
      { outletId: 9, stock: 1, isListed: true },
      { outletId: 1, stock: 0, isListed: false },
    ]);
  });
  it('does not repeat an outlet', () => {
    const rows = listedRowsForCreate([{ outletId: 1, stock: 5 }], [1, 1, 2, 2], 'MERCHANT');
    expect(rows.map((r) => r.outletId)).toEqual([1, 2]);
  });
});

describe('autoListOutletIdsForStockWrite (PUT /api/products/[id] from an old app)', () => {
  const saved = [
    { outletId: 1, stock: 4, isListed: true },
    { outletId: 2, stock: 0, isListed: false },
    { outletId: 3, stock: 6, isListed: false }, // the owner unticked it while it still holds 6
  ];
  it('lists a branch whose stock goes up above 0 while it is not listed', () => {
    expect(autoListOutletIdsForStockWrite([{ outletId: 2, stock: 3 }], saved, true)).toEqual([2]);
  });
  it('read then save: the same stock sent back never lists a row (the owner\'s untick stays)', () => {
    expect(autoListOutletIdsForStockWrite([{ outletId: 1, stock: 4 }, { outletId: 2, stock: 0 }, { outletId: 3, stock: 6 }], saved, true)).toEqual([]);
  });
  it('stock 0 or a lower stock lists nothing', () => {
    expect(autoListOutletIdsForStockWrite([{ outletId: 2, stock: 0 }, { outletId: 3, stock: 2 }], saved, true)).toEqual([]);
  });
  it('a client with the branch-listing token never auto-lists', () => {
    expect(autoListOutletIdsForStockWrite([{ outletId: 2, stock: 3 }], saved, false)).toEqual([]);
  });
  it('a branch without a saved row is created listed by the database default: nothing to update', () => {
    expect(autoListOutletIdsForStockWrite([{ outletId: 7, stock: 3 }], saved, true)).toEqual([]);
  });
});

describe('holdsOrListsAt (shared-field edit by OUTLET_ADMIN / kho; spec rule 15)', () => {
  const rows = [
    { outletId: 1, stock: 3, renting: 0, isListed: false },
    { outletId: 2, stock: 0, renting: 2, isListed: false },
    { outletId: 3, stock: 0, renting: 0, isListed: true },
    { outletId: 4, stock: 0, renting: 0, isListed: false },
    { outletId: 5, stock: 0, renting: 0 }, // a row from before the column: listed
  ];
  it('true when the branch holds stock, has units on rent, or lists the product', () => {
    for (const id of [1, 2, 3, 5]) expect(holdsOrListsAt(rows, id)).toBe(true);
  });
  it('false for an unlisted empty row, a missing row, or no branch', () => {
    expect(holdsOrListsAt(rows, 4)).toBe(false);
    expect(holdsOrListsAt(rows, 9)).toBe(false);
    expect(holdsOrListsAt(rows, null)).toBe(false);
    expect(holdsOrListsAt(null, 1)).toBe(false);
  });
  it('delete keeps its rule: holdsStockAt is unchanged (a listed empty row does not count)', () => {
    expect(holdsStockAt(rows, 3)).toBe(false);
    expect(holdsStockAt(rows, 1)).toBe(true);
  });
});
