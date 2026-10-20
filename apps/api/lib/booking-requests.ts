/**
 * #1124 Đặt đơn online — rules shared by the public booking routes and the shop routes.
 * A booking request is not an order: the shop confirms it, which creates a RESERVED order through POST /api/orders
 * (`bookingRequestId`). Days are Vietnam civil days (timezone-dates). No stock is held while a request waits;
 * availability is checked when it is sent and again by the order create.
 * Kept free of the @rentalshop/utils barrel so the unit tests stay light.
 */
import type { BookingRequest, BookingRequestItem, Prisma } from '@prisma/client';
import {
  AVAILABILITY_CALENDAR_TIMEZONE,
  calendarDayAvailability,
  getAvailabilityCivilDayBounds,
  toAvailabilityCivilDateKey,
} from './availability-calendar-days';

export const BOOKING_TTL_MS = 24 * 60 * 60 * 1000;
/** No 0/O and 1/I: the code is read aloud and typed from a screenshot */
export const BOOKING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const BOOKING_CODE_LENGTH = 5;
/** Longest rental a customer can ask for, and the widest public calendar window */
export const MAX_BOOKING_DAYS = 60;
export const MAX_CALENDAR_DAYS = 62;
export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_REJECT_REASONS = ['OUT_OF_STOCK', 'CANNOT_CONTACT', 'OTHER'] as const;
/** Spam limits: per IP in this instance's memory, per phone and shop in the database (shared by every instance) */
export const RATE_PER_IP = { limit: 5, windowMs: 10 * 60 * 1000 };
export const RATE_PER_PHONE = { limit: 3, windowMs: 60 * 60 * 1000 };

export function generateBookingCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < BOOKING_CODE_LENGTH; i++) {
    code += BOOKING_CODE_ALPHABET[Math.floor(random() * BOOKING_CODE_ALPHABET.length) % BOOKING_CODE_ALPHABET.length];
  }
  return code;
}

/** Digits only, a leading + kept; 8–15 digits, else null */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return plus ? `+${digits}` : digits;
}

