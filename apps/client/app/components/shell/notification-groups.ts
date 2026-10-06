/**
 * Groups inbox notifications by Vietnam civil day (#509, skill timezone-dates).
 * `toDayKey` is `getLocalDateKey` from @rentalshop/utils (injected so this stays import-free
 * for unit tests); never the browser's local date.
 */

export type DayLabel = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'date'; text: string };

export interface DayGroup<T> {
  dateKey: string;
  label: DayLabel;
  items: T[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `2026-10-04` → `04/10` without going through a Date. */
export function dayMonthFromKey(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

export function groupByShopDay<T extends { createdAt: string }>(
  items: T[],
  now: Date,
  toDayKey: (instant: Date | string) => string
): DayGroup<T>[] {
  const today = toDayKey(now);
  const yesterday = toDayKey(new Date(now.getTime() - DAY_MS));
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const key = toDayKey(item.createdAt);
    if (!key) continue;
    let group = groups.find((g) => g.dateKey === key);
    if (!group) {
      const label: DayLabel =
        key === today ? { kind: 'today' } : key === yesterday ? { kind: 'yesterday' } : { kind: 'date', text: dayMonthFromKey(key) };
      group = { dateKey: key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
}

// ----------------------------------------------------------------------------
// #528: row look and link, day headings with the weekday
// ----------------------------------------------------------------------------

/** Board icon families: new order, handed over, brought back, finished, cancelled, anything else. */
export type NotificationKind = 'order' | 'handover' | 'back' | 'done' | 'cancelled' | 'other';

export interface NotificationLike {
  type?: string | null;
  data?: unknown;
}

function dataField(data: unknown, key: string): string {
  if (!data || typeof data !== 'object') return '';
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

/** Kind from the inbox row written by apps/api/lib/push-notifications.ts (type + data.status). */
export function notificationKind(n: NotificationLike): NotificationKind {
  const type = String(n.type || '').toUpperCase();
  if (type === 'ORDER_CREATED') return 'order';
  if (type === 'ORDER_STATUS_CHANGED') {
    switch (dataField(n.data, 'status').toUpperCase()) {
      case 'PICKUPED':
        return 'handover';
      case 'RETURNED':
        return 'back';
      case 'COMPLETED':
        return 'done';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'order';
    }
  }
  return 'other';
}

/**
 * Order detail link: `/orders/<orderNumber>` (the detail route reads the order number).
 * Null when the row names no order.
 */
export function notificationHref(n: NotificationLike): string | null {
  const number = dataField(n.data, 'orderNumber').replace(/^#/, '');
  if (!number || !/^[A-Za-z0-9-]+$/.test(number)) return null;
  return `/orders/${encodeURIComponent(number)}`;
}

/** 0 = Sunday … 6 = Saturday for a `YYYY-MM-DD` key, independent of the machine time zone. */
export function weekdayOfKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return -1;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** `T3 06/10` with `weekdays` = short names from Sunday (e.g. CN,T2,…,T7). */
export function shortDayLabel(dateKey: string, weekdays: string[]): string {
  const w = weekdayOfKey(dateKey);
  if (w < 0) return '';
  const name = w >= 0 ? weekdays[w] || '' : '';
  return name ? `${name} ${dayMonthFromKey(dateKey)}` : dayMonthFromKey(dateKey);
}
