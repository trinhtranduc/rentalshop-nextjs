/**
 * Danh mục (#543): pure helpers for the shop-web categories page. No `@rentalshop/*` imports so
 * `tests/web-categories-model.test.ts` can run them under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */

export const CATEGORY_PAGE_SIZES = [10, 20, 50, 100] as const;
export const CATEGORY_DEFAULT_PAGE_SIZE = 20;
export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 50;
export const CATEGORY_DESCRIPTION_MAX = 200;

export type CategorySortBy = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface CategoryParams {
  q: string;
  page: number;
  limit: number;
  sortBy: CategorySortBy;
  sortOrder: SortOrder;
}

type ParamReader = { get(name: string): string | null };

/** URL → list params. Unknown or broken values fall back to the defaults (name ↑, page 1, 20 rows). */
export function parseCategoryParams(params: ParamReader): CategoryParams {
  const page = Math.floor(Number(params.get('page')));
  const limit = Number(params.get('limit'));
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  return {
    q: (params.get('q') || '').trim(),
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: (CATEGORY_PAGE_SIZES as readonly number[]).includes(limit) ? limit : CATEGORY_DEFAULT_PAGE_SIZE,
    sortBy: sortBy === 'createdAt' ? 'createdAt' : 'name',
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
  };
}

/** Clicking a column: same column flips the order, a new column starts ascending (as the old table). */
export function nextSort(current: { sortBy: CategorySortBy; sortOrder: SortOrder }, column: CategorySortBy) {
  return {
    sortBy: column,
    sortOrder: current.sortBy === column && current.sortOrder === 'asc' ? ('desc' as const) : ('asc' as const),
  };
}

export type CategoryFieldError = 'nameRequired' | 'nameMinLength' | 'nameMaxLength' | 'descriptionMaxLength';

/** Same rules as the shared CategoryFormContent; keys are `categories.validation.*`. */
export function validateCategory(form: { name: string; description: string }): {
  name?: CategoryFieldError;
  description?: CategoryFieldError;
} {
  const errors: { name?: CategoryFieldError; description?: CategoryFieldError } = {};
  const name = form.name.trim();
  if (!name) errors.name = 'nameRequired';
  else if (name.length < CATEGORY_NAME_MIN) errors.name = 'nameMinLength';
  else if (name.length > CATEGORY_NAME_MAX) errors.name = 'nameMaxLength';
  if (form.description.trim().length > CATEGORY_DESCRIPTION_MAX) errors.description = 'descriptionMaxLength';
  return errors;
}

/** Payload for create / update: trimmed, empty description sent as '' (as the old form did). */
export function categoryPayload(form: { name: string; description: string }) {
  return { name: form.name.trim(), description: form.description.trim() };
}

/** "06/10/2026 21:14" in the shop's time zone (Vietnam), whatever the browser's zone. */
export function formatCreatedAt(value: string | Date | null | undefined, timeZone = 'Asia/Ho_Chi_Minh'): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/**
 * GET /api/categories only honours `limit` today: its query schema drops `q`, `page`, `sortBy` and
 * `sortOrder`, so the old page's search, sort and paging never changed the rows. The page asks for
 * one large page and searches, sorts and pages here instead (no API change).
 */
export const CATEGORY_FETCH_LIMIT = 1000;

/** Lower case, accents removed, đ → d: "Áo Dài" and "ao dai" compare equal. */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Every word of the query must start a word of the name (accent-insensitive). */
export function matchesCategory(name: string, query: string): boolean {
  const terms = foldText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const words = foldText(name).split(/[^a-z0-9]+/).filter(Boolean);
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}

export interface CategoryLike {
  id: number;
  name: string;
  createdAt?: string | Date | null;
}

export interface CategoryPage<R> {
  rows: R[];
  total: number;
  totalPages: number;
  page: number;
}

/** Search, sort and slice one page. A page past the end shows the last page. */
export function pageCategories<R extends CategoryLike>(all: R[], params: CategoryParams): CategoryPage<R> {
  const found = all.filter((c) => matchesCategory(c.name || '', params.q));
  const dir = params.sortOrder === 'desc' ? -1 : 1;
  const time = (c: R) => {
    const t = c.createdAt ? new Date(c.createdAt).getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
  };
  const sorted = [...found].sort((a, b) => {
    const diff =
      params.sortBy === 'createdAt'
        ? time(a) - time(b)
        : (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' });
    return (diff || a.id - b.id) * dir;
  });
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.limit;
  return { rows: sorted.slice(start, start + params.limit), total, totalPages, page };
}

export type CategoryAction = 'view' | 'edit' | 'delete';

/** Row actions: managers edit and delete (never the default category); others only view. */
export function rowActions(category: { isDefault?: boolean | null }, canManage: boolean): CategoryAction[] {
  if (!canManage) return ['view'];
  return category.isDefault ? ['view', 'edit'] : ['view', 'edit', 'delete'];
}