/** First 3 and last 3 characters, the middle starred (public tracking page) */
export function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone.replace(/./g, '*');
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`;
}

/** "Nguyễn Thị Mai" → firstName "Nguyễn Thị", lastName "Mai" (the customer record keeps both) */
export function splitCustomerName(full: string): { firstName: string; lastName: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { firstName: words[0] ?? '', lastName: '' };
  return { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] };
}

/** Lazy expiry: a PENDING request past expiresAt reads as EXPIRED (no cron) */
export function effectiveBookingStatus(
  request: { status: string; expiresAt: Date | string },
  now: Date = new Date()
): BookingStatus {
  if (request.status === 'PENDING' && new Date(request.expiresAt).getTime() <= now.getTime()) return 'EXPIRED';
  return request.status as BookingStatus;
}

export function todayVnKey(now: Date = new Date()): string {
  return toAvailabilityCivilDateKey(now);
}

function isValidYmd(ymd: unknown): ymd is string {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000);
}

/** Pickup today (Vietnam) or later; return on or after pickup; at most MAX_BOOKING_DAYS days */
export function validateBookingDates(
  pickupYmd: unknown,
  returnYmd: unknown,
  now: Date = new Date()
): { ok: true } | { ok: false; code: 'INVALID_DATE_RANGE' } {
  if (!isValidYmd(pickupYmd) || !isValidYmd(returnYmd)) return { ok: false, code: 'INVALID_DATE_RANGE' };
  if (pickupYmd < todayVnKey(now) || returnYmd < pickupYmd) return { ok: false, code: 'INVALID_DATE_RANGE' };
  if (daysBetween(pickupYmd, returnYmd) + 1 > MAX_BOOKING_DAYS) return { ok: false, code: 'INVALID_DATE_RANGE' };
  return { ok: true };
}

/** A public calendar window: valid keys, from ≤ to, at most MAX_CALENDAR_DAYS days */
export function validateCalendarWindow(fromYmd: unknown, toYmd: unknown): boolean {
  return isValidYmd(fromYmd) && isValidYmd(toYmd) && fromYmd <= toYmd && daysBetween(fromYmd, toYmd) + 1 <= MAX_CALENDAR_DAYS;
}

/** Start of the Vietnam pickup / return day, as a RENT order created from the apps stores them */
export function bookingPlanDates(pickupYmd: string, returnYmd: string): { pickupPlanAt: Date; returnPlanAt: Date } {
  return {
    pickupPlanAt: getAvailabilityCivilDayBounds(pickupYmd)!.start,
    returnPlanAt: getAvailabilityCivilDayBounds(returnYmd)!.start,
  };
}

export function planDayKey(date: Date): string {
  return toAvailabilityCivilDateKey(date);
}

/** Owner 2026-10-20: the public calendar only says free or full (no "few left", no counts). Past days are full. */
export function publicDayStatuses(
  days: Array<{ date: string; available: number }>,
  todayKey: string
): Array<{ date: string; status: 'free' | 'full' }> {
  return days.map((d) => ({ date: d.date, status: d.date >= todayKey && d.available > 0 ? 'free' : 'full' }));
}

/** First day without `quantity` units free, else null */
export function firstShortDay(days: Array<{ date: string; available: number }>, quantity: number): string | null {
  return days.find((d) => d.available < quantity)?.date ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// In-memory rate window (per API instance). The per-phone limit is also counted in the database by the route.
// ---------------------------------------------------------------------------------------------------------------
const rateSlots = new Map<string, number[]>();

export function takeRateSlot(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const recent = (rateSlots.get(key) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= limit) {
    rateSlots.set(key, recent);
    return false;
  }
  recent.push(now);
  rateSlots.set(key, recent);
  if (rateSlots.size > 10_000) {
    for (const [k, times] of rateSlots) if (!times.some((t) => t > now - windowMs)) rateSlots.delete(k);
  }
  return true;
}

/** Tests only */
export function resetRateSlots(): void {
  rateSlots.clear();
}

export function clientIpOf(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

// ---------------------------------------------------------------------------------------------------------------
// Data helpers over a Prisma client (or transaction client)
// ---------------------------------------------------------------------------------------------------------------
type Db = Prisma.TransactionClient;
type BookingRow = BookingRequest & { items?: BookingRequestItem[] };

/**
 * Remaining units per Vietnam day of one product at one outlet: outlet stock minus RESERVED/PICKUPED rentals.
 * Same query and day rule as GET /api/products/[id]/availability-calendar. No stock row at the outlet = 0 units.
 */
export async function loadProductDays(
  prisma: Db,
  input: { productId: number; outletId: number; fromYmd: string; toYmd: string }
): Promise<Array<{ date: string; available: number; booked: number }>> {
  const stockRow = await prisma.outletStock.findFirst({
    where: { productId: input.productId, outletId: input.outletId },
    select: { stock: true },
  });
  if (!stockRow) return calendarDayAvailability({ stock: 0, orders: [], fromYmd: input.fromYmd, toYmd: input.toYmd });
  const rangeStart = getAvailabilityCivilDayBounds(input.fromYmd)!.start;
  const rangeEnd = getAvailabilityCivilDayBounds(input.toYmd)!.end;
  const orders = await prisma.order.findMany({
    where: {
      orderType: 'RENT',
      status: { in: ['RESERVED', 'PICKUPED'] },
      outletId: input.outletId,
      deletedAt: null,
      pickupPlanAt: { lt: rangeEnd },
      // Inclusive return civil day: a same-day order stores pickup == return at VN midnight
      returnPlanAt: { gte: rangeStart },
      orderItems: { some: { productId: input.productId } },
    },
    select: {
      pickupPlanAt: true,
      returnPlanAt: true,
      orderItems: { where: { productId: input.productId }, select: { quantity: true } },
    },
  });
  return calendarDayAvailability({
    stock: stockRow.stock,
    fromYmd: input.fromYmd,
    toYmd: input.toYmd,
    timeZone: AVAILABILITY_CALENDAR_TIMEZONE,
    orders: orders.map((o) => ({
      pickupPlanAt: o.pickupPlanAt,
      returnPlanAt: o.returnPlanAt,
      quantity: (o.orderItems ?? []).reduce((sum, item) => sum + item.quantity, 0),
    })),
  });
}

/** Booking settings of a shop: on/off and the outlets that take requests */
export async function loadBookingShop(prisma: Db, merchantId: number) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, name: true, phone: true, isActive: true, onlineBookingEnabled: true },
  });
  return merchant;
}

/** The outlet when it belongs to the shop, is active and takes requests, else null */
export async function loadBookingOutlet(prisma: Db, merchantId: number, outletId: number) {
  return prisma.outlet.findFirst({
    where: { id: outletId, merchantId, isActive: true, acceptsOnlineBooking: true },
    select: { id: true, name: true, phone: true, address: true },
  });
}

/** Mark the shop's PENDING requests past expiresAt as EXPIRED (when the shop opens its list) */
export async function expireDueRequests(prisma: Db, merchantId: number, now: Date = new Date()): Promise<number> {
  const result = await prisma.bookingRequest.updateMany({
    where: { merchantId, status: 'PENDING', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  return result?.count ?? 0;
}

/** Shop-facing row (the shop sees the full phone) */
export function shopBookingRow(request: BookingRow, outletNames: Map<number, string>, now: Date = new Date()) {
  const items = request.items ?? [];
  return {
    id: request.id,
    code: request.code,
    status: effectiveBookingStatus(request, now),
    customerName: request.customerName,
    customerPhone: request.customerPhone,
    note: request.note ?? null,
    outlet: { id: request.outletId, name: outletNames.get(request.outletId) ?? null },
    pickupDate: planDayKey(new Date(request.pickupPlanAt)),
    returnDate: planDayKey(new Date(request.returnPlanAt)),
    pickupPlanAt: new Date(request.pickupPlanAt).toISOString(),
    returnPlanAt: new Date(request.returnPlanAt).toISOString(),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    items: items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice ?? null })),
    orderId: request.orderId ?? null,
    rejectReason: request.rejectReason ?? null,
    rejectNote: request.rejectNote ?? null,
    expiresAt: new Date(request.expiresAt).toISOString(),
    createdAt: new Date(request.createdAt).toISOString(),
  };
}

/** Thrown inside the order create transaction when the request closed in the meantime (rolls the order back) */
export class BookingRequestClosedError extends Error {
  constructor() {
    super('BOOKING_REQUEST_CLOSED');
    this.name = 'BookingRequestClosedError';
  }
}
