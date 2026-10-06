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
