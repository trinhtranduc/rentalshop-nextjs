/**
 * #1641 Orders: Bảng | Lịch switch and the export that only shows once orders are picked.
 * Pure URL and selection rules; no dates, but run under TZ=UTC and TZ=Asia/Ho_Chi_Minh like the other web models.
 */
import { describe, expect, it } from '@jest/globals';
import {
  EXPORT_MAX_ROWS,
  calendarRedirectQuery,
  exportScope,
  filterExportMatchesList,
  offersSelectAllFiltered,
  parseOrdersView,
  singleBranch,
  switchViewQuery,
} from '../apps/client/app/orders/orders-view-model';

const q = (s: string) => new URLSearchParams(s);

describe('view in the URL', () => {
  it('opens the table unless the URL says calendar', () => {
    expect(parseOrdersView(null)).toBe('table');
    expect(parseOrdersView(undefined)).toBe('table');
    expect(parseOrdersView('')).toBe('table');
    expect(parseOrdersView('table')).toBe('table');
    expect(parseOrdersView('gantt')).toBe('table');
    expect(parseOrdersView('calendar')).toBe('calendar');
  });

  it('knows the one branch a selection stands for', () => {
    expect(singleBranch(q('outlet=7'))).toBe('7');
    expect(singleBranch(q('outlets=7'))).toBe('7');
    expect(singleBranch(q('outlets=7,8'))).toBeNull();
    expect(singleBranch(q(''))).toBeNull();
    expect(singleBranch(q('outlet=abc'))).toBeNull();
    expect(singleBranch(q('outlet=0'))).toBeNull();
    expect(singleBranch(q('outlet=7&outlets=8,9'))).toBe('7');
  });
});

describe('switching view', () => {
  it('table to calendar: only the branch travels, filters stay behind', () => {
    expect(switchViewQuery('calendar', q('tab=all&status=RESERVED&outlets=7&page=3'))).toBe('view=calendar&outlet=7');
  });

  it('two or more branches become "all" in the calendar', () => {
    expect(switchViewQuery('calendar', q('outlets=7,8'))).toBe('view=calendar');
    expect(switchViewQuery('calendar', q(''))).toBe('view=calendar');
  });

  it('calendar to table: the branch goes back as outlets, month and day are dropped', () => {
    expect(switchViewQuery('table', q('view=calendar&outlet=7&month=11&year=2026&day=2026-11-24'))).toBe('outlets=7');
    expect(switchViewQuery('table', q('view=calendar'))).toBe('');
  });

  it('the old /calendar link keeps month, year, day and branch', () => {
    expect(calendarRedirectQuery(q('month=11&year=2026&day=2026-11-24&outlet=7&from=2026-11-01'))).toBe('view=calendar&month=11&year=2026&day=2026-11-24&outlet=7');
    expect(calendarRedirectQuery(q(''))).toBe('view=calendar');
  });
});

describe('export only once orders are picked', () => {
  it('nothing picked: no export button', () => {
    expect(exportScope(0, false, 60)).toEqual({ kind: 'none' });
  });

  it('some rows picked: export those, count = picked', () => {
    expect(exportScope(3, false, 60)).toEqual({ kind: 'picked', count: 3 });
  });

  it('whole filter chosen: export follows the filter, count = the list total', () => {
    expect(exportScope(3, true, 60)).toEqual({ kind: 'filtered', count: 60 });
    expect(exportScope(0, true, 60)).toEqual({ kind: 'filtered', count: 60 });
  });

  it('an empty list never counts as "whole filter"', () => {
    expect(exportScope(0, true, 0)).toEqual({ kind: 'none' });
  });

  it('offers "Chọn cả N đơn" only while some, not all, are picked and the export would match the list', () => {
    expect(offersSelectAllFiltered(3, false, 60, true)).toBe(true);
    expect(offersSelectAllFiltered(0, false, 60, true)).toBe(false);
    expect(offersSelectAllFiltered(60, false, 60, true)).toBe(false);
    expect(offersSelectAllFiltered(3, true, 60, true)).toBe(false);
    expect(offersSelectAllFiltered(3, false, 60, false)).toBe(false);
  });

  it('the filter export matches the list only with a date range that is not in the future, no search, and within the row limit', () => {
    const base = { rangeEnd: '2026-11-24', todayKey: '2026-11-24', hasSearch: false, filteredTotal: 60 };
    expect(filterExportMatchesList(base)).toBe(true);
    expect(filterExportMatchesList({ ...base, rangeEnd: null })).toBe(false);
    expect(filterExportMatchesList({ ...base, rangeEnd: '2026-11-30' })).toBe(false);
    expect(filterExportMatchesList({ ...base, rangeEnd: '2026-11-01' })).toBe(true);
    expect(filterExportMatchesList({ ...base, hasSearch: true })).toBe(false);
    expect(filterExportMatchesList({ ...base, filteredTotal: EXPORT_MAX_ROWS })).toBe(true);
    expect(filterExportMatchesList({ ...base, filteredTotal: EXPORT_MAX_ROWS + 1 })).toBe(false);
  });
});
