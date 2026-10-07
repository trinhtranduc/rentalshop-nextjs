/**
 * Comparison helpers for the income API compatibility tests: field paths, the additive-field filter,
 * and the event-by-event mapping of the intended changes (#355 Vietnam days, #484 late fee).
 */
import { EDGE_LATE_FEES, EDGE_ONLY_BEFORE, EDGE_ONLY_NOW, EDGE_ORDERS } from './income-scenarios';

export function paths(value: any, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  const entries = Array.isArray(value) ? value.map((v) => ['[]', v] as const) : Object.entries(value);
  const out = new Set<string>([prefix]);
  for (const [key, child] of entries) {
    for (const p of paths(child, prefix ? `${prefix}.${key}` : String(key))) out.add(p);
  }
  return [...out];
}

/** The response an old app sees: today's response with the added fields removed */
export function withoutAdded(value: any, isAdded: (path: string) => boolean, prefix = ''): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => withoutAdded(v, isAdded, `${prefix}.[]`));
  const out: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!isAdded(path)) out[key] = withoutAdded(child, isAdded, path);
  }
  return out;
}

/** Vietnam civil day of an instant as the routes print it: YYYY/MM/DD */
export function vnDay(instant: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(instant));
  return parts.replace(/-/g, '/');
}

/** Every order line of a response, with the day it is listed under */
export function entriesOf(response: any): any[] {
  return response.body.data.days
    .flatMap((d: any) => d.orders.map((o: any) => ({ day: d.date, dayISO: d.dateISO, ...o })))
    .sort((a: any, b: any) => a.day.localeCompare(b.day) || a.id - b.id || a.revenueType.localeCompare(b.revenueType));
}

const returnedAt = (id: number) => EDGE_ORDERS.find((o) => o.id === id)?.returnedAt ?? null;

/**
 * The old response's order lines as today's code must list them:
 * - #355 (PR #381): each line sits on the Vietnam day of its event, not the UTC day; a line whose event
 *   leaves the 1–7 Oct Vietnam window (EDGE_ONLY_BEFORE) is gone.
 * - #484 (PR #485): the line on the return day counts the late fee (`withLateFee` for revenue listings).
 */
export function oldEntriesMovedToVietnamDays(before: any, withLateFee: boolean): any[] {
  return entriesOf(before)
    .filter((e) => !EDGE_ONLY_BEFORE.includes(e.id))
    .map((e) => {
      const day = vnDay(e.revenueDate);
      const ret = returnedAt(e.id);
      const fee = withLateFee && ret && vnDay(ret) === day ? EDGE_LATE_FEES[e.id] ?? 0 : 0;
      return { ...e, day, dayISO: `${day.replace(/\//g, '-')}T00:00:00.000Z`, revenue: e.revenue + fee };
    })
    .sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id || a.revenueType.localeCompare(b.revenueType));
}

/** Lines of orders that enter the window only with Vietnam days */
export const onlyNow = (response: any) => entriesOf(response).filter((e) => EDGE_ONLY_NOW.includes(e.id));
export const notOnlyNow = (response: any) => entriesOf(response).filter((e) => !EDGE_ONLY_NOW.includes(e.id));
