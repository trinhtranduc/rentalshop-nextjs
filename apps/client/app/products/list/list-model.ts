/**
 * #526 shop web Sản phẩm: pure mapping from GET /api/products rows and the URL to what the list shows.
 * No app imports, so it runs in Jest under any TZ.
 */

type Num = number | null | undefined;

// ----------------------------------------------------------------------------
// URL state
// ----------------------------------------------------------------------------

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

export function parsePageSize(raw: string | null | undefined): number {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function parsePage(raw: string | null | undefined): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** A positive integer id from the URL, else undefined. */
export function parseId(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export const SORTS = {
  name: { sortBy: 'name', sortOrder: 'asc' },
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  priceAsc: { sortBy: 'rentPrice', sortOrder: 'asc' },
  priceDesc: { sortBy: 'rentPrice', sortOrder: 'desc' },
} as const;
export type SortKey = keyof typeof SORTS;
export const SORT_KEYS = Object.keys(SORTS) as SortKey[];

export function parseSort(raw: string | null | undefined): SortKey {
  return raw && raw in SORTS ? (raw as SortKey) : 'name';
}

export interface ListQuery {
  q: string;
  categoryId?: number;
  outletId?: number;
  sort: SortKey;
  page: number;
  limit: number;
}

export function parseListQuery(get: (key: string) => string | null): ListQuery {
  return {
    q: (get('q') || '').trim(),
    categoryId: parseId(get('category')),
    outletId: parseId(get('outlet')),
    sort: parseSort(get('sort')),
    page: parsePage(get('page')),
    limit: parsePageSize(get('limit')),
  };
}

/**
 * Filters for `productsApi.searchProducts` (the client sends `search` as `q`).
 * #1341 `listed: true` keeps only the products listed at the branch ("Hiện ở chi nhánh"); without it the call is as before.
 */
export function toApiFilters(query: ListQuery, opts?: { listed?: boolean }) {
  return {
    search: query.q || undefined,
    categoryId: query.categoryId,
    outletId: query.outletId,
    page: query.page,
    limit: query.limit,
    ...SORTS[query.sort],
    ...(opts?.listed ? { listed: true } : {}),
  };
}

const OUTLET_ROLES = ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'];

/**
 * #1341: the list shows one branch (only what that branch lists) for a branch role, and for the owner who picked a branch in
 * the filter. The owner without a branch sees every product ("Tất cả chi nhánh"). The API ignores `listed` for a
 * shop with one active branch, so the web does not have to count them.
 */
export function listedFilterFor(query: ListQuery, user: { role?: string | null; outletId?: number | null } | null | undefined): boolean {
  if (!user) return false;
  if (OUTLET_ROLES.includes(user.role || '')) return true;
  return (user.role === 'MERCHANT' || user.role === 'ADMIN') && query.outletId != null;
}

export interface BranchColumn {
  id: number;
  name: string;
}

/**
 * #1341 "Tất cả chi nhánh" (owner, web): one column per open branch, each cell "Hiện · 8" / "Chưa hiện". Null for a
 * branch role, with a branch chosen in the filter, or when the shop has fewer than two open branches.
 */
export function branchColumnsFor(
  query: ListQuery,
  user: { role?: string | null; outletId?: number | null } | null | undefined,
  outlets: Array<{ id: number; name: string; isActive?: boolean | null }>
): BranchColumn[] | null {
  if (!user || (user.role !== 'MERCHANT' && user.role !== 'ADMIN') || query.outletId != null) return null;
  const open = (outlets || []).filter((o) => o && o.isActive !== false).map((o) => ({ id: o.id, name: o.name }));
  return open.length >= 2 ? open : null;
}

/** Same filters without paging, used to count or collect every matching product. */
export function filterKey(query: ListQuery): string {
  return JSON.stringify([query.q, query.categoryId ?? null, query.outletId ?? null]);
}

// ----------------------------------------------------------------------------
// Rows
// ----------------------------------------------------------------------------

export interface PricingOptionLike {
  type?: string | null;
  price?: Num;
  unit?: string | null;
  isActive?: boolean | null;
}

export interface OutletStockLike {
  stock?: Num;
  renting?: Num;
  available?: Num;
  /** #1341 "Hiện ở chi nhánh"; an API from before the column sends none (read as listed) */
  isListed?: boolean | null;
  outlet?: { id?: number | null; name?: string | null } | null;
}

/** #830: another active outlet of the shop, sent to OUTLET_ADMIN / OUTLET_INVENTORY only (read only). */
export interface OtherOutletLike {
  outletId: number;
  outletName?: string | null;
  stock?: Num;
  available?: Num;
  renting?: Num;
}

export interface ProductLike {
  id: number;
  name?: string | null;
  barcode?: string | null;
  images?: unknown;
  rentPrice?: Num;
  salePrice?: Num;
  pricingType?: string | null;
  pricingOptions?: PricingOptionLike[] | null;
  category?: { id?: number | null; name?: string | null } | null;
  totalStock?: Num;
  stock?: Num;
  renting?: Num;
  available?: Num;
  outletStock?: OutletStockLike[] | null;
  otherOutlets?: OtherOutletLike[] | null;
  isActive?: boolean | null;
}

export interface ProductPrices {
  /** "Thuê theo lần" (FIXED). */
  once: number | null;
  /** "Thuê theo ngày" (DAILY per day). */
  day: number | null;
  /** Older hourly products; shown in the "lần" column with "/giờ". */
  hour: number | null;
  /** #1189 "Giá theo khối ngày": the price of day 1 (the table is on the detail page); null without a BLOCK option. */
  block: number | null;
  sale: number | null;
}

const pos = (n: Num): number | null => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null);
const toNum = (n: unknown): number => {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

/** Rent prices by kind: pricing options when the product has them, else rentPrice by pricingType. */
export function productPrices(p: ProductLike): ProductPrices {
  const out: ProductPrices = { once: null, day: null, hour: null, block: null, sale: pos(toNum(p.salePrice)) };
  const options = (p.pricingOptions || []).filter((o) => o && o.isActive !== false);
  if (options.length > 0) {
    for (const o of options) {
      // #951: an option priced 0 is a 0đ price (shown "0 ₫"); a missing or negative price is skipped
      const price = o.price == null || (o.price as unknown) === '' || toNum(o.price) < 0 ? null : toNum(o.price);
      if (price == null) continue;
      const type = String(o.type || '').toUpperCase();
      const unit = String(o.unit || '').toUpperCase();
      if (type === 'BLOCK') out.block ??= price;
      else if (type === 'FIXED') out.once ??= price;
      else if (type === 'HOURLY' || (type === 'DAILY' && unit === 'HOUR')) out.hour ??= price;
      else if (type === 'DAILY') out.day ??= price;
    }
    return out;
  }
  const rent = pos(toNum(p.rentPrice));
  const type = String(p.pricingType || 'FIXED').toUpperCase();
  if (type === 'DAILY') out.day = rent;
  else if (type === 'HOURLY') out.hour = rent;
  else out.once = rent;
  return out;
}

export interface StockView {
  total: number;
  available: number;
  renting: number;
  /** "Hết": nothing free today. */
  out: boolean;
}

/**
 * Today's stock for the list. With an outlet in scope (URL filter, or the outlet of an outlet user) use
 * that outlet's row; otherwise the product rollup the API sends (same rule as the old list).
 */
export function stockView(p: ProductLike, scopedOutletId?: number): StockView {
  const rows = p.outletStock || [];
  const scoped = scopedOutletId != null ? rows.find((r) => r?.outlet?.id === scopedOutletId) : undefined;
  const total = Math.max(0, toNum(scoped ? scoped.stock : p.totalStock ?? p.stock));
  const renting = Math.max(0, toNum(scoped ? scoped.renting : p.renting));
  const available = Math.max(0, toNum(scoped ? scoped.available : p.available));
  return { total, available, renting, out: available <= 0 };
}

/** Outlet users see their outlet's stock; a merchant picks one with the outlet filter. */
export function scopedOutletFor(filterOutletId: number | undefined, user: { role?: string | null; outletId?: number | null } | null | undefined): number | undefined {
  if (filterOutletId != null) return filterOutletId;
  if ((user?.role === 'OUTLET_ADMIN' || user?.role === 'OUTLET_STAFF' || user?.role === 'OUTLET_INVENTORY') && typeof user.outletId === 'number') return user.outletId;
  return undefined;
}

/** First image URL, if any (`images` is an array of URLs, or a comma string on older rows). */
export function firstImage(images: unknown): string | null {
  const list = Array.isArray(images) ? images : typeof images === 'string' ? images.split(',') : [];
  const url = list.map((x) => (typeof x === 'string' ? x.trim() : '')).find((x) => /^https?:\/\//.test(x) || x.startsWith('/'));
  return url || null;
}

export interface ProductRow {
  id: number;
  name: string;
  code: string;
  category: string;
  image: string | null;
  prices: ProductPrices;
  stock: StockView;
  /** #830: units free at the other outlets of the shop; null when the API sends none (staff, merchant). */
  otherAvailable: number | null;
  /** #1341: one cell per branch column of "Tất cả chi nhánh" (owner); null in a one-branch view */
  branches: BranchCell[] | null;
}

/** Sum of `available` over `otherOutlets`, or null when the field is missing or empty. */
export function otherOutletsAvailable(p: ProductLike): number | null {
  const rows = Array.isArray(p.otherOutlets) ? p.otherOutlets.filter(Boolean) : [];
  if (rows.length === 0) return null;
  return rows.reduce((sum, r) => sum + Math.max(0, toNum(r.available)), 0);
}

const BRANCH_ROLES = ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'];

/**
 * Rows of the detail page's stock table: a branch user sees only its own outlet (other outlets come from
 * `otherOutlets`, for OUTLET_ADMIN / kho only); a merchant sees every outlet.
 */
export function ownStockRows<R extends OutletStockLike>(
  rows: Array<R | null | undefined> | null | undefined,
  user: { role?: string | null; outletId?: number | null } | null | undefined
): R[] {
  const list = (rows || []).filter((r): r is R => Boolean(r));
  if (!user || !BRANCH_ROLES.includes(user.role || '') || typeof user.outletId !== 'number') return list;
  return list.filter((r) => r.outlet?.id === user.outletId);
}

export interface BranchCell {
  outletId: number;
  /** "Hiện" (true) or "Chưa hiện" (false, also a branch without a row) */
  listed: boolean;
  total: number;
  available: number;
  /** nothing free today at this branch */
  out: boolean;
}

/** #1341: the cells of the "Tất cả chi nhánh" columns for one product. */
export function branchCells(p: ProductLike, columns: BranchColumn[]): BranchCell[] {
  const rows = p.outletStock || [];
  return columns.map((c) => {
    const row = rows.find((r) => r?.outlet?.id === c.id);
    if (!row) return { outletId: c.id, listed: false, total: 0, available: 0, out: true };
    const total = Math.max(0, toNum(row.stock));
    const renting = Math.max(0, toNum(row.renting));
    const available = row.available != null ? Math.max(0, toNum(row.available)) : Math.max(0, total - renting);
    return { outletId: c.id, listed: row.isListed !== false, total, available, out: available <= 0 };
  });
}

export function buildRow(p: ProductLike, scopedOutletId?: number, columns?: BranchColumn[] | null): ProductRow {
  return {
    id: p.id,
    name: (p.name || '').trim(),
    code: (p.barcode || '').trim(),
    category: (p.category?.name || '').trim(),
    image: firstImage(p.images),
    prices: productPrices(p),
    stock: stockView(p, scopedOutletId),
    otherAvailable: otherOutletsAvailable(p),
    branches: columns ? branchCells(p, columns) : null,
  };
}

// ----------------------------------------------------------------------------
// Selection
// ----------------------------------------------------------------------------

export interface Selection {
  ids: number[];
  /** "Chọn cả N sản phẩm": every product matching the filters, across pages. */
  all: boolean;
}

export const EMPTY_SELECTION: Selection = { ids: [], all: false };

export function toggleOne(sel: Selection, id: number, pageIds: number[]): Selection {
  if (sel.all) return { ids: pageIds.filter((x) => x !== id), all: false };
  return sel.ids.includes(id) ? { ids: sel.ids.filter((x) => x !== id), all: false } : { ids: [...sel.ids, id], all: false };
}

/** Header checkbox state for the rows on this page. */
export function pageCheckState(sel: Selection, pageIds: number[]): 'all' | 'some' | 'none' {
  if (pageIds.length === 0) return 'none';
  if (sel.all) return 'all';
  const n = pageIds.filter((id) => sel.ids.includes(id)).length;
  return n === 0 ? 'none' : n === pageIds.length ? 'all' : 'some';
}

/** Header checkbox: select every row on the page, or clear them when all are already selected. */
export function togglePage(sel: Selection, pageIds: number[]): Selection {
  if (pageCheckState(sel, pageIds) === 'all') {
    return sel.all ? EMPTY_SELECTION : { ids: sel.ids.filter((id) => !pageIds.includes(id)), all: false };
  }
  return { ids: Array.from(new Set([...sel.ids, ...pageIds])), all: false };
}

export function selectedCount(sel: Selection, total: number): number {
  return sel.all ? total : sel.ids.length;
}


/**
 * #825: batch delete by OUTLET_ADMIN / kho reports products another branch still holds
 * (`errors[].code = PRODUCT_HELD_BY_OTHER_OUTLETS`, `errors[].outlets`). Parameters for that error's sentence,
 * "Main (3), Kho (0)" with the stock per branch summed over the products; null when there is none.
 */
export function heldElsewhereParams(
  errors: Array<{ code?: string; outlets?: Array<{ id: number; name: string; stock: number }> }> | null | undefined
): { outlets: string } | null {
  const byId = new Map<number, { name: string; stock: number }>();
  for (const e of errors || []) {
    if (e?.code !== 'PRODUCT_HELD_BY_OTHER_OUTLETS') continue;
    for (const o of e.outlets || []) {
      const cur = byId.get(o.id) || { name: o.name, stock: 0 };
      cur.stock += Number(o.stock) || 0;
      byId.set(o.id, cur);
    }
  }
  if (byId.size === 0) return null;
  return { outlets: [...byId.values()].map((o) => `${o.name} (${o.stock})`).join(', ') };
}
