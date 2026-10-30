/**
 * #1341 (#1335) shop web "Hiện ở chi nhánh": the pure models behind the product list, the product form and the
 * order picker. Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh (no date logic here; the suite is run under both anyway).
 */
import { describe, expect, it } from '@jest/globals';
import {
  branchCells,
  branchColumnsFor,
  listedFilterFor,
  toApiFilters,
  parseListQuery,
  type ProductLike,
} from '../apps/client/app/products/list/list-model';
import {
  buildPayload,
  canTickBranches,
  defaultListedOutletId,
  emptyForm,
  formFromProduct,
  listingChanges,
  listingReminder,
  setOutletListed,
  setOutletStock,
  type ProductSource,
} from '../apps/client/app/products/form/form-model';
import { CLIENT_CAPABILITIES, clientCapabilitiesHeader } from '../packages/utils/src/core/client-capabilities';

const outlets = [
  { id: 1, name: 'Quận 1', isDefault: true, isActive: true },
  { id: 3, name: 'Quận 7', isDefault: false, isActive: true },
  { id: 5, name: 'Thủ Đức', isDefault: false, isActive: true },
];
const categories = [{ id: 7 }];
const query = (qs = '') => parseListQuery((k) => new URLSearchParams(qs).get(k));

describe('web sends the branch-listing capability', () => {
  it('is in the list of capabilities of the web client, next to the older ones', () => {
    expect(CLIENT_CAPABILITIES).toEqual(expect.arrayContaining(['block-pricing', 'installments', 'branch-listing']));
    expect(clientCapabilitiesHeader()['X-Client-Capabilities'].split(',')).toContain('branch-listing');
  });
});

describe('list: which calls ask for listed=true', () => {
  it('a branch role always; the owner only with a branch chosen in the filter', () => {
    for (const role of ['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF']) {
      expect(listedFilterFor(query(), { role, outletId: 3 })).toBe(true);
    }
    expect(listedFilterFor(query('outlet=3'), { role: 'MERCHANT' })).toBe(true);
    expect(listedFilterFor(query('outlet=3'), { role: 'ADMIN' })).toBe(true);
    expect(listedFilterFor(query(), { role: 'MERCHANT' })).toBe(false);
    expect(listedFilterFor(query(), null)).toBe(false);
  });

  it('toApiFilters adds listed only when asked, and keeps every old filter', () => {
    const q = query('outlet=3&q=ao&category=7');
    const plain = toApiFilters(q);
    expect(plain).not.toHaveProperty('listed');
    expect(toApiFilters(q, { listed: true })).toEqual({ ...plain, listed: true });
    expect(toApiFilters(q, { listed: true })).toEqual(expect.objectContaining({ outletId: 3, search: 'ao', categoryId: 7 }));
  });
});

describe('list: "Tất cả chi nhánh" (owner only, two or more branches)', () => {
  it('shows a column per branch for MERCHANT / ADMIN without a branch chosen and with two or more branches', () => {
    expect(branchColumnsFor(query(), { role: 'MERCHANT' }, outlets)).toEqual(outlets.map((o) => ({ id: o.id, name: o.name })));
    expect(branchColumnsFor(query(), { role: 'ADMIN' }, outlets)).toHaveLength(3);
  });
  it('no columns when a branch is chosen, for a branch role, or for a shop with one active branch', () => {
    expect(branchColumnsFor(query('outlet=3'), { role: 'MERCHANT' }, outlets)).toBeNull();
    expect(branchColumnsFor(query(), { role: 'OUTLET_ADMIN', outletId: 1 }, outlets)).toBeNull();
    expect(branchColumnsFor(query(), { role: 'MERCHANT' }, [outlets[0]])).toBeNull();
  });
  it('a closed branch has no column', () => {
    expect(branchColumnsFor(query(), { role: 'MERCHANT' }, [...outlets.slice(0, 2), { id: 9, name: 'Closed', isDefault: false, isActive: false }])).toHaveLength(2);
  });

  const product: ProductLike = {
    id: 12,
    name: 'Áo dài gấm đỏ',
    totalStock: 99,
    outletStock: [
      { stock: 8, renting: 2, available: 6, isListed: true, outlet: { id: 1, name: 'Quận 1' } },
      { stock: 4, renting: 0, available: 4, isListed: false, outlet: { id: 3, name: 'Quận 7' } },
      { stock: 0, renting: 0, available: 0, isListed: true, outlet: { id: 5, name: 'Thủ Đức' } },
    ],
  };
  it('one cell per column: listed or not, stock, and "Hết hàng" for a listed empty row', () => {
    const cells = branchCells(product, [{ id: 1, name: 'Quận 1' }, { id: 3, name: 'Quận 7' }, { id: 5, name: 'Thủ Đức' }, { id: 8, name: 'No row' }]);
    expect(cells.map((c) => [c.outletId, c.listed, c.total, c.available, c.out])).toEqual([
      [1, true, 8, 6, false],
      [3, false, 4, 4, false], // not listed, stock still counted
      [5, true, 0, 0, true],
      [8, false, 0, 0, true], // no row at that branch = not listed
    ]);
  });
  it('an old API row without isListed reads as listed', () => {
    const cells = branchCells({ id: 1, outletStock: [{ stock: 1, available: 1, outlet: { id: 1 } }] }, [{ id: 1, name: 'Quận 1' }]);
    expect(cells[0].listed).toBe(true);
  });
});

