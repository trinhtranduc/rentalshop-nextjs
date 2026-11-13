/**
 * #1533 Nhập Excel theo chi nhánh (web): which branches a shop picks from, the "Hiện" + quantity cell of each branch,
 * and what POST /api/products/bulk-import receives. Spec .agent/changes/1533-import-branch-stock (11-16).
 */
import { describe, expect, it } from '@jest/globals';
import { checkSheet, sheetFromMatrix } from '../apps/client/app/products/import/import-model';
import {
  activeImportOutlets,
  buildBranchImport,
  copyColumn,
  defaultCells,
  importBranchMode,
  readByOutlet,
  rowHasBranch,
  rowOutlets,
  setQty,
  toggleCell,
  turnColumnOn,
} from '../apps/client/app/products/import/import-branches';

const Q1 = { id: 1, name: 'Quận 1', isDefault: true, isActive: true };
const Q7 = { id: 7, name: 'Quận 7', isDefault: false, isActive: true };
const OLD = { id: 9, name: 'Cũ', isDefault: false, isActive: false };

const sheet = sheetFromMatrix([
  ['Tên sản phẩm', 'Mã vạch', 'Số lượng'],
  ['Áo dài thêu rồng', 'AD001', 2],
  ['Loa JBL', 'LOA01', 4],
  ['', 'X', 1],
  ['Khăn đóng', '', 6],
]);
const checked = checkSheet(sheet, []);
const valid = new Set(checked.rows.filter((r) => r.payload).map((r) => r.row));

describe('branches to import into', () => {
  it('active outlets only, the main branch first, then the API order', () => {
    expect(activeImportOutlets([Q7, OLD, Q1]).map((o) => o.id)).toEqual([1, 7]);
  });

  it('owner with 2+ active branches picks; main branch is the default target', () => {
    expect(importBranchMode({ branchRole: false, ownOutlet: null, outlets: [Q7, Q1] })).toEqual({ kind: 'pick', outlets: [Q1, Q7], target: 1 });
  });

  it('owner with one active branch: like today, but the branch is sent', () => {
    expect(importBranchMode({ branchRole: false, ownOutlet: null, outlets: [Q1, OLD] })).toEqual({ kind: 'single', outletId: 1 });
  });

  it('owner whose branches did not load: legacy call (no outletId)', () => {
    expect(importBranchMode({ branchRole: false, ownOutlet: null, outlets: [] })).toEqual({ kind: 'single', outletId: null });
  });

  it('manager / stock keeper: own branch only, locked', () => {
    expect(importBranchMode({ branchRole: true, ownOutlet: { id: 7, name: 'Quận 7' }, outlets: [Q1, Q7] })).toEqual({
      kind: 'own',
      outlet: { id: 7, name: 'Quận 7' },
    });
  });
});

