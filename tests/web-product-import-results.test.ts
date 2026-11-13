/**
 * #1535 Kết quả nhập Excel (web): every data row of the file gets a status and a detail, and the counts on top.
 * Spec .agent/changes/1535-import-row-results (10-13).
 */
import { describe, expect, it } from '@jest/globals';
import { checkSheet, sheetFromMatrix } from '../apps/client/app/products/import/import-model';
import { buildBranchImport, defaultCells, setQty, toggleCell } from '../apps/client/app/products/import/import-branches';
import { buildResultRows, countResults, looseErrors, readRowResults } from '../apps/client/app/products/import/import-results';

const sheet = sheetFromMatrix([
  ['Tên sản phẩm', 'Mã vạch', 'Số lượng'],
  ['Váy cưới', 'VC01', 3], // row 2: created at 1 and 3
  ['Loa JBL', 'UPD', 4], // row 3: updated (3 written, 1 skipped)
  ['Vest đen', 'FULL', 1], // row 4: duplicate, branch 1 has stock
  ['', 'X', 1], // row 5: check error (no name)
  ['Váy cưới 2', 'VC01', 2], // row 6: same barcode as row 2 in the file
  ['Khăn voan', '', 10], // row 7: unchosen
  ['Máy chiếu', 'MC01', 2], // row 8: no branch on
  ['Váy xoá', 'DEL', 1], // row 9: barcode of a deleted product
]);
const checked = checkSheet(sheet, []);
const chosen = new Set(checked.rows.filter((r) => r.payload && r.row !== 7).map((r) => r.row));
let cells = defaultCells(checked.rows, [1, 3], 1);
cells = setQty(toggleCell(cells, 2, 3), 2, 3, 1); // Váy cưới: branch 3 on with 1
cells = setQty(toggleCell(cells, 3, 3), 3, 3, 2); // Loa: branch 3 on with 2
cells = toggleCell(cells, 8, 1); // Máy chiếu: branch 1 off → no branch
const plan = buildBranchImport(checked.rows, chosen, { kind: 'cells', target: 1, outletIds: [1, 3], cells });

const api = [
  { row: 1, status: 'created' },
  { row: 2, status: 'updated', outlets: [3], skippedOutlets: [1] },
  { row: 3, status: 'duplicate', reason: 'barcodeExists', existingName: 'Vest đen cũ', skippedOutlets: [1] },
  { row: 4, status: 'duplicate', reason: 'barcodeDeleted', existingName: 'Váy đã xoá' },
];

describe('readRowResults', () => {
  it('reads the array and drops broken entries', () => {
    expect(readRowResults({ rows: [...api, { row: 'x', status: 'created' }, { row: 5, status: 'weird' }, null] })).toEqual(api);
  });
  it('null when the API did not send rows (older API)', () => {
    expect(readRowResults({ imported: 1 })).toBeNull();
    expect(readRowResults(undefined)).toBeNull();
  });
});

describe('buildResultRows: every file row, in file order', () => {
  const rows = buildResultRows({ rows: checked.rows, chosen, plan, api: readRowResults({ rows: api }) ?? [] });

  it('one entry per data row with name and barcode', () => {
    expect(rows.map((r) => [r.row, r.name, r.barcode, r.kind])).toEqual([
      [2, 'Váy cưới', 'VC01', 'created'],
      [3, 'Loa JBL', 'UPD', 'updated'],
      [4, 'Vest đen', 'FULL', 'duplicate'],
      [5, '', 'X', 'failed'],
      [6, 'Váy cưới 2', 'VC01', 'duplicate'],
      [7, 'Khăn voan', '', 'skipped'],
      [8, 'Máy chiếu', 'MC01', 'skipped'],
      [9, 'Váy xoá', 'DEL', 'duplicate'],
    ]);
  });

  it('details: branch quantities, written and skipped branches, the product using the barcode, reasons', () => {
    const d = Object.fromEntries(rows.map((r) => [r.row, r.detail]));
    expect(d[2]).toEqual({ code: 'created', stock: null, outlets: [{ outletId: 1, stock: 3 }, { outletId: 3, stock: 1 }] });
    expect(d[3]).toEqual({ code: 'updated', outlets: [{ outletId: 3, stock: 2 }], skippedOutlets: [1] });
    expect(d[4]).toEqual({ code: 'barcodeExists', name: 'Vest đen cũ', skippedOutlets: [1] });
    expect(d[5]).toEqual({ code: 'checkErrors', errors: [expect.objectContaining({ code: 'nameMissing' })] });
    expect(d[6]).toEqual({ code: 'barcodeInFile', ref: 2 });
    expect(d[7]).toEqual({ code: 'unchosen' });
    expect(d[8]).toEqual({ code: 'noBranch' });
    expect(d[9]).toEqual({ code: 'barcodeDeleted', name: 'Váy đã xoá' });
  });

  it('counts per kind', () => {
    expect(countResults(rows)).toEqual({ all: 8, created: 1, updated: 1, duplicate: 3, failed: 1, skipped: 2 });
  });

  it('API failed → failed with its text; notImported → skipped "blocked"', () => {
    const r = buildResultRows({
      rows: checked.rows,
      chosen,
      plan,
      api: [
        { row: 1, status: 'notImported' },
        { row: 2, status: 'failed', error: 'Category "x" not found' },
        { row: 3, status: 'notImported' },
        { row: 4, status: 'notImported' },
      ],
    });
    expect(r.find((x) => x.row === 2)).toMatchObject({ kind: 'skipped', detail: { code: 'blocked' } });
    expect(r.find((x) => x.row === 3)).toMatchObject({ kind: 'failed', detail: { code: 'apiError', message: 'Category "x" not found' } });
  });

  it('single-branch shop (no outlets on the rows): created shows the file quantity', () => {
    const single = buildBranchImport(checked.rows, chosen, { kind: 'single', outletId: 1 });
    const r = buildResultRows({ rows: checked.rows, chosen, plan: single, api: [{ row: 1, status: 'created' }, { row: 2, status: 'updated', outlets: [1], skippedOutlets: [] }] });
    expect(r[0].detail).toEqual({ code: 'created', stock: 3, outlets: null });
    expect(r[1].detail).toEqual({ code: 'updated', outlets: [{ outletId: 1, stock: 4 }], skippedOutlets: [] });
  });
});

describe('looseErrors: API errors not tied to a failed row (shown above the list)', () => {
  it('keeps a general error, drops the ones already on a failed row', () => {
    const rows = buildResultRows({ rows: checked.rows, chosen, plan, api: [{ row: 2, status: 'failed', error: 'bad' }] });
    expect(looseErrors([{ row: 3, message: 'bad' }, { row: 2, message: 'Transaction rolled back' }], rows)).toEqual([{ row: 2, message: 'Transaction rolled back' }]);
  });
});