describe('form: the "Hiện ở chi nhánh" ticks', () => {
  it('canTickBranches: only the owner', () => {
    expect(canTickBranches('MERCHANT')).toBe(true);
    expect(canTickBranches('ADMIN')).toBe(true);
    for (const r of ['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF', undefined, null]) expect(canTickBranches(r as string)).toBe(false);
  });

  it('defaultListedOutletId: the branch chosen in the list, else the default branch, else the first', () => {
    expect(defaultListedOutletId(outlets, 3)).toBe(3);
    expect(defaultListedOutletId(outlets, 99)).toBe(1);
    expect(defaultListedOutletId(outlets, undefined)).toBe(1);
    expect(defaultListedOutletId([{ id: 4, name: 'A' }, { id: 6, name: 'B' }], undefined)).toBe(4);
    expect(defaultListedOutletId([], undefined)).toBeUndefined();
  });

  it('a new product: only the chosen branch is ticked', () => {
    const f = emptyForm(outlets, categories, '1', 3);
    expect(f.listed).toEqual({ 1: false, 3: true, 5: false });
    expect(f.savedListed).toEqual({});
  });

  it('a new product without a chosen branch ticks the default branch', () => {
    expect(emptyForm(outlets, categories, '1').listed).toEqual({ 1: true, 3: false, 5: false });
  });

  it('create payload with several branches sends isListed per branch; stock rows keep their shape', () => {
    let f = emptyForm(outlets, categories, '1', 3);
    f = { ...f, name: 'Áo bà ba', perRental: 90000, totalStock: 5 };
    f = setOutletStock(f, 3, 5);
    f = setOutletListed(f, 5, true);
    const body = buildPayload(f, { canEditPricing: true }) as { outletStock: Array<Record<string, unknown>> };
    expect(body.outletStock).toEqual([
      { outletId: 1, stock: 0, isListed: false },
      { outletId: 3, stock: 5, isListed: true },
      { outletId: 5, stock: 0, isListed: true },
    ]);
  });

  it('create payload with one branch is exactly what it was (no isListed key)', () => {
    const f = { ...emptyForm([outlets[0]], categories, '1'), name: 'A', perRental: 1, totalStock: 5 };
    const body = buildPayload({ ...f, outletStock: [{ outletId: 1, stock: 5 }] }, { canEditPricing: true }) as { outletStock: unknown[] };
    expect(body.outletStock).toEqual([{ outletId: 1, stock: 5 }]);
  });

  it('a branch role sends only its own row and no isListed (the API lists the branch that creates)', () => {
    const f = { ...emptyForm(outlets, categories, '1', 3), name: 'A', perRental: 1 };
    const body = buildPayload(setOutletStock(f, 3, 2), { canEditPricing: false, branchOutletId: 3 }) as { outletStock: unknown[] };
    expect(body.outletStock).toEqual([{ outletId: 3, stock: 2 }]);
  });

  const saved: ProductSource = {
    id: 12,
    name: 'Áo dài gấm đỏ',
    category: { id: 7 },
    outletStock: [
      { stock: 8, renting: 2, isListed: true, outlet: { id: 1 } },
      { stock: 4, renting: 0, isListed: false, outlet: { id: 3 } },
      // no row at branch 5
    ],
  };

  it('edit: ticks come from the saved rows; a branch without a row is not ticked; a row from an old API is ticked', () => {
    const f = formFromProduct(saved, outlets, categories);
    expect(f.listed).toEqual({ 1: true, 3: false, 5: false });
    expect(f.savedListed).toEqual({ 1: true, 3: false, 5: false });
    const old = formFromProduct({ ...saved, outletStock: [{ stock: 1, outlet: { id: 1 } }] }, outlets, categories);
    expect(old.listed[1]).toBe(true);
  });

  it('edit payload does not carry isListed (PUT ignores it; the tick has its own route)', () => {
    const f = formFromProduct(saved, outlets, categories);
    const body = buildPayload(f, { canEditPricing: true, productId: 12 }) as { outletStock: Array<Record<string, unknown>> };
    for (const row of body.outletStock) expect(row).not.toHaveProperty('isListed');
  });

  it('listingChanges: only branches whose tick differs from what is saved', () => {
    let f = formFromProduct(saved, outlets, categories);
    expect(listingChanges(f)).toEqual([]);
    f = setOutletListed(f, 3, true);
    f = setOutletListed(f, 1, false);
    f = setOutletListed(f, 5, false); // unchanged
    expect(listingChanges(f)).toEqual([
      { outletId: 1, isListed: false },
      { outletId: 3, isListed: true },
    ]);
    // ticking and unticking back is no change
    f = setOutletListed(f, 3, false);
    f = setOutletListed(f, 1, true);
    expect(listingChanges(f)).toEqual([]);
  });

  it('listingChanges on a new product is empty (the create call carries the ticks)', () => {
    expect(listingChanges(emptyForm(outlets, categories, '1', 3))).toEqual([]);
  });
});

describe('form: the reminder when a branch that still has units is not ticked (never blocks)', () => {
  it('shows stock and units on rent when the branch is unticked and still holds something', () => {
    expect(listingReminder({ isListed: false, stock: 4, renting: 2 })).toEqual({ stock: 4, renting: 2 });
    expect(listingReminder({ isListed: false, stock: 0, renting: 1 })).toEqual({ stock: 0, renting: 1 });
    expect(listingReminder({ isListed: false, stock: 3, renting: 0 })).toEqual({ stock: 3, renting: 0 });
  });
  it('nothing when the branch is ticked, or when it holds nothing', () => {
    expect(listingReminder({ isListed: true, stock: 4, renting: 2 })).toBeNull();
    expect(listingReminder({ isListed: false, stock: 0, renting: 0 })).toBeNull();
  });
});
