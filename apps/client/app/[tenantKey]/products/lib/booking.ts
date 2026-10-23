/**
 * #1124 — pure helpers for "Đặt thuê" on the public shop page: the month calendar, the date range, the request
 * kept in the browser, the form and the tracking page. Days are Vietnam civil day keys (`YYYY-MM-DD`); calendar
 * maths runs on the key itself (UTC dates built from the key), never on the machine's local day.
 */
import { intlLocale } from '../../../../lib/public-content/shop-locale';

export type DayStatus = 'free' | 'full';
export interface PublicDay {
  date: string;
  status: DayStatus;
}
export type CalendarState = 'free' | 'full' | 'past' | 'unknown';
export interface CalendarDay {
  date: string;
  day: number;
  state: CalendarState;
  today: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyToUtc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const utcToKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const DAY_MS = 86400000;

export function addDays(key: string, n: number): string {
  return utcToKey(keyToUtc(key) + n * DAY_MS);
}

/** `YYYY-MM` of a day key, and the next / previous month */
export const monthOf = (key: string) => key.slice(0, 7);
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

/** Monday-first month grid: blanks before day 1, then each day with its state */
export function calendarMonth(month: string, days: PublicDay[], todayKey: string): { leadingBlanks: number; days: CalendarDay[] } {
  const { from, to } = monthRange(month);
  const byDate = new Map(days.map((d) => [d.date, d.status]));
  const sundayFirst = new Date(keyToUtc(from)).getUTCDay();
  const out: CalendarDay[] = [];
  for (let key = from; key <= to; key = addDays(key, 1)) {
    void byDate;
    // #1174: guests pick any future Vietnam day; availability is not shown on the public calendar.
    const state: CalendarState = key < todayKey ? 'past' : 'free';
    out.push({ date: key, day: Number(key.slice(8)), state, today: key === todayKey });
  }
  return { leadingBlanks: (sundayFirst + 6) % 7, days: out };
}

export interface DateRange {
  pickup: string | null;
  return: string | null;
}

/** First tap = pickup, second tap (same day or later) = return; anything else starts a new range */
export function pickRange(range: DateRange, key: string): DateRange {
  if (!range.pickup || range.return || key < range.pickup) return { pickup: key, return: null };
  return { pickup: range.pickup, return: key };
}

/** Every day from pickup to return (inclusive) is known and free */
export function rangeIsFree(days: PublicDay[], pickup: string, ret: string): boolean {
  const byDate = new Map(days.map((d) => [d.date, d.status]));
  for (let key = pickup; key <= ret; key = addDays(key, 1)) {
    if (byDate.get(key) !== 'free') return false;
  }
  return true;
}

/** Rental days, counted like the cart: same day = 1 */
export function nightsBetween(pickup: string, ret: string): number {
  return Math.round((keyToUtc(ret) - keyToUtc(pickup)) / DAY_MS) + 1;
}

export function formatDayKey(key: string, locale: string = 'vi'): string {
  const [y, m, d] = key.split('-');
  if (locale === 'vi') return `${d}/${m}/${y}`;
  // #1146: the page language's date order; a day key is a civil day, so format it in UTC
  return new Intl.DateTimeFormat(intlLocale(locale), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    keyToUtc(key)
  );
}

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Calendar header, Monday first: `T2 … CN` in Vietnamese, else the page language's short day names */
export function weekdayLabels(locale: string = 'vi'): string[] {
  if (locale === 'vi') return WEEKDAYS_VI;
  const format = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short', timeZone: 'UTC' });
  // 2024-01-01 is a Monday
  return Array.from({ length: 7 }, (_, i) => format.format(Date.UTC(2024, 0, 1 + i)));
}

/** Calendar title for `YYYY-MM`: `10/2026` in Vietnamese, else e.g. `October 2026` / `октябрь 2026 г.` */
export function monthLabel(month: string, locale: string = 'vi'): string {
  if (locale === 'vi') return `${month.slice(5)}/${month.slice(0, 4)}`;
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
}

/** A moment in the shop's Vietnam time: `HH:mm dd/mm/yyyy` in Vietnamese, else the page language's date and time */
export function formatShopTime(iso: string, locale: string = 'vi'): string {
  if (locale !== 'vi') {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso));
  }
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Request cart (one outlet and one date range for the whole request, kept in the browser per shop)

export interface RequestItem {
  productId: number;
  name: string;
  quantity: number;
  /** Main rent price when added, for the estimate only (the shop confirms the real price) */
  unitPrice: number | null;
  /** The main price is per day (else per rental) */
  perDay?: boolean;
}
export interface BookingRequestDraft {
  outletId: number | null;
  pickupDate: string | null;
  returnDate: string | null;
  items: RequestItem[];
}
export const emptyRequest = (): BookingRequestDraft => ({ outletId: null, pickupDate: null, returnDate: null, items: [] });

