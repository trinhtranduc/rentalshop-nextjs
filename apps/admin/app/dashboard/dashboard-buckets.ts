/**
 * Admin dashboard windows and chart buckets on Vietnam days (#578 ADM-7).
 * The browser zone does not matter: an instant belongs to the Vietnam hour / day / month that contains it.
 */
import { vnDayBounds, vnDayKeys, vnEndOfMonthKey, vnKeyLabel, vnParts, vnTodayKey } from './vn-day';

export type DashboardPeriod = 'today' | 'month' | 'year';

export interface DashboardWindow {
  period: DashboardPeriod;
  startKey: string;
  endKey: string;
  /** 00:00 Vietnam time of `startKey` */
  start: Date;
  /** 23:59:59.999 Vietnam time of `endKey` */
  end: Date;
  groupBy: 'day' | 'month';
}

/** Vietnam days of the selected period: today, this month, or this year. */
export function getDashboardWindow(period: DashboardPeriod, now: Date = new Date()): DashboardWindow {
  const today = vnTodayKey(now);
  let startKey: string;
  let endKey: string;
  if (period === 'today') {
    startKey = today;
    endKey = today;
  } else if (period === 'year') {
    startKey = `${today.slice(0, 4)}-01-01`;
    endKey = `${today.slice(0, 4)}-12-31`;
  } else {
    startKey = `${today.slice(0, 7)}-01`;
    endKey = vnEndOfMonthKey(today);
  }
  const { start, end } = vnDayBounds(startKey, endKey);
  return { period, startKey, endKey, start, end, groupBy: period === 'year' ? 'month' : 'day' };
}

function toInstant(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when the instant is inside the window (Vietnam day bounds, inclusive). */
export function inDashboardWindow(value: string | Date | null | undefined, window: DashboardWindow): boolean {
  const instant = toInstant(value);
  return !!instant && instant >= window.start && instant <= window.end;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Vietnam hour (`00`..`23`), day (`YYYY-MM-DD`) or month (`YYYY-MM`) of an instant. */
function bucketKey(instant: Date, unit: 'hour' | 'day' | 'month'): string {
  const p = vnParts(instant);
  if (unit === 'hour') return pad2(p.hour);
  const month = `${p.year}-${pad2(p.month)}`;
  return unit === 'month' ? month : `${month}-${pad2(p.day)}`;
}

/** Every bucket of the window, in order, with its chart label. */
function windowBuckets(window: DashboardWindow): Array<{ key: string; label: string }> {
  if (window.period === 'today') {
    return Array.from({ length: 24 }, (_, hour) => ({ key: pad2(hour), label: pad2(hour) }));
  }
  if (window.period === 'year') {
    const year = window.startKey.slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${pad2(i + 1)}`;
      return { key, label: vnKeyLabel(key) };
    });
  }
  return vnDayKeys(window.startKey, window.endKey).map((key) => ({ key, label: vnKeyLabel(key) }));
}

/**
 * Sum `getValue` per Vietnam hour (today), day (month) or month (year) for the items inside the window.
 * Every bucket is returned, empty ones with 0.
 */
export function bucketByShopPeriod<T>(
  items: T[],
  window: DashboardWindow,
  getInstant: (item: T) => string | Date | null | undefined,
  getValue: (item: T) => number
): Array<{ period: string; actual: number }> {
  const unit = window.period === 'today' ? 'hour' : window.period === 'year' ? 'month' : 'day';
  const totals = new Map<string, number>();
  for (const item of items) {
    const instant = toInstant(getInstant(item));
    if (!instant || instant < window.start || instant > window.end) continue;
    const key = bucketKey(instant, unit);
    totals.set(key, (totals.get(key) || 0) + (getValue(item) || 0));
  }
  return windowBuckets(window).map(({ key, label }) => ({ period: label, actual: totals.get(key) || 0 }));
}

/**
 * Count items per Vietnam day (or month for the year view) inside the window; only periods with items,
 * sorted chronologically and labelled by that same Vietnam day / month.
 */
export function groupCountsByShopPeriod<T>(
  items: T[],
  window: DashboardWindow,
  getInstant: (item: T) => string | Date | null | undefined
): Array<{ period: string; actual: number; projected: number }> {
  const unit = window.groupBy === 'month' ? 'month' : 'day';
  const counts = new Map<string, number>();
  for (const item of items) {
    const instant = toInstant(getInstant(item));
    if (!instant || instant < window.start || instant > window.end) continue;
    const key = bucketKey(instant, unit);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, actual]) => ({ period: vnKeyLabel(key, false), actual, projected: 0 }));
}
