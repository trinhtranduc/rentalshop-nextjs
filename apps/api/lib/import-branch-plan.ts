/**
 * #1533 Excel import per branch: pure rules behind POST /api/products/bulk-import when the caller names branches
 * (`outletId` on the body and/or `outlets` on a row). Spec: .agent/changes/1533-import-branch-stock/spec.md.
 */

/** A branch ticked "Hiện" on a row, with the stock it gets. */
export interface BranchQty {
  outletId: number;
  stock: number;
}

export interface NewStockRow {
  outletId: number;
  stock: number;
  available: number;
  renting: number;
  isListed: boolean;
}

export interface OutletTally {
  outletId: number;
  /** Rows listed at this branch by the import (new product or an existing one that had no stock there). */
  listed: number;
  /** Of `listed`, those with stock 0. */
  outOfStock: number;
  /** Existing products already holding stock at this branch: left as they were. */
  skipped: number;
}

/** The call names branches: spec 2-3. Without it the route keeps the old behaviour (spec 1). */
export function usesBranches(bodyOutletId: unknown, products: unknown[]): boolean {
  return bodyOutletId !== undefined || products.some((p) => !!p && typeof p === 'object' && 'outlets' in (p as object));
}

const isWhole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** `outlets` of one row: null when not sent, 'invalid' when not an array of `{ outletId > 0, stock ≥ 0 }`. */
export function readRowOutlets(raw: unknown): BranchQty[] | null | 'invalid' {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return 'invalid';
  const out: BranchQty[] = [];
  for (const entry of raw) {
    const e = entry as { outletId?: unknown; stock?: unknown } | null;
    if (!e || !isWhole(e.outletId) || e.outletId === 0 || !isWhole(e.stock)) return 'invalid';
    if (!out.some((o) => o.outletId === e.outletId)) out.push({ outletId: e.outletId, stock: e.stock });
  }
  return out;
}

/**
 * Branches of one row (spec 2, 3, 5). A branch role only ever gets its own outlet: the number of its own entry in
 * `outlets` when sent, else the file stock; any other outlet is ignored.
 */
export function rowBranches(input: {
  rowOutlets: BranchQty[] | null;
  rowStock: number;
  bodyOutletId: number | null;
  ownOutletId: number | null;
}): BranchQty[] {
  const { rowOutlets, rowStock, bodyOutletId, ownOutletId } = input;
  if (ownOutletId !== null) {
    const own = rowOutlets?.find((o) => o.outletId === ownOutletId);
    return [{ outletId: ownOutletId, stock: own ? own.stock : rowStock }];
  }
  if (rowOutlets !== null) return rowOutlets;
  return bodyOutletId !== null ? [{ outletId: bodyOutletId, stock: rowStock }] : [];
}

/** Outlet ids the caller named that are not active outlets of the shop (spec 4). */
export function unknownOutletIds(requested: number[], activeIds: number[]): number[] {
  return Array.from(new Set(requested.filter((id) => !activeIds.includes(id))));
}

/** Stock rows of a new product: every outlet; ticked ones listed with their stock, the others an unlisted 0 (spec 6). */
export function newProductStockRows(branches: BranchQty[], outletIds: number[]): NewStockRow[] {
  return outletIds.map((outletId) => {
    const b = branches.find((x) => x.outletId === outletId);
    return b
      ? { outletId, stock: b.stock, available: b.stock, renting: 0, isListed: true }
      : { outletId, stock: 0, available: 0, renting: 0, isListed: false };
  });
}

/** Existing product (spec 8): ticked branches at stock 0 (or without a row) are written; the others are skipped. */
export function existingProductWrites(
  branches: BranchQty[],
  current: Array<{ outletId: number; stock: number }>,
): { write: BranchQty[]; skipped: number[] } {
  const write: BranchQty[] = [];
  const skipped: number[] = [];
  for (const b of branches) {
    const row = current.find((c) => c.outletId === b.outletId);
    if (row && row.stock > 0) skipped.push(b.outletId);
    else write.push(b);
  }
  return { write, skipped };
}

/** Per-branch counts for the result screen, in outlet order. */
export class OutletTallies {
  private readonly byId = new Map<number, OutletTally>();

  constructor(outletIds: number[]) {
    for (const outletId of outletIds) this.byId.set(outletId, { outletId, listed: 0, outOfStock: 0, skipped: 0 });
  }

  private at(outletId: number): OutletTally {
    let t = this.byId.get(outletId);
    if (!t) {
      t = { outletId, listed: 0, outOfStock: 0, skipped: 0 };
      this.byId.set(outletId, t);
    }
    return t;
  }

  listed(branches: BranchQty[]): void {
    for (const b of branches) {
      const t = this.at(b.outletId);
      t.listed += 1;
      if (b.stock === 0) t.outOfStock += 1;
    }
  }

  skipped(outletIds: number[]): void {
    for (const id of outletIds) this.at(id).skipped += 1;
  }

  toJSON(): OutletTally[] {
    return Array.from(this.byId.values());
  }
}
