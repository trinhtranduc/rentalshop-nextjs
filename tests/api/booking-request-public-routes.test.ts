/**
 * #1124 Đặt đơn online — public routes (no login): availability, create request, tracking by code.
 * Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh; "today" is fixed to 2026-10-20 in Vietnam.
 */
import { emptyStore, fakePrisma, jsonRequest, nextResponseMock, seedShop, utilsMock, type BookingStore } from '../helpers/booking-fake-db';

jest.mock('next/server', () => require('../helpers/booking-fake-db').nextResponseMock());
jest.mock('@rentalshop/utils', () => require('../helpers/booking-fake-db').utilsMock());
jest.mock('@rentalshop/utils/server', () => ({ buildCorsHeaders: () => ({}) }));

let mockStore: BookingStore;
let mockClient: any;
jest.mock('@rentalshop/database', () => ({
  get db() {
    return {
      prisma: mockClient,
      merchants: {
        findByTenantKey: async (key: string) => mockStore.merchants.find((m) => m.tenantKey === key.toLowerCase()) ?? null,
      },
    };
  },
}));
const mockNotify = jest.fn();
jest.mock('../../apps/api/lib/push-notifications', () => ({ notifyOutletBookingRequest: (...a: any[]) => mockNotify(...a) }));

import { GET as availability } from '../../apps/api/app/api/public/[tenantKey]/availability/route';
import { POST as createRequest } from '../../apps/api/app/api/public/[tenantKey]/booking-requests/route';
import { GET as getByCode } from '../../apps/api/app/api/public/[tenantKey]/booking-requests/[code]/route';
import { resetRateSlots } from '../../apps/api/lib/booking-requests';

// 2026-10-20 10:00 in Vietnam
const NOW = new Date('2026-10-20T03:00:00.000Z');
const vnDay = (ymd: string) => new Date(`${ymd}T00:00:00+07:00`);
const params = (tenantKey = 'linhphuong', extra: Record<string, string> = {}) => ({ params: { tenantKey, ...extra } });

function body(extra: any = {}) {
  return {
    outletId: 3,
    pickupDate: '2026-10-21',
    returnDate: '2026-10-24',
    items: [{ productId: 11, quantity: 1 }, { productId: 12, quantity: 1 }],
    name: 'Nguyễn Thị Mai',
    phone: '0912 345 678',
    note: 'Size M',
    website: '',
    ...extra,
  };
}

const create = (b: any, ip = '1.1.1.1') =>
  createRequest(jsonRequest('http://x/api/public/linhphuong/booking-requests', b, { 'x-forwarded-for': ip }), params()) as any;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
  mockStore = emptyStore();
  seedShop(mockStore);
  mockClient = fakePrisma(mockStore);
  mockNotify.mockClear();
  resetRateSlots();
});
afterEach(() => jest.useRealTimers());

