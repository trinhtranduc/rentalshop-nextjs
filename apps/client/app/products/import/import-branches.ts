/**
 * #1533 Nhập Excel theo chi nhánh: which branch gets the file's quantity, the "Hiện" + quantity cell of each branch on
 * every row, and the body POST /api/products/bulk-import receives. Pure and unit-tested; page.tsx only renders.
 * Spec: .agent/changes/1533-import-branch-stock/spec.md (11-16).
 */
import type { CheckedRow, ImportPayload } from './import-model';

export interface ImportOutlet {
  id: number;
  name: string;
  isDefault?: boolean | null;
  isActive?: boolean | null;
}

/** Active outlets, the main branch first, then the API order. */
export function activeImportOutlets<T extends ImportOutlet>(outlets: T[]): T[] {
  const active = outlets.filter((o) => o.isActive !== false);
  return [...active.filter((o) => o.isDefault === true), ...active.filter((o) => o.isDefault !== true)];
}

export type ImportBranchMode<T extends ImportOutlet = ImportOutlet> =
  /** Owner with 2+ active branches: picks the branch of the file's quantity (main by default) and edits each branch. */
  | { kind: 'pick'; outlets: T[]; target: number }
  /** Manager / stock keeper: own branch only, locked. */
  | { kind: 'own'; outlet: { id: number; name: string } }
  /** One active branch (or branches not loaded: `outletId` null, the old call): the table stays as before. */
  | { kind: 'single'; outletId: number | null };

export function importBranchMode<T extends ImportOutlet>(input: {
  branchRole: boolean;
  ownOutlet: { id: number; name: string } | null;
  outlets: T[];
}): ImportBranchMode<T> {
  if (input.branchRole) return input.ownOutlet ? { kind: 'own', outlet: input.ownOutlet } : { kind: 'single', outletId: null };
  const active = activeImportOutlets(input.outlets);
  if (active.length >= 2) return { kind: 'pick', outlets: active, target: active[0].id };
  return { kind: 'single', outletId: active[0]?.id ?? null };
}

export interface Cell {
  on: boolean;
  qty: number;
}
/** File row → outlet id → cell. Rows with errors have none. */
export type Cells = Record<number, Record<number, Cell>>;

const OFF: Cell = { on: false, qty: 0 };

/** The chosen branch on with the file's quantity; every other branch off at 0. */
export function defaultCells(rows: CheckedRow[], outletIds: number[], target: number): Cells {
  const cells: Cells = {};
  for (const r of rows) {
    if (!r.payload) continue;
    const stock = r.payload.stock;
    cells[r.row] = Object.fromEntries(outletIds.map((id) => [id, id === target ? { on: true, qty: stock } : { ...OFF }]));
  }
  return cells;
}

function withCell(cells: Cells, row: number, outletId: number, next: (c: Cell) => Cell): Cells {
  const current = cells[row];
  if (!current) return cells;
  return { ...cells, [row]: { ...current, [outletId]: next(current[outletId] ?? OFF) } };
}

/** "Hiện" on/off. Turning a branch on keeps its number (0 until typed or copied), never the file's quantity. */
export function toggleCell(cells: Cells, row: number, outletId: number): Cells {
  return withCell(cells, row, outletId, (c) => ({ on: !c.on, qty: c.qty }));
}

/** Typed quantity: a whole number ≥ 0. */
export function setQty(cells: Cells, row: number, outletId: number, qty: number): Cells {
  const clean = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
  return withCell(cells, row, outletId, (c) => ({ on: c.on, qty: clean }));
}

function mapColumn(cells: Cells, outletId: number, next: (c: Cell, row: Record<number, Cell>) => Cell): Cells {
  const out: Cells = {};
  for (const [row, byOutlet] of Object.entries(cells)) {
    out[Number(row)] = { ...byOutlet, [outletId]: next(byOutlet[outletId] ?? OFF, byOutlet) };
  }
  return out;
}

/** "Bật hết": the whole column on, numbers kept. */
export function turnColumnOn(cells: Cells, outletId: number): Cells {
  return mapColumn(cells, outletId, (c) => ({ on: true, qty: c.qty }));
}

/** "Chép số lượng từ <chi nhánh đã chọn>": the column on with the chosen branch's numbers. */
export function copyColumn(cells: Cells, fromId: number, toId: number): Cells {
  return mapColumn(cells, toId, (_c, byOutlet) => ({ on: true, qty: (byOutlet[fromId] ?? OFF).qty }));
}

export function rowHasBranch(cells: Cells, row: number): boolean {
  return Object.values(cells[row] ?? {}).some((c) => c.on);
}

/** The branches that are on, in branch order, with their quantity. */
export function rowOutlets(cells: Cells, row: number, outletIds: number[]): Array<{ outletId: number; stock: number }> {
  const byOutlet = cells[row] ?? {};
  return outletIds.filter((id) => byOutlet[id]?.on).map((id) => ({ outletId: id, stock: byOutlet[id].qty }));
}

export type BranchImportOptions =
  | { kind: 'cells'; target: number; outletIds: number[]; cells: Cells }
  | { kind: 'single'; outletId: number | null };

export type BranchImportItem = ImportPayload & { outlets?: Array<{ outletId: number; stock: number }> };

/**
 * Body for the chosen valid rows, each item's file row (index i ↔ API row i + 1), and the chosen rows left out because
 * no branch is on.
 */
export function buildBranchImport(
  rows: CheckedRow[],
  chosen: ReadonlySet<number>,
  opts: BranchImportOptions,
): { body: { outletId?: number; products: BranchImportItem[] }; fileRows: number[]; noBranchRows: number[] } {
  const picked = rows.filter((r) => r.payload && chosen.has(r.row));
  const products: BranchImportItem[] = [];
  const fileRows: number[] = [];
  const noBranchRows: number[] = [];
  for (const r of picked) {
    const payload = r.payload as ImportPayload;
    if (opts.kind === 'cells') {
      const outlets = rowOutlets(opts.cells, r.row, opts.outletIds);
      if (outlets.length === 0) {
        noBranchRows.push(r.row);
        continue;
      }
      products.push({ ...payload, outlets });
    } else {
      products.push(payload);
    }
    fileRows.push(r.row);
  }
  const outletId = opts.kind === 'cells' ? opts.target : opts.outletId;
  return { body: outletId !== null ? { outletId, products } : { products }, fileRows, noBranchRows };
}

export interface OutletResult {
  outletId: number;
  listed: number;
  outOfStock: number;
  skipped: number;
}

/** `byOutlet` of the API answer; null when the API did not send it (old API, or a call without branches). */
export function readByOutlet(data: unknown): OutletResult[] | null {
  const list = data && typeof data === 'object' ? (data as { byOutlet?: unknown }).byOutlet : undefined;
  if (!Array.isArray(list)) return null;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return list
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object' && Number.isInteger((e as { outletId?: unknown }).outletId))
    .map((e) => ({ outletId: e.outletId as number, listed: n(e.listed), outOfStock: n(e.outOfStock), skipped: n(e.skipped) }));
}
