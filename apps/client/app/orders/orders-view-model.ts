/**
 * #1641 Orders has two views: Bảng (default) and Lịch (`?view=calendar`, the old "Lịch giao trả"). Pure helpers so the
 * URL rules are unit-tested. The table keeps `outlets=1,2` (several branches); the calendar keeps one `outlet=1`.
 */
export type OrdersView = 'table' | 'calendar';

export const parseOrdersView = (raw: string | null | undefined): OrdersView => (raw === 'calendar' ? 'calendar' : 'table');

const ID = /^[1-9]\d*$/;

/** The one branch a selection stands for: `outlet=5`, or `outlets=5`; two or more branches mean "all" (null). */
export function singleBranch(params: Pick<URLSearchParams, 'get'>): string | null {
  const one = params.get('outlet');
  if (one && ID.test(one)) return one;
  const many = (params.get('outlets') ?? '').split(',').filter(Boolean);
  return many.length === 1 && ID.test(many[0]) ? many[0] : null;
}

/** Query string (no "?") after switching to `next`. Only the branch travels; filters and month belong to one view. */
export function switchViewQuery(next: OrdersView, current: Pick<URLSearchParams, 'get'>): string {
  const params = new URLSearchParams();
  const branch = singleBranch(current);
  if (next === 'calendar') {
    params.set('view', 'calendar');
    if (branch) params.set('outlet', branch);
  } else if (branch) {
    params.set('outlets', branch);
  }
  return params.toString();
}

/** `/calendar?...` sent on to Orders: month, year, day and branch are kept, the rest dropped. */
export function calendarRedirectQuery(current: Pick<URLSearchParams, 'get'>): string {
  const params = new URLSearchParams();
  params.set('view', 'calendar');
  for (const key of ['month', 'year', 'day', 'outlet']) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** What the export acts on: picked rows, every row of the filter, or nothing (then the button is not shown). */
export type ExportScope = { kind: 'none' } | { kind: 'picked'; count: number } | { kind: 'filtered'; count: number };

export function exportScope(pickedCount: number, allFiltered: boolean, filteredTotal: number): ExportScope {
  if (allFiltered && filteredTotal > 0) return { kind: 'filtered', count: filteredTotal };
  if (pickedCount > 0) return { kind: 'picked', count: pickedCount };
  return { kind: 'none' };
}

/** The export route reads the same filters as the list except the search box, takes a date range (default: last year, end not in the future) and stops at this many rows. */
export const EXPORT_MAX_ROWS = 10000;

/**
 * Every row of the list is what the export would write: a date range is set that does not end after today (the route
 * refuses a future end date), no search text, and not above the row limit. Day keys are `YYYY-MM-DD` (Vietnam day).
 */
export const filterExportMatchesList = (input: { rangeEnd: string | null; todayKey: string; hasSearch: boolean; filteredTotal: number }): boolean =>
  !!input.rangeEnd && input.rangeEnd <= input.todayKey && !input.hasSearch && input.filteredTotal <= EXPORT_MAX_ROWS;

/** "Chọn cả N đơn theo bộ lọc" is offered while some, but not all, rows of the filter are picked and the export would match the list. */
export const offersSelectAllFiltered = (pickedCount: number, allFiltered: boolean, filteredTotal: number, exportMatchesList: boolean): boolean =>
  exportMatchesList && pickedCount > 0 && !allFiltered && filteredTotal > pickedCount;