describe('GET /api/public/[tenantKey]/availability', () => {
  const url = (q: string) => `http://x/api/public/linhphuong/availability?${q}`;

  it('returns free / full per Vietnam day, past days full, no quantities', async () => {
    // one dress of two is out 21–22; the other one too on the 22nd → 22 full
    mockStore.orders.push({ id: 1, outletId: 3, productId: 11, quantity: 1, status: 'RESERVED', orderType: 'RENT', pickupPlanAt: vnDay('2026-10-21'), returnPlanAt: vnDay('2026-10-22') });
    mockStore.orders.push({ id: 2, outletId: 3, productId: 11, quantity: 1, status: 'PICKUPED', orderType: 'RENT', pickupPlanAt: vnDay('2026-10-22'), returnPlanAt: vnDay('2026-10-22') });
    const res: any = await availability(jsonRequest(url('productId=11&outletId=3&from=2026-10-19&to=2026-10-23')), params());
    expect(res.status).toBe(200);
    expect(res.body.data.days).toEqual([
      { date: '2026-10-19', status: 'full' },
      { date: '2026-10-20', status: 'free' },
      { date: '2026-10-21', status: 'free' },
      { date: '2026-10-22', status: 'full' },
      { date: '2026-10-23', status: 'free' },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/available|booked|stock/);
  });

  it('403 BOOKING_DISABLED when the shop has not turned booking on', async () => {
    mockStore.merchants[0].onlineBookingEnabled = false;
    const res: any = await availability(jsonRequest(url('productId=11&outletId=3&from=2026-10-20&to=2026-10-21')), params());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('BOOKING_DISABLED');
  });

  it('refuses an outlet that does not take requests, another shop’s product, and a window over 62 days', async () => {
    expect((await availability(jsonRequest(url('productId=11&outletId=4&from=2026-10-20&to=2026-10-21')), params()) as any).status).toBe(400);
    expect((await availability(jsonRequest(url('productId=81&outletId=3&from=2026-10-20&to=2026-10-21')), params()) as any).status).toBe(404);
    expect((await availability(jsonRequest(url('productId=11&outletId=3&from=2026-10-20&to=2027-01-20')), params()) as any).status).toBe(400);
  });
});

describe('POST /api/public/[tenantKey]/booking-requests', () => {
  it('creates a PENDING request with a 5-letter code, VN-day plan dates, 24 h expiry, and notifies the outlet', async () => {
    const res = await create(body());
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('BOOKING_REQUEST_CREATED');
    expect(res.body.data.code).toMatch(/^[A-Z2-9]{5}$/);
    expect(res.body.data.status).toBe('PENDING');
    const saved = mockStore.requests[0];
    expect(saved).toMatchObject({ merchantId: 2, outletId: 3, customerName: 'Nguyễn Thị Mai', customerPhone: '0912345678', note: 'Size M' });
    expect(saved.pickupPlanAt.toISOString()).toBe('2026-10-20T17:00:00.000Z');
    expect(saved.returnPlanAt.toISOString()).toBe('2026-10-23T17:00:00.000Z');
    expect(saved.expiresAt.getTime() - NOW.getTime()).toBe(24 * 3600 * 1000);
    expect(mockStore.items.map((i) => [i.productId, i.quantity, i.productName, i.unitPrice])).toEqual([
      [11, 1, 'Áo dài gấm đỏ', 250000],
      [12, 1, 'Khăn đóng nam', 30000],
    ]);
    expect(mockNotify).toHaveBeenCalledWith(3, expect.objectContaining({ code: saved.code, customerName: 'Nguyễn Thị Mai' }));
  });

  it('a filled honeypot answers like a success but saves nothing', async () => {
    const res = await create(body({ website: 'http://spam' }));
    expect(res.status).toBe(201);
    expect(mockStore.requests).toHaveLength(0);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('429 BOOKING_RATE_LIMITED after 3 requests in an hour from one phone (counted in the database)', async () => {
    for (let i = 0; i < 3; i++) expect((await create(body(), `2.2.2.${i}`)).status).toBe(201);
    const res = await create(body(), '2.2.2.9');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('BOOKING_RATE_LIMITED');
  });

  it('429 after 5 requests in 10 minutes from one IP', async () => {
    for (let i = 0; i < 5; i++) expect((await create(body({ phone: `09000000${10 + i}` }), '3.3.3.3')).status).toBe(201);
    expect((await create(body({ phone: '0900000099' }), '3.3.3.3')).status).toBe(429);
  });

  it('409 BOOKING_NOT_AVAILABLE with the product and day when an item is full on one day', async () => {
    mockStore.orders.push({ id: 5, outletId: 3, productId: 12, quantity: 1, status: 'RESERVED', orderType: 'RENT', pickupPlanAt: vnDay('2026-10-23'), returnPlanAt: vnDay('2026-10-25') });
    const res = await create(body());
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_NOT_AVAILABLE');
    expect(res.body.data).toEqual({ productId: 12, date: '2026-10-23' });
    expect(mockStore.requests).toHaveLength(0);
  });

  it('a same-day pickup and return still occupies that day', async () => {
    mockStore.orders.push({ id: 6, outletId: 3, productId: 12, quantity: 1, status: 'RESERVED', orderType: 'RENT', pickupPlanAt: vnDay('2026-10-21'), returnPlanAt: vnDay('2026-10-21') });
    const res = await create(body({ returnDate: '2026-10-21' }));
    expect(res.status).toBe(409);
    expect(res.body.data).toEqual({ productId: 12, date: '2026-10-21' });
  });

  it('refuses: shop off (403), outlet not taking requests, past pickup, another shop’s product, bad phone (400)', async () => {
    expect((await create(body({ outletId: 4 }))).status).toBe(400);
    expect((await create(body({ pickupDate: '2026-10-19' }))).status).toBe(400);
    expect((await create(body({ items: [{ productId: 81, quantity: 1 }] }))).status).toBe(400);
    expect((await create(body({ phone: '123' }))).status).toBe(400);
    expect((await create(body({ items: [] }))).status).toBe(400);
    mockStore.merchants[0].onlineBookingEnabled = false;
    const off = await create(body());
    expect(off.status).toBe(403);
    expect(off.body.code).toBe('BOOKING_DISABLED');
    expect(mockStore.requests).toHaveLength(0);
  });
});

describe('GET /api/public/[tenantKey]/booking-requests/[code]', () => {
  const track = (code: string, tenantKey = 'linhphuong') =>
    getByCode(jsonRequest(`http://x/api/public/${tenantKey}/booking-requests/${code}`), params(tenantKey, { code })) as any;

  it('shows status, days, outlet and items with the phone masked', async () => {
    const created = await create(body());
    const res = await track(created.body.data.code);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      code: created.body.data.code,
      status: 'PENDING',
      pickupDate: '2026-10-21',
      returnDate: '2026-10-24',
      outlet: { id: 3, name: 'Thủ Đức' },
      customerName: 'Nguyễn Thị Mai',
      customerPhone: '091****678',
      items: [{ productId: 11, productName: 'Áo dài gấm đỏ', quantity: 1 }, { productId: 12, productName: 'Khăn đóng nam', quantity: 1 }],
    });
    expect(JSON.stringify(res.body)).not.toContain('0912345678');
  });

  it('reads EXPIRED after 24 h without a cron', async () => {
    const created = await create(body());
    jest.setSystemTime(new Date(NOW.getTime() + 24 * 3600 * 1000 + 1));
    expect((await track(created.body.data.code)).body.data.status).toBe('EXPIRED');
  });

  it('404 for an unknown code or another shop’s tenant key', async () => {
    const created = await create(body());
    expect((await track('ZZZZZ')).status).toBe(404);
    expect((await track(created.body.data.code, 'other')).status).toBe(404);
  });
});
