/**
 * In tem (#623): picked products, copies, what prints and what is skipped. Pure, so Jest loads it.
 */
import { isCode128B } from './code128';

export interface LabelProduct {
  id: number;
  name: string;
  barcode: string | null;
}

export interface Picked {
  product: LabelProduct;
  copies: number;
}

/** Picked products in pick order (id → row). */
export type Picks = Picked[];

export const COPIES = { min: 1, max: 99 };
/** Most products preselected through `?ids=`. */
export const MAX_IDS = 100;

/** Copies typed in the box → 1–99 (bad input → 1). */
export function clampCopies(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return COPIES.min;
  return Math.min(COPIES.max, Math.max(COPIES.min, Math.floor(n)));
}

/** `?ids=3,5,5,x` → [3, 5]: positive integers, no repeats, at most MAX_IDS. */
export function parseIdsParam(raw: string | null | undefined): number[] {
  const out: number[] = [];
  for (const part of (raw || '').split(',')) {
    const n = Number(part.trim());
    if (part.trim() && Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

/** A row from GET /api/products → what a label needs. */
export function toLabelProduct(p: { id: number; name?: string | null; barcode?: string | null }): LabelProduct {
  const code = (p.barcode || '').trim();
  return { id: p.id, name: (p.name || '').trim(), barcode: code || null };
}

export const isPicked = (picks: Picks, id: number) => picks.some((x) => x.product.id === id);

/** Adds the product (1 copy) or removes it. */
export function togglePick(picks: Picks, product: LabelProduct): Picks {
  return isPicked(picks, product.id) ? picks.filter((x) => x.product.id !== product.id) : [...picks, { product, copies: 1 }];
}

export function setCopies(picks: Picks, id: number, copies: unknown): Picks {
  return picks.map((x) => (x.product.id === id ? { ...x, copies: clampCopies(copies) } : x));
}

export type PageCheck = 'all' | 'some' | 'none';

export function pageCheck(picks: Picks, page: LabelProduct[]): PageCheck {
  if (page.length === 0) return 'none';
  const n = page.filter((p) => isPicked(picks, p.id)).length;
  return n === 0 ? 'none' : n === page.length ? 'all' : 'some';
}

/** "Chọn tất cả trên trang": every row on the page picked; when all already are, they are removed. */
export function togglePagePicks(picks: Picks, page: LabelProduct[]): Picks {
  if (pageCheck(picks, page) === 'all') {
    const ids = new Set(page.map((p) => p.id));
    return picks.filter((x) => !ids.has(x.product.id));
  }
  const added = page.filter((p) => !isPicked(picks, p.id)).map((product) => ({ product, copies: 1 }));
  return [...picks, ...added];
}

export interface PrintLabel {
  key: string;
  name: string;
  code: string;
}

export interface Skipped {
  id: number;
  name: string;
  reason: 'empty' | 'invalid';
}

export interface PrintJob {
  labels: PrintLabel[];
  skipped: Skipped[];
}

/** Picks → one label per copy (in pick order); products without a printable code are skipped. */
export function buildPrintJob(picks: Picks): PrintJob {
  const labels: PrintLabel[] = [];
  const skipped: Skipped[] = [];
  for (const { product, copies } of picks) {
    const code = product.barcode;
    if (!code) {
      skipped.push({ id: product.id, name: product.name, reason: 'empty' });
      continue;
    }
    if (!isCode128B(code)) {
      skipped.push({ id: product.id, name: product.name, reason: 'invalid' });
      continue;
    }
    for (let i = 0; i < clampCopies(copies); i++) labels.push({ key: `${product.id}-${i}`, name: product.name, code });
  }
  return { labels, skipped };
}

/** Labels grouped by printed page (`perRow` side by side; the last row may be short). */
export function toPages<L>(labels: L[], perRow: number): L[][] {
  const n = Math.max(1, Math.floor(perRow));
  const pages: L[][] = [];
  for (let i = 0; i < labels.length; i += n) pages.push(labels.slice(i, i + n));
  return pages;
}
