/**
 * #362 — GET /api/analytics/outlet-operations for the mobile "Việc cần làm":
 * optional `timeZone` (device zone; Vietnam when missing), tomorrow lists, and per-row money and late days.
 * Without the new params the response keeps its old fields.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: jest.fn().mockResolvedValue(false),
}));

const mockDb = { outletOperations: { get: jest.fn(), merchantOutletIds: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => {
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  return {
    ResponseBuilder: {
      success: (code: string, data: any) => ({ success: true, code, data }),
      error: (code: string) => ({ success: false, code }),
    },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    getCalendarDayRangeInTimeZone: dateRange.getCalendarDayRangeInTimeZone,
    formatDateKeyInTimeZone: dateRange.formatDateKeyInTimeZone,
  };
});

import { GET } from '../../apps/api/app/api/analytics/outlet-operations/route';

const req = (query = ''): any => ({ url: `http://localhost/api/analytics/outlet-operations${query}` });
const list = (orders: any[] = []) => ({ count: orders.length, orders });

const reservedLate = {
  id: 53, orderNumber: 'ORD-001-0053', orderType: 'RENT', status: 'RESERVED',
  pickupPlanAt: new Date('2026-10-01T03:00:00Z'), returnPlanAt: new Date('2026-10-05T03:00:00Z'),
  totalAmount: 800000, depositAmount: 200000, securityDeposit: 0, lateFee: 0, damageFee: 0, isReadyToDeliver: false,
  customer: { firstName: 'Mai', lastName: 'Thảo', phone: '0901' },
  orderItems: [{ quantity: 2, productName: 'Áo dài trắng', product: { name: 'Áo dài trắng (mới)' } }],
  payments: [],
};
const pickedUpLate = {
  ...reservedLate, id: 42, orderNumber: 'ORD-001-0042', status: 'PICKUPED',
  pickupPlanAt: new Date('2026-09-28T03:00:00Z'), returnPlanAt: new Date('2026-10-01T03:00:00Z'),
  securityDeposit: 500000, orderItems: [{ quantity: 1, productName: null, product: { name: 'Vest xám' } }],
};

describe('outlet-operations for "Việc cần làm" (#362)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-03T16:30:00Z')); // 23:30 in Vietnam, 01:30 next day in Tokyo
    ctx = { user: { id: 9, role: 'OUTLET_STAFF' }, userScope: { merchantId: 2, outletId: 1 } };
    mockDb.outletOperations.get.mockResolvedValue({
      pickupsToday: list(), returnsToday: list(), overdueReturns: list([pickedUpLate]), noShows: list([reservedLate]),
      returnsSoon: list(), tomorrowPickups: list(), tomorrowReturns: list(),
      doneToday: { pickups: 0, returns: 0 }, newOrdersByDay: [], tomorrow: { pickups: 0, returns: 0 }, cash: null,
    });
  });
  afterEach(() => jest.useRealTimers());

  it('without timeZone: the Vietnam day, as before', async () => {
    const res: any = await GET(req());
    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe('2026-10-03');
    const args = mockDb.outletOperations.get.mock.calls[0][0];
    expect(args.start).toEqual(new Date('2026-10-02T17:00:00.000Z'));
    expect(args.tomorrowStart).toEqual(new Date('2026-10-03T17:00:00.000Z'));
  });

  it('with timeZone: the day of that zone', async () => {
    const res: any = await GET(req('?timeZone=Asia/Tokyo'));
    expect(res.body.data.date).toBe('2026-10-04');
    const args = mockDb.outletOperations.get.mock.calls[0][0];
    expect(args.start).toEqual(new Date('2026-10-03T15:00:00.000Z'));
    expect(args.end).toEqual(new Date('2026-10-04T14:59:59.999Z'));
    expect(args.tomorrowStart).toEqual(new Date('2026-10-04T15:00:00.000Z'));
    expect(args.soonEnd).toEqual(new Date('2026-10-07T14:59:59.999Z'));
  });

  it('rejects an unknown timeZone', async () => {
    const res: any = await GET(req('?timeZone=Mars/Base'));
    expect(res.status).toBe(400);
    expect(mockDb.outletOperations.get).not.toHaveBeenCalled();
  });

  it('rows: amount due, late days and items; old fields unchanged', async () => {
    const res: any = await GET(req('?timeZone=Asia/Ho_Chi_Minh'));
    const noShow = res.body.data.noShows.orders[0];
    expect(noShow).toEqual(expect.objectContaining({
      orderNumber: 'ORD-001-0053', customerName: 'Mai Thảo', productNames: 'Áo dài trắng (mới)', itemCount: 2,
      amountDue: 600000, refundDue: 0, lateDays: 2,
      items: [{ name: 'Áo dài trắng', quantity: 2 }],
    }));
    const overdue = res.body.data.overdueReturns.orders[0];
    expect(overdue).toEqual(expect.objectContaining({ daysOverdue: 2, lateDays: 2, amountDue: 0, refundDue: 500000 }));
    expect(overdue.items).toEqual([{ name: 'Vest xám', quantity: 1 }]);
    expect(res.body.data.tomorrowPickups).toEqual({ count: 0, orders: [] });
    expect(res.body.data.tomorrow).toEqual({ pickups: 0, returns: 0 });
  });
});