describe('cells: Hiện + quantity per branch', () => {
  const cells = defaultCells(checked.rows, [1, 7], 1);

  it('the chosen branch is on with the file quantity, the other branch off at 0', () => {
    expect(cells[2]).toEqual({ 1: { on: true, qty: 2 }, 7: { on: false, qty: 0 } });
    expect(cells[5]).toEqual({ 1: { on: true, qty: 6 }, 7: { on: false, qty: 0 } });
  });

  it('rows with errors get no cells', () => {
    expect(cells[4]).toBeUndefined();
  });

  it('turning another branch on starts at 0, never the file quantity', () => {
    const next = toggleCell(cells, 3, 7);
    expect(next[3][7]).toEqual({ on: true, qty: 0 });
    expect(cells[3][7]).toEqual({ on: false, qty: 0 }); // not mutated
  });

  it('a typed quantity is a whole number ≥ 0', () => {
    expect(setQty(cells, 3, 1, 5)[3][1]).toEqual({ on: true, qty: 5 });
    expect(setQty(cells, 3, 1, -2)[3][1].qty).toBe(0);
    expect(setQty(cells, 3, 1, 2.7)[3][1].qty).toBe(2);
    expect(setQty(cells, 3, 1, Number.NaN)[3][1].qty).toBe(0);
  });

  it('"Bật hết" turns a whole column on and keeps the numbers', () => {
    const typed = setQty(toggleCell(cells, 3, 7), 3, 7, 3);
    const all = turnColumnOn(toggleCell(typed, 3, 7), 7);
    expect(all[2][7]).toEqual({ on: true, qty: 0 });
    expect(all[3][7]).toEqual({ on: true, qty: 3 });
  });

  it('"Chép số lượng" turns the column on and copies the chosen branch', () => {
    const copied = copyColumn(setQty(cells, 3, 1, 5), 1, 7);
    expect(copied[2][7]).toEqual({ on: true, qty: 2 });
    expect(copied[3][7]).toEqual({ on: true, qty: 5 });
  });

  it('a row with every branch off has no branch', () => {
    expect(rowHasBranch(cells, 2)).toBe(true);
    expect(rowHasBranch(toggleCell(cells, 2, 1), 2)).toBe(false);
  });

  it('only the branches that are on are sent, in branch order', () => {
    const two = setQty(toggleCell(cells, 3, 7), 3, 7, 3);
    expect(rowOutlets(two, 3, [1, 7])).toEqual([{ outletId: 1, stock: 4 }, { outletId: 7, stock: 3 }]);
    expect(rowOutlets(toggleCell(cells, 2, 1), 2, [1, 7])).toEqual([]);
  });
});

describe('what POST /api/products/bulk-import receives', () => {
  const cells = defaultCells(checked.rows, [1, 7], 1);

  it('owner: outletId + outlets per row; rows with no branch are left out with their file row', () => {
    const off = toggleCell(cells, 5, 1); // Khăn đóng: every branch off
    const { body, fileRows, noBranchRows } = buildBranchImport(checked.rows, valid, { kind: 'cells', target: 1, outletIds: [1, 7], cells: off });
    expect(body.outletId).toBe(1);
    expect(body.products.map((p) => [p.name, p.outlets])).toEqual([
      ['Áo dài thêu rồng', [{ outletId: 1, stock: 2 }]],
      ['Loa JBL', [{ outletId: 1, stock: 4 }]],
    ]);
    expect(fileRows).toEqual([2, 3]);
    expect(noBranchRows).toEqual([5]);
  });

  it('own branch: outletId + the own cell', () => {
    const own = defaultCells(checked.rows, [7], 7);
    const { body } = buildBranchImport(checked.rows, valid, { kind: 'cells', target: 7, outletIds: [7], cells: setQty(own, 2, 7, 1) });
    expect(body.outletId).toBe(7);
    expect(body.products[0].outlets).toEqual([{ outletId: 7, stock: 1 }]);
  });

  it('single branch: outletId and the file stock, no outlets', () => {
    const { body } = buildBranchImport(checked.rows, valid, { kind: 'single', outletId: 1 });
    expect(body.outletId).toBe(1);
    expect(body.products[0]).not.toHaveProperty('outlets');
    expect(body.products[0].stock).toBe(2);
  });

  it('branches not loaded: the legacy body `{ products }`', () => {
    const { body } = buildBranchImport(checked.rows, valid, { kind: 'single', outletId: null });
    expect(body).not.toHaveProperty('outletId');
  });

  it('unchosen rows are not sent', () => {
    const { body } = buildBranchImport(checked.rows, new Set([3]), { kind: 'single', outletId: 1 });
    expect(body.products.map((p) => p.name)).toEqual(['Loa JBL']);
  });
});

describe('result per branch', () => {
  it('reads byOutlet and drops junk', () => {
    expect(
      readByOutlet({ byOutlet: [{ outletId: 1, listed: 40, outOfStock: 0, skipped: 2 }, { outletId: 'x' }, null, { outletId: 7, listed: 12, outOfStock: 3, skipped: -1 }] }),
    ).toEqual([
      { outletId: 1, listed: 40, outOfStock: 0, skipped: 2 },
      { outletId: 7, listed: 12, outOfStock: 3, skipped: 0 },
    ]);
  });

  it('no byOutlet (old API): null', () => {
    expect(readByOutlet({ imported: 3 })).toBeNull();
  });
});
