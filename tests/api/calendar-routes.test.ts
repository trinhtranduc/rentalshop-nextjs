/**
 * #362 — calendar for the mobile app: pickups and returns per day in the caller's time zone, the returns list
 * of a day, and outlet filters that stay inside the caller's merchant. Old params give the old answers.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  withReadOnlyAuth: (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb = {
  orders: { search: jest.fn(), searchWithItems: jest.fn(), getStats: jest.fn() },
  // #389: by-date rows read grouped payments for amountDue / refundDue
  prisma: { payment: { groupBy: jest.fn(async () => []) } },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => {
  const date = jest.requireActual('../../packages/utils/src/core/date');
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  return {
    ResponseBuilder: { success: (code: string, data: any) => ({ success: true, code, data }) },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    getLocalDateKey: date.getLocalDateKey,
    normalizeDateToMidnightUTC: date.normalizeDateToMidnightUTC,
    formatDateKeyInTimeZone: dateRange.formatDateKeyInTimeZone,
    getCalendarDayRangeInTimeZone: dateRange.getCalendarDayRangeInTimeZone,
    parseProductImages: () => [],
  };
});

import { GET as countGET } from '../../apps/api/app/api/calendar/orders/count/route';
import { GET as byDateGET } from '../../apps/api/app/api/calendar/orders/by-date/route';
import { GET as monthGET } from '../../apps/api/app/api/calendar/orders/route';

const merchant = { user: { id: 2, role: 'MERCHANT' }, userScope: { merchantId: 2 } };
const req = (path: string): any => ({ url: `http://localhost${path}` });

// 2026-10-04 23:30 in Vietnam / 2026-10-05 01:30 in Tokyo
const lateEvening = new Date('2026-10-04T16:30:00Z');
const reserved = { id: 1, status: 'RESERVED', orderType: 'RENT', pickupPlanAt: lateEvening, returnPlanAt: new Date('2026-10-07T03:00:00Z'), createdAt: lateEvening, orderItems: [], customer: { firstName: 'A', phone: '1' } };
const pickedUp = { id: 2, status: 'PICKUPED', orderType: 'RENT', pickupPlanAt: new Date('2026-10-01T03:00:00Z'), returnPlanAt: lateEvening, createdAt: lateEvening, orderItems: [], customer: { firstName: 'B', phone: '2' } };

function ordersFor(where: any) {
  if (where.status === 'RESERVED') return [reserved];
  if (where.status === 'PICKUPED') return [pickedUp];
  return [reserved, pickedUp];
}

describe('calendar routes (#362)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.orders.search.mockImplementation(async ({ where }: any) => ({ data: ordersFor(where), total: ordersFor(where).length }));
    mockDb.orders.searchWithItems.mockImplementation(async ({ where }: any) => ({ data: ordersFor(where), total: ordersFor(where).length }));
    mockDb.orders.getStats.mockResolvedValue(3);
  });

  describe('GET /api/calendar/orders/count', () => {
    it('keeps countByDate as before (status=RESERVED, Vietnam keys)', async () => {
      const res: any = await countGET(req('/api/calendar/orders/count?month=10&year=2026&status=RESERVED'));
      expect(Object.keys(res.body.data.countByDate)).toHaveLength(31);
      expect(res.body.data.countByDate['2026-10-04']).toBe(1);
      expect(res.body.data.total).toBe(1);
    });

    it('adds pickups and returns per day and late returns', async () => {
      const res: any = await countGET(req('/api/calendar/orders/count?month=10&year=2026&status=RESERVED'));
      expect(res.body.data.byDate['2026-10-04']).toEqual({ pickups: 1, returns: 1 });
      expect(res.body.data.byDate['2026-10-05']).toEqual({ pickups: 0, returns: 0 });
      expect(res.body.data.lateReturns).toBe(3);
      const returnsQuery = mockDb.orders.search.mock.calls.map(([a]: any) => a.where).find((w: any) => w.status === 'PICKUPED');
      expect(returnsQuery.returnPlanAt).toBeDefined();
    });

    it('uses the time zone sent for day keys', async () => {
      const res: any = await countGET(req('/api/calendar/orders/count?month=10&year=2026&status=RESERVED&timeZone=Asia/Tokyo'));
      expect(res.body.data.countByDate['2026-10-05']).toBe(1);
      expect(res.body.data.byDate['2026-10-05']).toEqual({ pickups: 1, returns: 1 });
    });

    it("keeps a merchant's outlet filter inside its merchant", async () => {
      await countGET(req('/api/calendar/orders/count?month=10&year=2026&status=RESERVED&outletId=7'));
      const where = mockDb.orders.search.mock.calls[0][0].where;
      expect(where.outlet).toEqual({ id: 7, merchantId: 2 });
      expect(where.outletId).toBeUndefined();
    });
  });

  describe('GET /api/calendar/orders/by-date', () => {
    it('default stays the pickup list', async () => {
      const res: any = await byDateGET(req('/api/calendar/orders/by-date?date=2026-10-04&status=RESERVED'));
      const where = mockDb.orders.searchWithItems.mock.calls[0][0].where;
      expect(where.pickupPlanAt).toBeDefined();
      expect(res.body.data.orders.map((o: any) => o.id)).toEqual([1]);
    });

    it('kind=return lists rentals due back that day', async () => {
      const res: any = await byDateGET(req('/api/calendar/orders/by-date?date=2026-10-04&kind=return'));
      const where = mockDb.orders.searchWithItems.mock.calls[0][0].where;
      expect(where.status).toBe('PICKUPED');
      expect(where.returnPlanAt).toBeDefined();
      expect(where.pickupPlanAt).toBeUndefined();
      expect(res.body.data.orders.map((o: any) => o.id)).toEqual([2]);
    });

    it("keeps a merchant's outlet filter inside its merchant", async () => {
      await byDateGET(req('/api/calendar/orders/by-date?date=2026-10-04&status=RESERVED&outletId=7'));
      const where = mockDb.orders.searchWithItems.mock.calls[0][0].where;
      expect(where.outlet).toEqual({ id: 7, merchantId: 2 });
      expect(where.outletId).toBeUndefined();
    });
  });

  describe('GET /api/calendar/orders', () => {
    it('asks only for pickups inside the Vietnam days of the range', async () => {
      await monthGET(req('/api/calendar/orders?startDate=2026-10-01&endDate=2026-10-31'));
      const where = mockDb.orders.searchWithItems.mock.calls[0][0].where;
      expect(where.pickupPlanAt).toEqual({
        gte: new Date('2026-09-30T17:00:00.000Z'),
        lte: new Date('2026-10-31T16:59:59.999Z'),
      });
    });

    it("keeps a merchant's outlet filter inside its merchant", async () => {
      await monthGET(req('/api/calendar/orders?startDate=2026-10-01&endDate=2026-10-31&outletId=7'));
      const where = mockDb.orders.searchWithItems.mock.calls[0][0].where;
      expect(where.outlet).toEqual({ id: 7, merchantId: 2 });
    });
  });
});
