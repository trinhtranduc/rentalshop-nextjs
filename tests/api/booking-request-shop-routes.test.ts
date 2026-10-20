/**
 * #1124 Đặt đơn online — shop routes: list + counts, detail, prepare (customer by phone + cart prefill), reject.
 * Scope: merchant users see their shop; outlet users only their outlet (userScope). Lazy expiry after 24 h.
 */
import { emptyStore, fakePrisma, jsonRequest, seedShop, type BookingStore } from '../helpers/booking-fake-db';

jest.mock('next/server', () => require('../helpers/booking-fake-db').nextResponseMock());
jest.mock('@rentalshop/utils', () => require('../helpers/booking-fake-db').utilsMock());

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any, routeCtx: any) => handler(request, { ...ctx, ...routeCtx }),
}));

let mockStore: BookingStore;
let mockClient: any;
jest.mock('@rentalshop/database', () => ({
  get db() {
    return { prisma: mockClient };
  },
}));

import { GET as list } from '../../apps/api/app/api/booking-requests/route';
import { GET as detail } from '../../apps/api/app/api/booking-requests/[id]/route';
import { POST as prepare } from '../../apps/api/app/api/booking-requests/[id]/prepare/route';
import { POST as reject } from '../../apps/api/app/api/booking-requests/[id]/reject/route';

const NOW = new Date('2026-10-20T03:00:00.000Z');
const HOUR = 3600 * 1000;
const owner = { user: { id: 1, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
const staffThuDuc = { user: { id: 5, role: 'OUTLET_STAFF', merchantId: 2, outletId: 3 }, userScope: { merchantId: 2, outletId: 3 } };
const staffQuan1 = { user: { id: 6, role: 'OUTLET_STAFF', merchantId: 2, outletId: 4 }, userScope: { merchantId: 2, outletId: 4 } };
const otherShop = { user: { id: 7, role: 'MERCHANT', merchantId: 9 }, userScope: { merchantId: 9 } };

function addRequest(extra: any = {}) {
  const id = mockStore.nextId++;
  const row = {
    id,
    code: `C${id}`.padEnd(5, 'X').slice(0, 5),
    merchantId: 2,
    outletId: 3,
    status: 'PENDING',
    customerName: 'Nguyễn Thị Mai',
    customerPhone: '0912345678',
    note: 'Size M',
    pickupPlanAt: new Date('2026-10-20T17:00:00.000Z'),
    returnPlanAt: new Date('2026-10-23T17:00:00.000Z'),
    expiresAt: new Date(NOW.getTime() + 24 * HOUR),
    orderId: null,
    createdAt: new Date(NOW.getTime() - mockStore.requests.length * 1000),
    updatedAt: NOW,
    ...extra,
  };
  mockStore.requests.push(row);
  mockStore.items.push({ id: mockStore.nextId++, requestId: id, productId: 11, quantity: 1, productName: 'Áo dài gấm đỏ', unitPrice: 250000 });
  return row;
}

const call = (handler: any, url: string, body?: any, id?: number) =>
  handler(jsonRequest(url, body), { params: id != null ? { id: String(id) } : {} }) as any;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
  mockStore = emptyStore();
  seedShop(mockStore);
  mockClient = fakePrisma(mockStore);
  ctx = owner;
});
afterEach(() => jest.useRealTimers());

describe('GET /api/booking-requests', () => {
  it('lists the shop’s requests newest first with counts by status; past-due PENDING becomes EXPIRED', async () => {
    addRequest();
    addRequest({ expiresAt: new Date(NOW.getTime() - 1) });
    addRequest({ status: 'CONFIRMED', orderId: 900 });
    addRequest({ merchantId: 9, outletId: 8 });
    const res = await call(list, 'http://x/api/booking-requests');
    expect(res.status).toBe(200);
    expect(res.body.data.requests.map((r: any) => r.status)).toEqual(['PENDING', 'EXPIRED', 'CONFIRMED']);
    expect(res.body.data.counts).toEqual({ PENDING: 1, CONFIRMED: 1, REJECTED: 0, EXPIRED: 1, CANCELLED: 0 });
    expect(mockStore.requests[1].status).toBe('EXPIRED');
    expect(res.body.data.requests[0]).toMatchObject({ code: expect.any(String), customerPhone: '0912345678', outlet: { id: 3, name: 'Thủ Đức' }, pickupDate: '2026-10-21', returnDate: '2026-10-24', itemCount: 1 });
  });

  it('filters by status', async () => {
    addRequest();
    addRequest({ status: 'REJECTED' });
    const res = await call(list, 'http://x/api/booking-requests?status=PENDING');
    expect(res.body.data.requests).toHaveLength(1);
  });

  it('an outlet user sees only their outlet; another shop sees nothing', async () => {
    addRequest();
    addRequest({ outletId: 4 });
    ctx = staffThuDuc;
    expect((await call(list, 'http://x/api/booking-requests')).body.data.requests.map((r: any) => r.outlet.id)).toEqual([3]);
    ctx = staffQuan1;
    expect((await call(list, 'http://x/api/booking-requests')).body.data.requests.map((r: any) => r.outlet.id)).toEqual([4]);
    ctx = otherShop;
    expect((await call(list, 'http://x/api/booking-requests')).body.data.requests).toEqual([]);
  });
});

