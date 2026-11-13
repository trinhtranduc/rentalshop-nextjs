/**
 * #1535 Kết quả nhập Excel: a status and a detail for every data row of the file, and the counts shown on top.
 * Rows sent to the API take `rows[]` of the answer (index i ↔ API row i + 1, see `buildBranchImport`); rows that were
 * not sent explain why (check error, same barcode in the file, not chosen, no branch on).
 */
import type { CheckedRow, RowError } from './import-model';
import type { BranchImportItem } from './import-branches';

const API_STATUSES = ['created', 'updated', 'duplicate', 'failed', 'notImported'] as const;
export type ApiRowStatus = (typeof API_STATUSES)[number];

export interface ApiRowResult {
  row: number;
  status: ApiRowStatus;
  reason?: 'barcodeExists' | 'barcodeDeleted';
  existingName?: string;
  outlets?: number[];
  skippedOutlets?: number[];
  error?: string;
}

const ids = (v: unknown): number[] | undefined => (Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : undefined);

/** `rows` of the API answer; null when the API did not send it (older API). */
export function readRowResults(data: unknown): ApiRowResult[] | null {
  const list = data && typeof data === 'object' ? (data as { rows?: unknown }).rows : undefined;
  if (!Array.isArray(list)) return null;
  const out: ApiRowResult[] = [];
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    if (!Number.isInteger(r.row) || !API_STATUSES.includes(r.status as ApiRowStatus)) continue;
    const item: ApiRowResult = { row: r.row as number, status: r.status as ApiRowStatus };
    if (r.reason === 'barcodeExists' || r.reason === 'barcodeDeleted') item.reason = r.reason;
    if (typeof r.existingName === 'string') item.existingName = r.existingName;
    const outlets = ids(r.outlets);
    if (outlets) item.outlets = outlets;
    const skipped = ids(r.skippedOutlets);
    if (skipped) item.skippedOutlets = skipped;
    if (typeof r.error === 'string') item.error = r.error;
    out.push(item);
  }
  return out;
}

export type ResultKind = 'created' | 'updated' | 'duplicate' | 'failed' | 'skipped';
export const RESULT_KINDS: ResultKind[] = ['created', 'updated', 'duplicate', 'failed', 'skipped'];

type BranchQty = { outletId: number; stock: number };

export type ResultDetail =
  /** `outlets` = the branches turned on with their quantity; `stock` = the file quantity when the rows had no branches. */
  | { code: 'created'; stock: number | null; outlets: BranchQty[] | null }
  | { code: 'updated'; outlets: BranchQty[]; skippedOutlets: number[] }
  | { code: 'barcodeExists'; name: string | null; skippedOutlets: number[] }
  | { code: 'barcodeDeleted'; name: string | null }
  /** Same barcode as an earlier row of the file. */
  | { code: 'barcodeInFile'; ref: number }
  | { code: 'checkErrors'; errors: RowError[] }
  | { code: 'apiError'; message: string }
  | { code: 'unchosen' }
  | { code: 'noBranch' }
  /** Sent, but nothing was imported because another row failed. */
  | { code: 'blocked' };

export interface ResultRow {
  row: number;
  name: string;
  barcode: string;
  kind: ResultKind;
  detail: ResultDetail;
}

export function buildResultRows(input: {
  rows: CheckedRow[];
  chosen: ReadonlySet<number>;
  plan: { body: { products: BranchImportItem[] }; fileRows: number[]; noBranchRows: number[] };
  api: ApiRowResult[];
}): ResultRow[] {
  const { rows, chosen, plan, api } = input;
  const sentIndex = new Map(plan.fileRows.map((fileRow, i) => [fileRow, i]));
  const noBranch = new Set(plan.noBranchRows);
  const byApiRow = new Map(api.map((a) => [a.row, a]));

  return rows.map((r) => {
    const base = { row: r.row, name: r.values.name ?? '', barcode: r.values.barcode ?? '' };
    if (r.errors.length > 0) {
      const inFile = r.errors.find((e) => e.code === 'barcodeDuplicate');
      if (inFile && r.errors.every((e) => e.code === 'barcodeDuplicate')) {
        return { ...base, kind: 'duplicate', detail: { code: 'barcodeInFile', ref: inFile.ref ?? 0 } };
      }
      return { ...base, kind: 'failed', detail: { code: 'checkErrors', errors: r.errors } };
    }
    if (!chosen.has(r.row)) return { ...base, kind: 'skipped', detail: { code: 'unchosen' } };
    if (noBranch.has(r.row)) return { ...base, kind: 'skipped', detail: { code: 'noBranch' } };

    const i = sentIndex.get(r.row);
    const a = i === undefined ? undefined : byApiRow.get(i + 1);
    const item = i === undefined ? undefined : plan.body.products[i];
    if (!a || !item) return { ...base, kind: 'skipped', detail: { code: 'blocked' } };

    const qtyOf = (outletId: number) => item.outlets?.find((o) => o.outletId === outletId)?.stock ?? item.stock;
    switch (a.status) {
      case 'created':
        return { ...base, kind: 'created', detail: { code: 'created', stock: item.outlets ? null : item.stock, outlets: item.outlets ?? null } };
      case 'updated':
        return {
          ...base,
          kind: 'updated',
          detail: { code: 'updated', outlets: (a.outlets ?? []).map((id) => ({ outletId: id, stock: qtyOf(id) })), skippedOutlets: a.skippedOutlets ?? [] },
        };
      case 'duplicate':
        return a.reason === 'barcodeDeleted'
          ? { ...base, kind: 'duplicate', detail: { code: 'barcodeDeleted', name: a.existingName ?? null } }
          : { ...base, kind: 'duplicate', detail: { code: 'barcodeExists', name: a.existingName ?? null, skippedOutlets: a.skippedOutlets ?? [] } };
      case 'failed':
        return { ...base, kind: 'failed', detail: { code: 'apiError', message: a.error ?? '' } };
      default:
        return { ...base, kind: 'skipped', detail: { code: 'blocked' } };
    }
  });
}

export type ResultCounts = Record<ResultKind | 'all', number>;

export function countResults(rows: ResultRow[]): ResultCounts {
  const counts: ResultCounts = { all: rows.length, created: 0, updated: 0, duplicate: 0, failed: 0, skipped: 0 };
  for (const r of rows) counts[r.kind] += 1;
  return counts;
}

/** API errors that no failed row shows (e.g. the whole write rolled back), to show above the list. */
export function looseErrors(errors: Array<{ row: number | null; message: string }>, rows: ResultRow[]): Array<{ row: number | null; message: string }> {
  const shown = new Set(rows.filter((r) => r.detail.code === 'apiError').map((r) => r.row));
  return errors.filter((e) => e.row === null || !shown.has(e.row));
}
