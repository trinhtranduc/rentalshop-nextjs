/**
 * Tổng quan (#827): which branches (outlets) the page shows, and the "So sánh chi nhánh" rows.
 * Pure: no React, no window. "Tất cả" = the ACTIVE branches; an inactive branch only when ticked.
 * The URL (`?outlets=1,3`) wins over the browser's memory (localStorage, per merchant).
 */

export interface BranchOption {
  id: number;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  /** Tailwind background class from the ar-chart palette, stable by list position */
  color: string;
}

/** ar-chart palette (globals.css); default branch first gets blue, the next amber, … */
export const BRANCH_COLORS = ['bg-ar-chart-blue', 'bg-ar-chart-amber', 'bg-ar-chart-green', 'bg-ar-chart-violet', 'bg-ar-chart-red'];

interface OutletLike {
  id?: number | string | null;
  name?: string | null;
  isActive?: boolean | null;
  isDefault?: boolean | null;
}

/** GET /api/outlets?isActive=all → options: default first, then active by name, inactive last */
export function toBranchOptions(outlets: OutletLike[] | null | undefined): BranchOption[] {
  const seen = new Set<number>();
  const rows: Omit<BranchOption, 'color'>[] = [];
  for (const o of outlets ?? []) {
    const id = typeof o.id === 'number' ? o.id : Number.NaN;
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, name: o.name || `#${id}`, isActive: o.isActive !== false, isDefault: o.isDefault === true });
  }
  const rank = (o: Omit<BranchOption, 'color'>) => (o.isDefault ? 0 : o.isActive ? 1 : 2);
  rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
  return rows.map((o, i) => ({ ...o, color: BRANCH_COLORS[i % BRANCH_COLORS.length] }));
}

/** Only a MERCHANT with two or more branches (active or not) gets the picker */
export function showsBranchPicker(role: string | null | undefined, options: BranchOption[]): boolean {
  return role === 'MERCHANT' && options.length >= 2;
}

/** `4,2` → [4, 2]; empty or malformed → null */
export function parseOutletIds(raw: string | null | undefined): number[] | null {
  if (!raw || !/^[1-9]\d*(,[1-9]\d*)*$/.test(raw)) return null;
  return [...new Set(raw.split(',').map(Number))];
}

export function allActiveIds(options: BranchOption[]): number[] {
  return options.filter((o) => o.isActive).map((o) => o.id);
}

/** Known ids only, in the options' order */
function normalize(ids: number[] | null | undefined, options: BranchOption[]): number[] {
  const wanted = new Set(ids ?? []);
  return options.filter((o) => wanted.has(o.id)).map((o) => o.id);
}

/** URL, else remembered, else all active; unknown ids dropped; nothing left → all active */
export function resolveBranchSelection(options: BranchOption[], urlRaw: string | null | undefined, stored: number[] | null): number[] {
  const fromUrl = normalize(parseOutletIds(urlRaw), options);
  if (fromUrl.length > 0) return fromUrl;
  const fromStore = normalize(stored, options);
  if (fromStore.length > 0) return fromStore;
  return allActiveIds(options);
}

export function isAllActive(selection: number[], options: BranchOption[]): boolean {
  const active = allActiveIds(options);
  const picked = new Set(selection);
  return active.length > 0 && picked.size === active.length && active.every((id) => picked.has(id));
}

/** Tick / untick one branch; the selection never becomes empty */
export function toggleBranch(selection: number[], id: number, options: BranchOption[]): number[] {
  const next = selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id];
  const normalized = normalize(next, options);
  return normalized.length > 0 ? normalized : normalize(selection, options);
}

/** "Tất cả chi nhánh" always means the active branches */
export function toggleAllBranches(_selection: number[], options: BranchOption[]): number[] {
  return allActiveIds(options);
}

/** `?outlets=` value; null (left out) for "Tất cả" */
export function outletsParam(selection: number[], options: BranchOption[]): string | null {
  return isAllActive(selection, options) ? null : normalize(selection, options).join(',') || null;
}

/** ids for the API: explicit while the picker is shown (all = active only), else none (the role's own scope) */
export function selectionOutletIds(selection: number[], options: BranchOption[], picker: boolean): number[] | undefined {
  if (!picker) return undefined;
  const ids = normalize(selection, options);
  return ids.length > 0 ? ids : undefined;
}

export type BranchLabel = { kind: 'all'; count: number } | { kind: 'one'; count: 1; name: string } | { kind: 'some'; count: number };

export function branchLabel(selection: number[], options: BranchOption[]): BranchLabel {
  const ids = normalize(selection, options);
  if (isAllActive(ids, options)) return { kind: 'all', count: ids.length };
  if (ids.length === 1) return { kind: 'one', count: 1, name: options.find((o) => o.id === ids[0])!.name };
  return { kind: 'some', count: ids.length };
}

