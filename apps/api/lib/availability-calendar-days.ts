/**
 * Shop civil-day occupancy helpers for Order Check calendar.
 * Matches Lịch Thuê day model (`getLocalDateKey` / Asia/Ho_Chi_Minh UTC+7).
 * Kept free of @rentalshop/utils barrel imports so unit tests stay lightweight.
 */

export const AVAILABILITY_CALENDAR_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** VN civil YYYY-MM-DD from a UTC instant (same as getLocalDateKey). */
export function toAvailabilityCivilDateKey(date: Date): string {
  const local = new Date(date.getTime() + VN_OFFSET_MS);
  return formatYmd(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
}

/** Iterate inclusive civil YYYY-MM-DD keys (timezone-agnostic date arithmetic). */
function iterateYmdKeys(fromYmd: string, toYmd: string): string[] {
  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (!from || !to) return [];

  const keys: string[] = [];
  let cursor = Date.UTC(from.y, from.m - 1, from.d);
  const end = Date.UTC(to.y, to.m - 1, to.d);
  if (end < cursor) return [];

  while (cursor <= end) {
    const dt = new Date(cursor);
    keys.push(formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
    cursor += 86_400_000;
  }
  return keys;
}

/**
 * UTC instant bounds for a VN civil day `ymd`.
 * Same encoding as Lịch Thuê: local midnight VN = previous day 17:00 UTC.
 * `end` is exclusive (next VN midnight).
 *
 * @example
 * getAvailabilityCivilDayBounds('2026-08-31')
 * // { start: 2026-08-30T17:00:00.000Z, end: 2026-08-31T17:00:00.000Z }
 */
export function getAvailabilityCivilDayBounds(
  ymd: string,
  _timeZone: string = AVAILABILITY_CALENDAR_TIMEZONE
): { start: Date; end: Date } | null {
  const parts = parseYmd(ymd);
  if (!parts) return null;

  const start = new Date(Date.UTC(parts.y, parts.m - 1, parts.d) - VN_OFFSET_MS);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/**
 * Remaining units per shop civil day in [fromYmd, toYmd].
 * Day keys match Lịch Thuê (`getLocalDateKey`), not UTC dates.
 *
 * Occupancy is **inclusive** of pickup and return civil days — same as mobile
 * `calculateRentalDays` (same-day pickup=return stores one instant and must
 * still book that day; interval overlap `return > dayStart` would miss it).
 */
export function calendarDayAvailability(input: {
  stock: number;
  orders: Array<{ pickupPlanAt: Date | null; returnPlanAt: Date | null; quantity?: number }>;
  fromYmd: string;
  toYmd: string;
  timeZone?: string;
}): Array<{ date: string; available: number; booked: number }> {
  const ymdKeys = iterateYmdKeys(input.fromYmd, input.toYmd);
  if (ymdKeys.length === 0) return [];

  const stock = Math.max(0, input.stock);
  const bookedByDay = new Map<string, number>();
  const windowSet = new Set(ymdKeys);

  for (const order of input.orders) {
    const pickup = order.pickupPlanAt;
    const ret = order.returnPlanAt;
    if (!pickup || !ret) continue;

    const qty = Math.max(0, order.quantity ?? 1);
    if (qty === 0) continue;

    let startKey = toAvailabilityCivilDateKey(pickup);
    let endKey = toAvailabilityCivilDateKey(ret);
    // Guard inverted ranges (should not happen for valid orders)
    if (endKey < startKey) {
      const swap = startKey;
      startKey = endKey;
      endKey = swap;
    }

    for (const ymd of iterateYmdKeys(startKey, endKey)) {
      if (!windowSet.has(ymd)) continue;
      bookedByDay.set(ymd, (bookedByDay.get(ymd) ?? 0) + qty);
    }
  }

  return ymdKeys.map((date) => {
    const booked = bookedByDay.get(date) ?? 0;
    return {
      date,
      booked,
      available: Math.max(0, stock - booked),
    };
  });
}

export function occupiedDateKeysForRange(
  orders: Array<{ pickupPlanAt: Date | null; returnPlanAt: Date | null; quantity?: number }>,
  fromYmd: string,
  toYmd: string
): string[] {
  return calendarDayAvailability({ stock: 1, orders, fromYmd, toYmd })
    .filter((day) => day.booked > 0)
    .map((day) => day.date);
}
