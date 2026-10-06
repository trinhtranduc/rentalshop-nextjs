/**
 * Tạo đơn (#556): one range calendar for the rental days, like the old create form's date range picker
 * (click the pickup day, then the return day; the range is highlighted). Works on Vietnam civil day keys
 * (YYYY-MM-DD) only, so the browser's time zone never moves a day. Pure, no @rentalshop/* imports.
 */

const KEY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-08" → "2026-10" */
export const monthOf = (key: string): string => key.slice(0, 7);

/** "2026-12" + 1 → "2027-01" */
export function shiftMonth(month: string, by: number): string {
  if (!MONTH.test(month)) return month;
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + by;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Day keys of a month in Monday-first weeks; null pads the first and last week. */
export function monthCells(month: string): Array<string | null> {
  if (!MONTH.test(month)) return [];
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7; // Monday-first
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export interface DayRangePick {
  from: string;
  to: string;
}

/**
 * A click on a day: the first click (or a click after a full range) starts a new range; the second ends it.
 * A second click before the start swaps them; the same day twice is a same-day rental (one day).
 */
export function pickDay(range: DayRangePick, key: string): DayRangePick {
  if (!KEY.test(key)) return range;
  if (!range.from || range.to) return { from: key, to: '' };
  return key < range.from ? { from: key, to: range.from } : { from: range.from, to: key };
}

export type DayMark = 'start' | 'end' | 'single' | 'inside' | null;

/** How a day reads in the range; `hover` previews the end while the return day is not picked yet. */
export function dayMark(range: DayRangePick, key: string, hover?: string | null): DayMark {
  const from = range.from;
  if (!from) return null;
  let to = range.to;
  if (!to && hover && KEY.test(hover)) to = hover;
  if (!to) return key === from ? 'single' : null;
  const [a, b] = to < from ? [to, from] : [from, to];
  if (a === b) return key === a ? 'single' : null;
  if (key === a) return 'start';
  if (key === b) return 'end';
  return key > a && key < b ? 'inside' : null;
}
