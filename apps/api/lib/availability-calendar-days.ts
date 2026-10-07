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
 * UTC instant bounds for the inclusive VN civil days `fromYmd..toYmd`:
 * `[fromYmd 00:00 VN, day after toYmd 00:00 VN)`, `end` exclusive.
 */
export function getAvailabilityCivilRangeBounds(
  fromYmd: string,
  toYmd: string
): { start: Date; end: Date } | null {
  const first = getAvailabilityCivilDayBounds(fromYmd);
  const last = getAvailabilityCivilDayBounds(toYmd);
  if (!first || !last) return null;
  return { start: first.start, end: last.end };
}

/**
 * Detect UTC-day windows sent by installed apps (#575, #576):
 *   startDate = X T00:00:00[.000]Z, endDate = Y T23:59:59[.mmm]Z, Y >= X
 * - App Store iOS Order Check: one day, `.999`
 * - Android before #413 (main-real): `${P}T00:00:00Z … ${R}T23:59:59Z` (no ms → `.000` once parsed)
 * - admin create order in a UTC browser: `.000`
 * They mean the days X..Y; they are NOT the UTC instants (07:00 VN of X … 06:59 VN of Y+1).
 * A phone or browser on Vietnam time never produces 00:00:00Z as a day start (that is 07:00 VN).
 */
function extractUtcDayWindowKeys(start: Date, end: Date): { fromYmd: string; toYmd: string } | null {
  const startMatch = /^(\d{4}-\d{2}-\d{2})T00:00:00\.000Z$/.exec(start.toISOString());
  const endMatch = /^(\d{4}-\d{2}-\d{2})T23:59:59\.\d{3}Z$/.exec(end.toISOString());
  if (!startMatch || !endMatch) return null;
  if (endMatch[1] < startMatch[1]) return null;
  return { fromYmd: startMatch[1], toYmd: endMatch[1] };
}

export type AvailabilityQueryWindow = {
  /** Window as resolved (echoed in `rentalPeriod`): VN-day bounds for day inputs, else the instants sent. */
  start: Date;
  end: Date;
  /** The VN day when the input named exactly one day (`date=` or a one-day UTC-day window). */
  civilDayYmd: string | null;
  /** Inclusive VN civil days the request covers. */
  fromYmd: string;
  toYmd: string;
  /** `[fromYmd 00:00 VN, toYmd+1 00:00 VN)` — use for the conflict query (pickup < end AND return >= start). */
  bounds: { start: Date; end: Date };
};

/**
 * Resolve the rental window of GET /api/products/[id]/availability and POST /api/products/batch-availability
 * into Vietnam civil days (#590, #578 §A).
 *
 * - `date=D` → D..D
 * - a UTC-day window (installed iOS / Android / admin in UTC, see `extractUtcDayWindowKeys`) → its UTC dates as VN days
 * - any other ISO window (web Tạo đơn `dayRangeIso`, current iOS / Android carts) → VN day of start .. VN day of end;
 *   `start` / `end` are kept as sent for the response echo.
 *
 * Conflicts use `bounds`: an order is on the window iff its VN pickup day ≤ toYmd and its VN return day ≥ fromYmd
 * (`orderOverlapsAvailabilityBounds`), the same day model as Lịch Thuê / `calendarDayAvailability`.
 */
export function resolveAvailabilityQueryWindow(input: {
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): AvailabilityQueryWindow | null {
  if (input.date) {
    const bounds = getAvailabilityCivilDayBounds(input.date);
    if (!bounds) return null;
    return {
      start: bounds.start,
      end: bounds.end,
      civilDayYmd: input.date,
      fromYmd: input.date,
      toYmd: input.date,
      bounds,
    };
  }

  if (!input.startDate || !input.endDate) return null;

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const utcDays = extractUtcDayWindowKeys(start, end);
  if (utcDays) {
    const bounds = getAvailabilityCivilRangeBounds(utcDays.fromYmd, utcDays.toYmd);
    if (!bounds) return null;
    return {
      start: bounds.start,
      end: bounds.end,
      civilDayYmd: utcDays.fromYmd === utcDays.toYmd ? utcDays.fromYmd : null,
      fromYmd: utcDays.fromYmd,
      toYmd: utcDays.toYmd,
      bounds,
    };
  }

  const fromYmd = toAvailabilityCivilDateKey(start);
  const toYmd = toAvailabilityCivilDateKey(end);
  // Keys come from toAvailabilityCivilDateKey, so the bounds always parse
  const bounds = getAvailabilityCivilRangeBounds(fromYmd, toYmd)!;
  return { start, end, civilDayYmd: null, fromYmd, toYmd, bounds };
}

/**
 * Whether an order holds stock on the VN days `bounds` covers (inclusive pickup and return days).
 * - no pickup → never
 * - no planned return → held from its pickup day on
 * Same rule as the SQL filter `pickupPlanAt < bounds.end AND returnPlanAt >= bounds.start`.
 */
export function orderOverlapsAvailabilityBounds(
  order: { pickupPlanAt: Date | null; returnPlanAt: Date | null },
  bounds: { start: Date; end: Date }
): boolean {
  const pickup = order.pickupPlanAt;
  if (!pickup) return false;
  if (pickup.getTime() >= bounds.end.getTime()) return false;
  const ret = order.returnPlanAt;
  if (!ret) return true;
  return ret.getTime() >= bounds.start.getTime();
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
