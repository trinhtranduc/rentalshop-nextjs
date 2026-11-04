/**
 * #1482 model of the admin Dashboard block "Doanh thu gói dịch vụ": month picker (URL `?month=`), the comparison rule,
 * money formats, bar heights and the CSV. Pure functions, no browser clock: "today" is the Vietnam day the API returns
 * (`todayKey`), see `timezone-dates`.
 */

export type RevenueSelection = { mode: 'month'; month: string } | { mode: 'year'; year: number };

export const FIRST_REVENUE_MONTH = '2020-01';

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR_RE = /^\d{4}$/;
const pad2 = (n: number) => String(n).padStart(2, '0');

const currentMonthOf = (todayKey: string) => todayKey.slice(0, 7);
const yearOf = (todayKey: string) => Number(todayKey.slice(0, 4));

/** `?month=2026-11` → that month, `?month=2026` → the whole year; missing, invalid, future or before 2020 → this month. */
export function parseRevenueParam(value: string | null | undefined, todayKey: string): RevenueSelection {
  const current: RevenueSelection = { mode: 'month', month: currentMonthOf(todayKey) };
  if (!value) return current;
  if (MONTH_RE.test(value)) {
    return value >= FIRST_REVENUE_MONTH && value <= currentMonthOf(todayKey) ? { mode: 'month', month: value } : current;
  }
  if (YEAR_RE.test(value)) {
    const year = Number(value);
    return year >= Number(FIRST_REVENUE_MONTH.slice(0, 4)) && year <= yearOf(todayKey) ? { mode: 'year', year } : current;
  }
  return current;
}

/** The value of `?month=` for a selection. */
export const revenueParam = (selection: RevenueSelection): string =>
  selection.mode === 'year' ? String(selection.year) : selection.month;

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** Whether ‹ (-1) or › (+1) can move: not in the year view, not before 2020-01, not past the current month. */
export function canShift(selection: RevenueSelection, delta: -1 | 1, todayKey: string): boolean {
  if (selection.mode === 'year') return false;
  const next = addMonths(selection.month, delta);
  return next >= FIRST_REVENUE_MONTH && next <= currentMonthOf(todayKey);
}

export function shiftMonth(selection: RevenueSelection, delta: -1 | 1, todayKey: string): RevenueSelection {
  if (!canShift(selection, delta, todayKey) || selection.mode === 'year') return selection;
  return { mode: 'month', month: addMonths(selection.month, delta) };
}

/** "Cả năm": the shown month becomes its year; pressed again it goes back to the current month. */
export function toggleYear(selection: RevenueSelection, todayKey: string): RevenueSelection {
  if (selection.mode === 'year') return { mode: 'month', month: currentMonthOf(todayKey) };
  return { mode: 'year', year: Number(selection.month.slice(0, 4)) };
}

export interface DayPoint {
  date: string;
  total: number;
  count: number;
}

export type Comparison =
  | { kind: 'year'; year: number; throughMonth: number }
  | { kind: 'empty'; scope: 'same-days' | 'whole-month'; previousMonth: string; throughDay: number | null }
  | {
      kind: 'change';
      percent: number;
      scope: 'same-days' | 'whole-month';
      previousMonth: string;
      throughDay: number | null;
      previousTotal: number;
    };

/**
 * The current month is compared with the same days of the previous month (days 1..today); a completed month with the
 * whole previous month. The year view has no comparison.
 */
export function compareWithPrevious(input: {
  selection: RevenueSelection;
  todayKey: string;
  daily: DayPoint[];
  previous: { month: string; daily: DayPoint[] } | null;
}): Comparison {
  const { selection, todayKey, daily, previous } = input;
  if (selection.mode === 'year') {
    const thisYear = yearOf(todayKey);
    return { kind: 'year', year: selection.year, throughMonth: selection.year === thisYear ? Number(todayKey.slice(5, 7)) : 12 };
  }
  const isCurrent = selection.month === currentMonthOf(todayKey);
  const throughDay = isCurrent ? Number(todayKey.slice(8, 10)) : null;
  const scope = isCurrent ? 'same-days' : 'whole-month';
  const previousMonth = previous?.month ?? addMonths(selection.month, -1);
  const previousTotal = (previous?.daily ?? [])
    .filter((d) => throughDay === null || Number(d.date.slice(8, 10)) <= throughDay)
    .reduce((s, d) => s + d.total, 0);
  if (previousTotal === 0) return { kind: 'empty', scope, previousMonth, throughDay };
  const total = daily.reduce((s, d) => s + d.total, 0);
  return { kind: 'change', percent: Math.round((total / previousTotal - 1) * 100), scope, previousMonth, throughDay, previousTotal };
}

const numberLocale = (locale: string) => (locale === 'vi' ? 'vi-VN' : locale);

/** `1.234.567 ₫` (vi) / `1,234,567 ₫` (others). Never a `$` prefix. */
export function formatVnd(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 0 }).format(Math.round(amount))} ₫`;
}

/** `USD 11,00`: the currency code and two decimals; nothing is converted. */
export function formatOther(currency: string, amount: number, locale: string): string {
  const n = new Intl.NumberFormat(numberLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${currency} ${n}`;
}

/** Axis labels: `250k`, `1,5 tr` (vi) / `1.5M` (others). */
export function shortMoney(amount: number, locale: string): string {
  const vi = locale === 'vi';
  const decimal = (n: number, digits: number) => n.toFixed(digits).replace('.', vi ? ',' : '.');
  if (amount >= 1e6) return `${decimal(amount / 1e6, amount >= 1e7 ? 0 : 1)}${vi ? ' tr' : 'M'}`;
  if (amount >= 1e3) return `${Math.round(amount / 1e3)}k`;
  return String(amount);
}

/** `33,3%`, or `—` when there is nothing to share. */
export function channelShare(part: number, whole: number, locale: string): string {
  if (!whole) return '—';
  const n = (Math.round((part / whole) * 1000) / 10).toFixed(1);
  return `${locale === 'vi' ? n.replace('.', ',') : n}%`;
}

/** Top of the chart axis: 1, 2, 5 or 10 × a power of ten; one million when nothing was received. */
export function niceMax(max: number): number {
  if (max <= 0) return 1_000_000;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Bar heights in percent of the axis; a day with money is never thinner than 1.5%. */
export const barHeights = (values: number[], top: number): number[] =>
  values.map((v) => (top ? Math.max(v > 0 ? 1.5 : 0, (v / top) * 100) : 0));

export interface RevenueMonth {
  month: string;
  total: number;
  count: number;
  newCount: number;
  renewalCount: number;
  refundTotal: number;
  refundCount: number;
}

const csvCell = (value: string | number) => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of the 12 months plus a year line (raw numbers, no thousand separators). */
export function revenueCsv(input: { months: RevenueMonth[]; headers: string[]; totalLabel: string }): string {
  const { months, headers, totalLabel } = input;
  const line = (cells: (string | number)[]) => cells.map(csvCell).join(',');
  const sum = (pick: (m: RevenueMonth) => number) => months.reduce((s, m) => s + pick(m), 0);
  return [
    line(headers),
    ...months.map((m) => line([m.month, m.total, m.count, m.newCount, m.renewalCount, m.refundTotal, m.refundCount])),
    line([totalLabel, sum((m) => m.total), sum((m) => m.count), sum((m) => m.newCount), sum((m) => m.renewalCount), sum((m) => m.refundTotal), sum((m) => m.refundCount)]),
  ].join('\n');
}
