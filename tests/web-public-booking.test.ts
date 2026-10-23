/**
 * #1124 PR2 — public shop page "Đặt thuê": calendar, request cart, form, tracking states and the API client.
 * Pure helpers only (the components are thin); Vietnam civil day keys throughout.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  addToRequest,
  bookingErrorKey,
  calendarMonth,
  canBook,
  emptyRequest,
  formatDayKey,
  loadRequest,
  nightsBetween,
  pickRange,
  rangeIsFree,
  removeFromRequest,
  requestKey,
  saveRequest,
  trackingView,
  validateBookingForm,
} from '../apps/client/app/[tenantKey]/products/lib/booking';

const free = (dates: string[]) => dates.map((date) => ({ date, status: 'free' as const }));

describe('calendar month (Vietnam day keys)', () => {
  it('October 2026 starts on a Thursday (Monday-first grid); future days are free without availability (#1174)', () => {
    const days = [...free(['2026-10-20', '2026-10-21']), { date: '2026-10-22', status: 'full' as const }];
    const m = calendarMonth('2026-10', days, '2026-10-20');
    expect(m.leadingBlanks).toBe(3); // Mon, Tue, Wed empty
    expect(m.days).toHaveLength(31);
    expect(m.days[18]).toMatchObject({ date: '2026-10-19', state: 'past' });
    expect(m.days[19]).toMatchObject({ date: '2026-10-20', state: 'free', today: true });
    expect(m.days[21]).toMatchObject({ date: '2026-10-22', state: 'free' });
    expect(m.days[25]).toMatchObject({ date: '2026-10-26', state: 'free' });
  });

  it('February of a leap year has 29 days', () => {
    expect(calendarMonth('2028-02', [], '2028-01-01').days).toHaveLength(29);
  });

  it('does not depend on the machine time zone', () => {
    expect(calendarMonth('2026-11', [], '2026-10-20').leadingBlanks).toBe(6); // 1 Nov 2026 is a Sunday
  });
});

describe('picking the rental range', () => {
  const days = [...free(['2026-10-20', '2026-10-21', '2026-10-23']), { date: '2026-10-22', status: 'full' as const }];

  it('first tap = pickup, second tap = return; same day is allowed', () => {
    let r = pickRange({ pickup: null, return: null }, '2026-10-20');
    expect(r).toEqual({ pickup: '2026-10-20', return: null });
    r = pickRange(r, '2026-10-20');
    expect(r).toEqual({ pickup: '2026-10-20', return: '2026-10-20' });
  });

  it('a tap before the pickup starts again; a tap after a full range starts again', () => {
    expect(pickRange({ pickup: '2026-10-21', return: null }, '2026-10-20')).toEqual({ pickup: '2026-10-20', return: null });
    expect(pickRange({ pickup: '2026-10-20', return: '2026-10-21' }, '2026-10-23')).toEqual({ pickup: '2026-10-23', return: null });
  });

  it('a range is free only when every day in it is free', () => {
    expect(rangeIsFree(days, '2026-10-20', '2026-10-21')).toBe(true);
    expect(rangeIsFree(days, '2026-10-20', '2026-10-23')).toBe(false);
    expect(rangeIsFree(days, '2026-10-24', '2026-10-24')).toBe(false); // unknown day counts as not free
  });

  it('counts days inclusive (same day = 1) and formats keys as dd/mm/yyyy', () => {
    expect(nightsBetween('2026-10-20', '2026-10-20')).toBe(1);
    expect(nightsBetween('2026-10-30', '2026-11-02')).toBe(4);
    expect(formatDayKey('2026-10-05')).toBe('05/10/2026');
  });
});

describe('request cart in the browser', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  afterEach(() => store.clear());

  it('adds items for one outlet and one date range; the same product adds up', () => {
    let r = emptyRequest();
    r = addToRequest(r, { outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24' }, { productId: 7, name: 'Áo dài', quantity: 1, unitPrice: 250000 });
    r = addToRequest(r, { outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24' }, { productId: 7, name: 'Áo dài', quantity: 2, unitPrice: 250000 });
    r = addToRequest(r, { outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24' }, { productId: 9, name: 'Khăn', quantity: 1, unitPrice: null });
    expect(r.outletId).toBe(3);
    expect(r.items).toEqual([
      { productId: 7, name: 'Áo dài', quantity: 3, unitPrice: 250000 },
      { productId: 9, name: 'Khăn', quantity: 1, unitPrice: null },
    ]);
  });

  it('a new outlet or date range applies to the whole request', () => {
    let r = addToRequest(emptyRequest(), { outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24' }, { productId: 7, name: 'A', quantity: 1, unitPrice: 1 });
    r = addToRequest(r, { outletId: 4, pickupDate: '2026-10-25', returnDate: '2026-10-25' }, { productId: 9, name: 'B', quantity: 1, unitPrice: 1 });
    expect(r).toMatchObject({ outletId: 4, pickupDate: '2026-10-25', returnDate: '2026-10-25' });
    expect(r.items.map((i) => i.productId)).toEqual([7, 9]);
  });

  it('removing the last item empties the request', () => {
    const r = addToRequest(emptyRequest(), { outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24' }, { productId: 7, name: 'A', quantity: 1, unitPrice: 1 });
    expect(removeFromRequest(r, 7)).toEqual(emptyRequest());
  });

  it('saves per shop and reads it back; broken or blocked storage gives an empty request', () => {
    const r = addToRequest(emptyRequest(), { outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24' }, { productId: 7, name: 'A', quantity: 1, unitPrice: 1 });
    saveRequest(storage, 'linhbeauty', r);
    expect(store.has(requestKey('linhbeauty'))).toBe(true);
    expect(loadRequest(storage, 'linhbeauty')).toEqual(r);
    expect(loadRequest(storage, 'othershop')).toEqual(emptyRequest());
    store.set(requestKey('linhbeauty'), '{not json');
    expect(loadRequest(storage, 'linhbeauty')).toEqual(emptyRequest());
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(loadRequest(throwing, 'linhbeauty')).toEqual(emptyRequest());
    expect(() => saveRequest(throwing, 'linhbeauty', r)).not.toThrow();
    expect(loadRequest(null, 'linhbeauty')).toEqual(emptyRequest());
  });
});

describe('form', () => {
  it('needs a name and a phone; trims; keeps the note short', () => {
    expect(validateBookingForm({ name: ' ', phone: '0912345678', note: '' })).toEqual({ ok: false, errors: { name: 'nameRequired' } });
    expect(validateBookingForm({ name: 'Mai', phone: '', note: '' })).toEqual({ ok: false, errors: { phone: 'phoneRequired' } });
    expect(validateBookingForm({ name: 'Mai', phone: '12ab', note: '' })).toEqual({ ok: false, errors: { phone: 'phoneInvalid' } });
    expect(validateBookingForm({ name: 'Mai', phone: '0912 345 678', note: 'x'.repeat(1001) })).toEqual({ ok: false, errors: { note: 'noteTooLong' } });
    expect(validateBookingForm({ name: ' Mai ', phone: '+84 912 345 678', note: ' Size M ' })).toEqual({
      ok: true,
      value: { name: 'Mai', phone: '+84 912 345 678', note: 'Size M' },
    });
  });
});

describe('booking button and errors', () => {
  it('shows "Đặt thuê" only when the shop takes requests, an outlet accepts and the product has a rent price', () => {
    const outlets = [{ id: 1, acceptsOnlineBooking: false }, { id: 2, acceptsOnlineBooking: true }];
    expect(canBook({ onlineBooking: true, outlets, hasRentPrice: true })).toBe(true);
    expect(canBook({ onlineBooking: false, outlets, hasRentPrice: true })).toBe(false);
    expect(canBook({ onlineBooking: true, outlets: [{ id: 1, acceptsOnlineBooking: false }], hasRentPrice: true })).toBe(false);
    expect(canBook({ onlineBooking: true, outlets, hasRentPrice: false })).toBe(false);
    expect(canBook({ onlineBooking: undefined as unknown as boolean, outlets: [], hasRentPrice: true })).toBe(false); // old API
    expect(canBook({ onlineBooking: true, outlets, hasRentPrice: false, showPublicPrice: false })).toBe(true);
  });

  it('maps API codes to page messages; 409 names the full day', () => {
    expect(bookingErrorKey('BOOKING_NOT_AVAILABLE')).toBe('errorFull');
    expect(bookingErrorKey('BOOKING_RATE_LIMITED')).toBe('errorRateLimited');
    expect(bookingErrorKey('BOOKING_DISABLED')).toBe('errorDisabled');
    expect(bookingErrorKey('BOOKING_OUTLET_UNAVAILABLE')).toBe('errorDisabled');
    expect(bookingErrorKey('INVALID_PHONE')).toBe('phoneInvalid');
    expect(bookingErrorKey('SOMETHING_ELSE')).toBe('errorGeneric');
  });
});

describe('tracking page states', () => {
  it('pending shows the waiting step and the deadline', () => {
    expect(trackingView({ status: 'PENDING', orderNumber: null, rejectReason: null })).toEqual({ steps: ['sent', 'waiting', 'confirmed'], current: 'waiting', tone: 'wait' });
  });
  it('confirmed carries the order number', () => {
    expect(trackingView({ status: 'CONFIRMED', orderNumber: '362151', rejectReason: null })).toEqual({ steps: ['sent', 'waiting', 'confirmed'], current: 'confirmed', tone: 'ok', orderNumber: '362151' });
  });
  it('rejected shows the reason key; expired and cancelled are closed', () => {
    expect(trackingView({ status: 'REJECTED', orderNumber: null, rejectReason: 'OUT_OF_STOCK' })).toEqual({ steps: ['sent', 'rejected'], current: 'rejected', tone: 'bad', reasonKey: 'reasonOutOfStock' });
    expect(trackingView({ status: 'REJECTED', orderNumber: null, rejectReason: null }).reasonKey).toBe('reasonOther');
    expect(trackingView({ status: 'EXPIRED', orderNumber: null, rejectReason: null })).toEqual({ steps: ['sent', 'expired'], current: 'expired', tone: 'muted' });
    expect(trackingView({ status: 'CANCELLED', orderNumber: null, rejectReason: null }).current).toBe('cancelled');
  });
});

describe('public booking API client', () => {
  const fetchMock = jest.fn(async (..._args: unknown[]) => ({
    ok: false,
    status: 409,
    json: async () => ({ success: false, code: 'BOOKING_NOT_AVAILABLE', message: 'x', data: { productId: 7, date: '2026-10-22' } }),
  }));
  it('posts without the data cache and keeps the 409 day', async () => {
    (global as any).fetch = fetchMock;
    const { publicBookingApi } = await import('../packages/utils/src/api/public-booking');
    const res = await publicBookingApi.createRequest('linhbeauty', {
      outletId: 3, pickupDate: '2026-10-21', returnDate: '2026-10-24', items: [{ productId: 7, quantity: 1 }], name: 'Mai', phone: '0912345678', website: '',
    });
    expect(res).toEqual({ success: false, status: 409, code: 'BOOKING_NOT_AVAILABLE', data: { productId: 7, date: '2026-10-22' } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/public\/linhbeauty\/booking-requests$/);
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' });
  });
  it('reads availability and tracking with cache: no-store and encodes the shop key', async () => {
    const ok = jest.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, json: async () => ({ success: true, code: 'OK', data: { days: [] } }) }));
    (global as any).fetch = ok;
    const { publicBookingApi } = await import('../packages/utils/src/api/public-booking');
    const a = await publicBookingApi.availability('linhbeauty', { productId: 7, outletId: 3, from: '2026-10-01', to: '2026-10-31' });
    expect(a).toEqual({ success: true, status: 200, code: 'OK', data: { days: [] } });
    expect((ok.mock.calls[0] as any[])[0]).toMatch(/\/api\/public\/linhbeauty\/availability\?productId=7&outletId=3&from=2026-10-01&to=2026-10-31$/);
    await publicBookingApi.getRequest('linhbeauty', 'a7k3q');
    expect((ok.mock.calls[1] as any[])[0]).toMatch(/\/api\/public\/linhbeauty\/booking-requests\/A7K3Q$/);
    for (const call of ok.mock.calls) expect((call as any[])[1]).toMatchObject({ cache: 'no-store' });
  });
  it('a network failure is an error result, not a throw', async () => {
    (global as any).fetch = jest.fn(async () => { throw new Error('offline'); });
    const { publicBookingApi } = await import('../packages/utils/src/api/public-booking');
    expect(await publicBookingApi.getRequest('linhbeauty', 'A7K3Q')).toEqual({ success: false, status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('image search cards (#1174)', () => {
  it('do not render Còn/Hết chips', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(path.join(__dirname, '../apps/client/app/[tenantKey]/products/components/ImageSearchPanel.tsx'), 'utf8');
    expect(src).not.toMatch('inStockToday');
    expect(src).not.toMatch('outToday');
  });
});

describe('tracking page is public (#1124)', () => {
  it('/{tenantKey}/booking/{code} needs no login; other shop paths still do', async () => {
    const { isPublicRoute } = await import('../apps/client/lib/routes');
    expect(isPublicRoute('/linhbeauty/booking/A7K3Q')).toBe(true);
    expect(isPublicRoute('/linhbeauty/products')).toBe(true);
    expect(isPublicRoute('/linhbeauty/booking')).toBe(false);
    expect(isPublicRoute('/orders/123')).toBe(false);
  });
});