// ----------------------------------------------------------------------------
// Browser memory (localStorage) and the sidebar label
// ----------------------------------------------------------------------------

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const LABEL_KEY = 'anyrent.dashboard.outletLabel';
/** Window event the sidebar listens to after the dashboard selection changes */
export const BRANCH_SELECTION_EVENT = 'anyrent:outlet-selection';

export function branchStorageKey(merchantId: number | string | null | undefined): string {
  return `anyrent.dashboard.outlets.${merchantId ?? 'none'}`;
}

export function readStoredBranches(storage: StorageLike | null | undefined, merchantId: number | string | null | undefined): number[] | null {
  try {
    const raw = storage?.getItem(branchStorageKey(merchantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parseOutletIds(parsed.filter((n) => Number.isInteger(n)).join(',')) : null;
  } catch {
    return null;
  }
}

export function writeStoredBranches(
  storage: StorageLike | null | undefined,
  merchantId: number | string | null | undefined,
  ids: number[],
  label: BranchLabel,
): void {
  try {
    storage?.setItem(branchStorageKey(merchantId), JSON.stringify(ids));
    storage?.setItem(LABEL_KEY, JSON.stringify({ ...label, merchantId: merchantId ?? null }));
  } catch {
    // private window or blocked storage: the URL still carries the selection
  }
}

/** The sidebar label the dashboard left; null for another merchant (`merchantId` given and different) */
export function readStoredBranchLabel(storage: StorageLike | null | undefined, merchantId?: number | string | null): BranchLabel | null {
  try {
    const raw = storage?.getItem(LABEL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (merchantId != null && String(v?.merchantId) !== String(merchantId)) return null;
    if (v?.kind === 'all' || v?.kind === 'some') return Number.isInteger(v.count) ? { kind: v.kind, count: v.count } : null;
    if (v?.kind === 'one' && typeof v.name === 'string') return { kind: 'one', count: 1, name: v.name };
    return null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// So sánh chi nhánh (GET /api/analytics/period?byOutlet=1)
// ----------------------------------------------------------------------------

type Num = number | null | undefined;

export interface OutletRowLike {
  outletId: number;
  outletName?: string | null;
  orderValue?: Num;
  collected?: Num;
  cashCollected?: Num;
  outstanding?: Num;
  newOrders?: Num;
  collateralHeldOrders?: Num;
}

export type CompareKey = 'name' | 'orderValue' | 'collected' | 'outstanding' | 'newOrders' | 'collateralHeldOrders';
export interface CompareSort {
  key: CompareKey;
  dir: 'asc' | 'desc';
}

export interface CompareRow {
  outletId: number;
  name: string;
  color: string;
  orderValue: number;
  /** Thực thu as the card: cashCollected (collateral included), else collected */
  collected: number;
  outstanding: number;
  newOrders: number;
  collateralHeldOrders: number;
  /** 0–100 of the largest Giá trị đơn mới */
  bar: number;
  /** % share of Giá trị đơn mới, rounded */
  share: number;
}

export interface CompareTotal {
  orderValue: number;
  collected: number;
  outstanding: number;
  newOrders: number;
  collateralHeldOrders: number;
  count: number;
}

const n = (v: Num): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function compareBranches(
  byOutlet: OutletRowLike[] | null | undefined,
  options: BranchOption[],
  sort: CompareSort = { key: 'orderValue', dir: 'desc' },
): { rows: CompareRow[]; total: CompareTotal } {
  const list = byOutlet ?? [];
  const maxValue = Math.max(0, ...list.map((r) => n(r.orderValue)));
  const sumValue = list.reduce((s, r) => s + Math.max(0, n(r.orderValue)), 0);
  const rows: CompareRow[] = list.map((r, i) => {
    const option = options.find((o) => o.id === r.outletId);
    const value = n(r.orderValue);
    return {
      outletId: r.outletId,
      name: option?.name || r.outletName || `#${r.outletId}`,
      color: option?.color ?? BRANCH_COLORS[i % BRANCH_COLORS.length],
      orderValue: value,
      collected: typeof r.cashCollected === 'number' ? r.cashCollected : n(r.collected),
      outstanding: n(r.outstanding),
      newOrders: n(r.newOrders),
      collateralHeldOrders: n(r.collateralHeldOrders),
      bar: maxValue > 0 ? (Math.max(0, value) / maxValue) * 100 : 0,
      share: sumValue > 0 ? Math.round((Math.max(0, value) / sumValue) * 100) : 0,
    };
  });
  const sign = sort.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const diff = sort.key === 'name' ? a.name.localeCompare(b.name, 'vi') : a[sort.key] - b[sort.key];
    return diff !== 0 ? diff * sign : a.outletId - b.outletId;
  });
  const total: CompareTotal = {
    orderValue: rows.reduce((s, r) => s + r.orderValue, 0),
    collected: rows.reduce((s, r) => s + r.collected, 0),
    outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
    newOrders: rows.reduce((s, r) => s + r.newOrders, 0),
    collateralHeldOrders: rows.reduce((s, r) => s + r.collateralHeldOrders, 0),
    count: rows.length,
  };
  return { rows, total };
}
