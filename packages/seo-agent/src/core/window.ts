import type { TeamBucket, TeamMonths, TeamWindow } from "./types";

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function parseMonths(value: unknown): TeamMonths {
  const n = Number(value);
  return n === 3 || n === 6 ? n : 1;
}

/** From the same day N calendar months ago (clamped to that month's length, UTC midnight) to now. */
export function teamWindow(months: TeamMonths, now: Date = new Date()): TeamWindow {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() - months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { months, from: new Date(Date.UTC(y, m, Math.min(now.getUTCDate(), lastDay))), to: now };
}

/** Oldest first. One month: 7-day blocks counted back from `to`. Longer: calendar months, the first possibly partial. */
export function bucketsFor(window: TeamWindow): TeamBucket[] {
  const { from, to } = window;
  const out: TeamBucket[] = [];
  if (window.months === 1) {
    for (let end = to.getTime(); end > from.getTime(); end -= 7 * DAY) {
      const start = new Date(Math.max(from.getTime(), end - 7 * DAY));
      out.unshift({ label: `${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)}`, from: start, to: new Date(end) });
    }
    return out;
  }
  for (let y = from.getUTCFullYear(), m = from.getUTCMonth(); Date.UTC(y, m, 1) <= to.getTime(); m += 1) {
    const start = new Date(Math.max(from.getTime(), Date.UTC(y, m, 1)));
    const end = new Date(Math.min(to.getTime(), Date.UTC(y, m + 1, 1)));
    const first = new Date(Date.UTC(y, m, 1));
    out.push({ label: `${pad(first.getUTCMonth() + 1)}/${first.getUTCFullYear()}`, from: start, to: end });
  }
  return out;
}

/** Events per bucket. A bucket holds `from <= date < to`; the last one also holds `to`. Dates outside every bucket are dropped. */
export function countByBucket(dates: Date[], buckets: TeamBucket[]): number[] {
  const counts = buckets.map(() => 0);
  const last = buckets.length - 1;
  for (const d of dates) {
    const t = d.getTime();
    const i = buckets.findIndex((b, k) => t >= b.from.getTime() && (t < b.to.getTime() || (k === last && t === b.to.getTime())));
    if (i >= 0) counts[i] += 1;
  }
  return counts;
}