export function addToRequest(
  draft: BookingRequestDraft,
  where: { outletId: number; pickupDate: string; returnDate: string },
  item: RequestItem
): BookingRequestDraft {
  const items = draft.items.some((i) => i.productId === item.productId)
    ? draft.items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
    : [...draft.items, item];
  return { ...where, items };
}

export function removeFromRequest(draft: BookingRequestDraft, productId: number): BookingRequestDraft {
  const items = draft.items.filter((i) => i.productId !== productId);
  return items.length ? { ...draft, items } : emptyRequest();
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null | undefined;
export const requestKey = (tenantKey: string) => `anyrent.booking.${tenantKey}`;

export function loadRequest(storage: StorageLike, tenantKey: string): BookingRequestDraft {
  try {
    const raw = storage?.getItem(requestKey(tenantKey));
    if (!raw) return emptyRequest();
    const v = JSON.parse(raw) as BookingRequestDraft;
    if (!v || !Array.isArray(v.items) || v.items.length === 0) return emptyRequest();
    const items = v.items.filter((i) => Number.isInteger(i?.productId) && Number.isInteger(i?.quantity) && i.quantity > 0);
    return items.length
      ? { outletId: v.outletId ?? null, pickupDate: v.pickupDate ?? null, returnDate: v.returnDate ?? null, items }
      : emptyRequest();
  } catch {
    return emptyRequest();
  }
}

export function saveRequest(storage: StorageLike, tenantKey: string, draft: BookingRequestDraft): void {
  try {
    if (!storage) return;
    if (draft.items.length === 0) storage.removeItem(requestKey(tenantKey));
    else storage.setItem(requestKey(tenantKey), JSON.stringify(draft));
  } catch {
    // private mode / blocked storage: the request lives in memory for this visit only
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Form, button, errors, tracking

export type FormErrorKey = 'nameRequired' | 'phoneRequired' | 'phoneInvalid' | 'noteTooLong';
export function validateBookingForm(input: { name: string; phone: string; note: string }):
  | { ok: true; value: { name: string; phone: string; note: string } }
  | { ok: false; errors: Partial<Record<'name' | 'phone' | 'note', FormErrorKey>> } {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const note = input.note.trim();
  const errors: Partial<Record<'name' | 'phone' | 'note', FormErrorKey>> = {};
  if (!name) errors.name = 'nameRequired';
  const digits = phone.replace(/\D/g, '');
  if (!phone) errors.phone = 'phoneRequired';
  else if (!/^\+?[\d\s.-]+$/.test(phone) || digits.length < 9 || digits.length > 13) errors.phone = 'phoneInvalid';
  if (note.length > 1000) errors.note = 'noteTooLong';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, phone, note } };
}

export function canBook(input: {
  onlineBooking: boolean;
  outlets: Array<{ id: number; acceptsOnlineBooking?: boolean }>;
  hasRentPrice: boolean;
  /** When the shop hides catalogue prices, still allow Đặt thuê (#1174) */
  showPublicPrice?: boolean;
}): boolean {
  const priced = input.showPublicPrice === false ? true : input.hasRentPrice;
  return input.onlineBooking === true && priced && input.outlets.some((o) => o.acceptsOnlineBooking === true);
}

export function bookingErrorKey(code?: string | null): string {
  switch (code) {
    case 'BOOKING_NOT_AVAILABLE':
      return 'errorFull';
    case 'BOOKING_RATE_LIMITED':
      return 'errorRateLimited';
    case 'BOOKING_DISABLED':
    case 'BOOKING_OUTLET_UNAVAILABLE':
      return 'errorDisabled';
    case 'INVALID_PHONE':
      return 'phoneInvalid';
    case 'BOOKING_REQUEST_NOT_FOUND':
      return 'errorNotFound';
    default:
      return 'errorGeneric';
  }
}

export type TrackingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export function trackingView(r: { status: TrackingStatus; orderNumber: string | null; rejectReason: string | null }) {
  switch (r.status) {
    case 'CONFIRMED':
      return { steps: ['sent', 'waiting', 'confirmed'], current: 'confirmed', tone: 'ok', orderNumber: r.orderNumber ?? undefined };
    case 'REJECTED':
      return {
        steps: ['sent', 'rejected'],
        current: 'rejected',
        tone: 'bad',
        reasonKey: r.rejectReason === 'OUT_OF_STOCK' ? 'reasonOutOfStock' : r.rejectReason === 'CANNOT_CONTACT' ? 'reasonCannotContact' : 'reasonOther',
      };
    case 'EXPIRED':
      return { steps: ['sent', 'expired'], current: 'expired', tone: 'muted' };
    case 'CANCELLED':
      return { steps: ['sent', 'cancelled'], current: 'cancelled', tone: 'muted' };
    default:
      return { steps: ['sent', 'waiting', 'confirmed'], current: 'waiting', tone: 'wait' };
  }
}