describe('GET /api/booking-requests/[id]', () => {
  it('shows the request, each item’s current free/short day, and the known customer by phone', async () => {
    mockStore.customers.push({ id: 77, merchantId: 2, firstName: 'Mai', lastName: 'Nguyễn', phone: '0912345678', deletedAt: null });
    mockStore.orders.push({ id: 1, outletId: 3, productId: 11, quantity: 2, status: 'RESERVED', orderType: 'RENT', pickupPlanAt: new Date('2026-10-22T17:00:00.000Z'), returnPlanAt: new Date('2026-10-22T17:00:00.000Z') });
    const r = addRequest();
    const res = await call(detail, `http://x/api/booking-requests/${r.id}`, undefined, r.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: r.id, status: 'PENDING', customer: { id: 77 } });
    expect(res.body.data.items[0]).toMatchObject({ productId: 11, quantity: 1, shortDay: '2026-10-23' });
  });

  it('404 for another shop or another outlet (outlet user)', async () => {
    const r = addRequest({ outletId: 4 });
    ctx = staffThuDuc;
    expect((await call(detail, `http://x/api/booking-requests/${r.id}`, undefined, r.id)).status).toBe(404);
    ctx = otherShop;
    expect((await call(detail, `http://x/api/booking-requests/${r.id}`, undefined, r.id)).status).toBe(404);
  });
});

describe('POST /api/booking-requests/[id]/prepare', () => {
  it('finds the shop’s customer by phone and returns the cart prefill (RENT, outlet, VN-day dates, items)', async () => {
    mockStore.customers.push({ id: 77, merchantId: 2, firstName: 'Mai', lastName: 'Nguyễn', phone: '0912345678', deletedAt: null });
    const r = addRequest();
    const res = await call(prepare, `http://x/api/booking-requests/${r.id}/prepare`, {}, r.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      bookingRequestId: r.id,
      orderType: 'RENT',
      outletId: 3,
      customer: { id: 77, firstName: 'Mai', lastName: 'Nguyễn', phone: '0912345678' },
      customerCreated: false,
      pickupPlanAt: '2026-10-20T17:00:00.000Z',
      returnPlanAt: '2026-10-23T17:00:00.000Z',
      notes: 'Size M',
      items: [{ productId: 11, quantity: 1, productName: 'Áo dài gấm đỏ' }],
    });
    expect(mockStore.requests[0].status).toBe('PENDING');
  });

  it('creates the customer when the phone is new (name split, same shop)', async () => {
    const r = addRequest();
    const res = await call(prepare, `http://x/api/booking-requests/${r.id}/prepare`, {}, r.id);
    expect(res.body.data.customerCreated).toBe(true);
    expect(mockStore.customers).toEqual([expect.objectContaining({ merchantId: 2, firstName: 'Nguyễn Thị', lastName: 'Mai', phone: '0912345678' })]);
  });

  it('409 BOOKING_REQUEST_CLOSED for a confirmed, rejected or expired request', async () => {
    const done = addRequest({ status: 'CONFIRMED', orderId: 900 });
    const late = addRequest({ expiresAt: new Date(NOW.getTime() - 1) });
    for (const r of [done, late]) {
      const res = await call(prepare, `http://x/api/booking-requests/${r.id}/prepare`, {}, r.id);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('BOOKING_REQUEST_CLOSED');
    }
  });
});

describe('POST /api/booking-requests/[id]/reject', () => {
  it('rejects a PENDING request with a reason and who decided', async () => {
    const r = addRequest();
    const res = await call(reject, `http://x/api/booking-requests/${r.id}/reject`, { reason: 'OUT_OF_STOCK', note: 'Hết size M' }, r.id);
    expect(res.status).toBe(200);
    expect(mockStore.requests[0]).toMatchObject({ status: 'REJECTED', rejectReason: 'OUT_OF_STOCK', rejectNote: 'Hết size M', decidedById: 1 });
  });

  it('400 for an unknown reason; 409 when already closed', async () => {
    const r = addRequest();
    expect((await call(reject, `http://x/api/booking-requests/${r.id}/reject`, { reason: 'BORED' }, r.id)).status).toBe(400);
    await call(reject, `http://x/api/booking-requests/${r.id}/reject`, { reason: 'OTHER' }, r.id);
    const again = await call(reject, `http://x/api/booking-requests/${r.id}/reject`, { reason: 'OTHER' }, r.id);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('BOOKING_REQUEST_CLOSED');
  });
});
