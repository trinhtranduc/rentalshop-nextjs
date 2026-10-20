/**
 * #1124 PR3 — shop web "Đặt online": who sees it, list tabs and rows, detail availability, Xác nhận → create-order
 * prefill + bookingRequestId, Từ chối reasons, settings switches, and the authenticated API client.
 * Pure helpers only (the pages are thin); Vietnam civil day keys throughout.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  BOOKING_TABS,
  REJECT_REASONS,
  bookingRowView,
  canSeeBookings,
  draftFromBooking,
  isClosedLook,
  itemAvailability,
  outletBookingRows,
  rejectBody,
} from '../apps/client/app/orders/online/online-model';
import { buildPayload } from '../apps/client/app/orders/create/create-model';

const vnKey = (v: string | Date) => {
  const d = new Date(new Date(v).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

describe('who sees "Đặt online"', () => {
  it('owner, outlet admin and outlet staff; not Nhân viên kho or anonymous', () => {
    expect(['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'].map(canSeeBookings)).toEqual([true, true, true]);
    expect([canSeeBookings('OUTLET_INVENTORY'), canSeeBookings(null), canSeeBookings(undefined)]).toEqual([false, false, false]);
  });
});

describe('list', () => {
  it('tabs start with PENDING; expired, rejected and cancelled look closed', () => {
    expect(BOOKING_TABS[0]).toBe('PENDING');
    expect(BOOKING_TABS).toEqual(['PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED']);
    expect(['PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED'].map(isClosedLook)).toEqual([false, false, true, true, true]);
  });

  it('a row: customer, code, items, outlet, day range, hours left while pending', () => {
    const now = new Date('2026-10-20T07:05:00.000Z');
    const row = {
      id: 5, code: 'A7K3Q', status: 'PENDING', customerName: 'Nguyễn Thị Mai', customerPhone: '0912345678',
      outlet: { id: 3, name: 'Thủ Đức' }, pickupDate: '2026-10-21', returnDate: '2026-10-24', itemCount: 2,
      expiresAt: '2026-10-21T06:05:00.000Z', orderId: null, createdAt: '2026-10-20T06:05:00.000Z',
    };
    expect(bookingRowView(row, now)).toEqual({
      id: 5, code: 'A7K3Q', status: 'PENDING', closed: false, name: 'Nguyễn Thị Mai', phone: '0912345678',
      outletName: 'Thủ Đức', range: '21/10 → 24/10', itemCount: 2, hoursLeft: 23, orderId: null,
    });
    expect(bookingRowView({ ...row, status: 'EXPIRED' }, now).hoursLeft).toBeNull();
    expect(bookingRowView({ ...row, status: 'CONFIRMED', orderId: 900 }, now)).toMatchObject({ closed: false, orderId: 900, hoursLeft: null });
  });
});

describe('detail', () => {
  it('each item says free for the asked quantity, or the first short day', () => {
    expect(itemAvailability({ shortDay: null })).toEqual({ kind: 'free' });
    expect(itemAvailability({ shortDay: '2026-10-23' })).toEqual({ kind: 'short', day: '23/10' });
  });
});

describe('Xác nhận → create order prefilled', () => {
  const prepared = {
    bookingRequestId: 5,
    orderType: 'RENT',
    outletId: 3,
    customer: { id: 77, firstName: 'Mai', lastName: 'Nguyễn Thị', phone: '0912345678' },
    customerCreated: false,
    pickupPlanAt: '2026-10-20T17:00:00.000Z',
    returnPlanAt: '2026-10-23T17:00:00.000Z',
    notes: 'Size M',
    items: [{ productId: 11, quantity: 1, productName: 'Áo dài gấm đỏ' }, { productId: 12, quantity: 2, productName: 'Khăn đóng' }],
  };

  it('maps the prepare answer to the editor draft on Vietnam days', () => {
    expect(draftFromBooking(prepared, vnKey)).toEqual({
      bookingRequestId: 5,
      pickup: '2026-10-21',
      ret: '2026-10-24',
      outletId: 3,
      customer: { id: 77, name: 'Mai Nguyễn Thị', phone: '0912345678' },
      notes: 'Size M',
      items: [{ productId: 11, quantity: 1 }, { productId: 12, quantity: 2 }],
    });
  });

  it('a new order sends bookingRequestId; an edit or a plain order does not', () => {
    const base = {
      orderType: 'RENT' as const, customerId: 77, outletId: 3, pickup: '2026-10-21', ret: '2026-10-24', lines: [],
      discountType: 'amount' as const, discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '',
    };
    expect(buildPayload({ ...base, mode: 'create', bookingRequestId: 5 })).toMatchObject({ bookingRequestId: 5 });
    expect(buildPayload({ ...base, mode: 'create' })).not.toHaveProperty('bookingRequestId');
    expect(buildPayload({ ...base, mode: 'edit', bookingRequestId: 5 })).not.toHaveProperty('bookingRequestId');
  });
});

describe('Từ chối', () => {
  it('three reasons; "khác" needs a note, the others take an optional one', () => {
    expect(REJECT_REASONS).toEqual(['OUT_OF_STOCK', 'CANNOT_CONTACT', 'OTHER']);
    expect(rejectBody('OUT_OF_STOCK', '')).toEqual({ ok: true, body: { reason: 'OUT_OF_STOCK' } });
    expect(rejectBody('CANNOT_CONTACT', '  gọi 2 lần ')).toEqual({ ok: true, body: { reason: 'CANNOT_CONTACT', note: 'gọi 2 lần' } });
    expect(rejectBody('OTHER', ' ')).toEqual({ ok: false, problem: 'noteRequired' });
    expect(rejectBody('OTHER', 'Shop nghỉ Tết')).toEqual({ ok: true, body: { reason: 'OTHER', note: 'Shop nghỉ Tết' } });
  });
});

describe('settings', () => {
  it('per-outlet switches: on unless the outlet turned booking off', () => {
    expect(outletBookingRows([{ id: 3, name: 'Thủ Đức', acceptsOnlineBooking: true }, { id: 4, name: 'Quận 1', acceptsOnlineBooking: false }, { id: 5, name: 'Cũ' }])).toEqual([
      { id: 3, name: 'Thủ Đức', on: true },
      { id: 4, name: 'Quận 1', on: false },
      { id: 5, name: 'Cũ', on: true },
    ]);
  });
});

describe('bookingRequestsApi (authenticated)', () => {
  afterEach(() => jest.resetModules());

  it('lists, reads, prepares and rejects through authenticatedFetch', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    jest.doMock('../packages/utils/src/core', () => ({
      authenticatedFetch: jest.fn(async (url: string, init?: RequestInit) => {
        calls.push([url, init]);
        return { ok: true } as unknown as Response;
      }),
      parseApiResponse: jest.fn(async () => ({ success: true, data: {} })),
    }));
    jest.doMock('../packages/utils/src/config/api', () => ({
      apiUrls: {
        bookingRequests: {
          list: 'https://api.x/api/booking-requests',
          get: (id: number) => `https://api.x/api/booking-requests/${id}`,
          prepare: (id: number) => `https://api.x/api/booking-requests/${id}/prepare`,
          reject: (id: number) => `https://api.x/api/booking-requests/${id}/reject`,
        },
        settings: { merchant: 'https://api.x/api/settings/merchant' },
      },
    }));
    const { bookingRequestsApi } = await import('../packages/utils/src/api/booking-requests');
    await bookingRequestsApi.list({ status: 'PENDING', page: 2, limit: 20 });
    await bookingRequestsApi.get(5);
    await bookingRequestsApi.prepare(5);
    await bookingRequestsApi.reject(5, { reason: 'OTHER', note: 'x' });
    await bookingRequestsApi.setOnlineBooking(true);
    expect(calls.map(([u, i]) => [u, i?.method ?? 'GET'])).toEqual([
      ['https://api.x/api/booking-requests?status=PENDING&page=2&limit=20', 'GET'],
      ['https://api.x/api/booking-requests/5', 'GET'],
      ['https://api.x/api/booking-requests/5/prepare', 'POST'],
      ['https://api.x/api/booking-requests/5/reject', 'POST'],
      ['https://api.x/api/settings/merchant', 'PUT'],
    ]);
    expect(JSON.parse(String(calls[3][1]?.body))).toEqual({ reason: 'OTHER', note: 'x' });
    expect(JSON.parse(String(calls[4][1]?.body))).toEqual({ onlineBookingEnabled: true });
  });
});
