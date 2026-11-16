/**
 * #1612 AI summary of last week on Tổng quan: what the button and the side panel show, from
 * GET / POST /api/analytics/weekly-summary. Figures come from the API (code); only `content` is AI text.
 */
import { formatDayLabel } from './overview-model';

export type SummaryStatus = 'NONE' | 'READY' | 'NO_ORDERS';

export interface Change {
  current: number;
  previous: number;
  growth: number;
}

export interface WeeklyNumbersLike {
  revenue?: { orderValue?: Change; collected?: Change; outstanding?: number; fees?: number };
  branches?: Array<{ outletId: number; name: string; orderValue: Change; collected?: number; newOrders?: number }>;
  orders?: {
    new?: Change;
    rent?: number;
    sale?: number;
    cancelled?: number;
    byDay?: Array<{ date: string; count: number }>;
  };
  rentals?: { pickedUp?: number; returned?: number; late?: Change; notPickedUp?: number };
  products?: {
    hot?: Array<{ productId: number; name: string; rentals: number; sales?: number; revenue: number }>;
    notRented?: number;
  };
  customers?: { total?: number; new?: number; returning?: number; returningShare?: number };
}

export interface SummaryContentLike {
  summary: string;
  actions: string[];
  revenueNote?: string;
  ordersNote?: string;
  productsNote?: string;
}

export interface WeeklySummaryLike {
  available: boolean;
  week: { start: string; end: string };
  nextWeekStart: string;
  status: SummaryStatus;
  branchName: string | null;
  summary: {
    generatedAt: string;
    language: string | null;
    numbers: WeeklyNumbersLike | null;
    content: SummaryContentLike | null;
  } | null;
}

/** The button shows when the API has an AI key (and the role may read the summary: other roles get 403) */
export function showsSummaryButton(data: WeeklySummaryLike | null | undefined): boolean {
  return !!data?.available;
}

/** Red dot until this week's summary is opened (by anyone on the shop or branch, app or web) */
export function showsNewDot(data: WeeklySummaryLike | null | undefined): boolean {
  return !!data?.available && data.status === 'NONE';
}

export type Tone = 'good' | 'bad';

/** ▲ / ▼ percent vs the week before; none when it did not change. `upIsBad` flips the colour (late returns). */
export function percentBadge(change: Change | undefined, upIsBad = false): { dir: 'up' | 'down'; value: number; tone: Tone } | null {
  if (!change) return null;
  const value = Math.round(change.growth);
  if (!value) return null;
  const up = value > 0;
  return { dir: up ? 'up' : 'down', value: Math.abs(value), tone: up !== upIsBad ? 'good' : 'bad' };
}

/** ▲ / ▼ count difference vs the week before (orders, late returns) */
export function countBadge(change: Change | undefined, upIsBad = false): { text: string; tone: Tone } | null {
  if (!change) return null;
  const diff = change.current - change.previous;
  if (!diff) return null;
  const up = diff > 0;
  return { text: `${up ? '▲' : '▼'} ${Math.abs(diff)}`, tone: up !== upIsBad ? 'good' : 'bad' };
}

export interface DayBar {
  date: string;
  label: string;
  count: number;
  /** percent of the tallest day; a small stub for zero so the day is still visible */
  height: number;
  top: boolean;
}

/** New orders per day, Monday first; `weekdays` is the Sunday-first list of the page (home.weekdays) */
export function dayBars(byDay: Array<{ date: string; count: number }> | undefined, weekdays: string[]): DayBar[] {
  const days = byDay ?? [];
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  return days.map((d) => ({
    date: d.date,
    label: weekdays[new Date(`${d.date}T00:00:00Z`).getUTCDay()] ?? '',
    count: d.count,
    height: max > 0 ? Math.max(6, Math.round((d.count / max) * 100)) : 6,
    top: max > 0 && d.count === max,
  }));
}

/** "T2 09/11 – CN 15/11" */
export function weekLabel(week: { start: string; end: string }, weekdays: string[]): string {
  return `${formatDayLabel(week.start, weekdays)} – ${formatDayLabel(week.end, weekdays)}`;
}
