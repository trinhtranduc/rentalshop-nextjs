/**
 * #1535 Excel import: what happened to each product sent to POST /api/products/bulk-import, as `rows[]` of the answer.
 * `row` is the 1-based position in `products`, like `errors[].row`. A row with no entry was not imported (another row
 * failed, or the write was rolled back).
 */
export type ImportRowResult =
  | { row: number; status: 'created' }
  | { row: number; status: 'updated'; outlets: number[]; skippedOutlets: number[] }
  | {
      row: number;
      status: 'duplicate';
      reason: 'barcodeExists' | 'barcodeDeleted';
      existingName?: string;
      skippedOutlets?: number[];
    }
  | { row: number; status: 'failed'; error: string }
  | { row: number; status: 'notImported' };

export class RowResults {
  private readonly byRow = new Map<number, ImportRowResult>();

  constructor(private readonly total: number) {}

  set(result: ImportRowResult): void {
    this.byRow.set(result.row, result);
  }

  /** Same-barcode product found before writing. `skippedOutlets` only on a call with branches. */
  duplicate(row: number, existing: { name?: unknown; deletedAt?: unknown } | null, skippedOutlets?: number[]): void {
    const name = typeof existing?.name === 'string' && existing.name.trim() ? existing.name : undefined;
    this.set({
      row,
      status: 'duplicate',
      reason: existing?.deletedAt ? 'barcodeDeleted' : 'barcodeExists',
      ...(name ? { existingName: name } : {}),
      ...(skippedOutlets ? { skippedOutlets } : {}),
    });
  }

  /** The write was rolled back: what was created or updated in it is not in the shop any more. */
  rollback(): void {
    for (const [row, r] of Array.from(this.byRow.entries())) {
      if (r.status === 'created' || r.status === 'updated') this.byRow.delete(row);
    }
  }

  toJSON(): ImportRowResult[] {
    return Array.from({ length: this.total }, (_, i) => this.byRow.get(i + 1) ?? { row: i + 1, status: 'notImported' as const });
  }
}
