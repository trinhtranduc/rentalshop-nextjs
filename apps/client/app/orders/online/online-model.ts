/**
 * Đặt online — shop side (#1124 PR3). Pure, no @rentalshop/* imports, so Jest loads it.
 * Requests come from the public shop page; the shop confirms (create order prefilled) or rejects them.
 */

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

/** Tabs of the list: what still needs an answer first */
export const BOOKING_TABS: BookingStatus[] = ['PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED'];

export const REJECT_REASONS = ['OUT_OF_STOCK', 'CANNOT_CONTACT', 'OTHER'] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** Same roles as the API permission bookings.view / bookings.manage (not Nhân viên kho) */
const BOOKING_ROLES = ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'];
export const canSeeBookings = (role?: string | null): boolean => BOOKING_ROLES.includes(String(role || '').toUpperCase());

/** Rows that need no more action are greyed */
export const isClosedLook = (status: string): boolean => status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED';

/** "2026-10-21" → "21/10" */
export const shortDay = (key: string): string => {
  const [, m, d] = key.split('-');
  return d && m ? `${d}/${m}` : key;
};

export interface BookingRowLike {
  id: number;
  code: string;
  status: string;
  customerName: string;
  customerPhone: string;
  outlet?: { id: number; name: string | null } | null;
  pickupDate: string;
  returnDate: string;
  itemCount: number;
  expiresAt: string;
  orderId?: number | null;
}

export function bookingRowView(row: BookingRowLike, now: Date = new Date()) {
  const left = row.status === 'PENDING' ? Math.floor((Date.parse(row.expiresAt) - now.getTime()) / 3600000) : null;
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    closed: isClosedLook(row.status),
    name: row.customerName,
    phone: row.customerPhone,
    outletName: row.outlet?.name ?? '',
    range: `${shortDay(row.pickupDate)} → ${shortDay(row.returnDate)}`,
    itemCount: row.itemCount,
    hoursLeft: left == null ? null : Math.max(0, left),
    orderId: row.orderId ?? null,
  };
}

/** Detail: the API gives each item's first short day for the asked quantity (null = free every day) */
export function itemAvailability(item: { shortDay: string | null }): { kind: 'free' } | { kind: 'short'; day: string } {
  return item.shortDay ? { kind: 'short', day: shortDay(item.shortDay) } : { kind: 'free' };
}

export interface PreparedBooking {
  bookingRequestId: number;
  outletId: number;
  customer: { id: number; firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
  pickupPlanAt: string;
  returnPlanAt: string;
  notes?: string | null;
  items: Array<{ productId: number; quantity: number; productName?: string }>;
}

/** POST /api/booking-requests/[id]/prepare → what the create-order editor starts with */
export function draftFromBooking(p: PreparedBooking, toDayKey: (v: string | Date) => string) {
  const c = p.customer;
  return {
    bookingRequestId: p.bookingRequestId,
    pickup: toDayKey(p.pickupPlanAt),
    ret: toDayKey(p.returnPlanAt),
    outletId: p.outletId,
    customer: c ? { id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim(), phone: c.phone || '' } : null,
    notes: p.notes || '',
    items: p.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  };
}

export function rejectBody(reason: RejectReason, note: string):
  | { ok: true; body: { reason: RejectReason; note?: string } }
  | { ok: false; problem: 'noteRequired' } {
  const text = note.trim();
  if (reason === 'OTHER' && !text) return { ok: false, problem: 'noteRequired' };
  return { ok: true, body: text ? { reason, note: text } : { reason } };
}

/** Settings: one switch per outlet; an outlet is on unless it turned booking off */
export function outletBookingRows(rows: Array<{ id: number; name: string; acceptsOnlineBooking?: boolean }>) {
  return rows.map((r) => ({ id: r.id, name: r.name, on: r.acceptsOnlineBooking !== false }));
}
