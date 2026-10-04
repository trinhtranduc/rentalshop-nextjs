/**
 * #389 — calendar day rows (`GET /api/calendar/orders/by-date`) carry `amountDue`, `refundDue` and `lateFee`,
 * so the mobile calendar can show "còn thu" and the late fee. Payments are read only for the page shown.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withReadOnlyAuth: (handler: any) => (request: any) => handler(request, ctx),
}));

const mockDb: any = {
  orders: { searchWithItems: jest.fn() },
  prisma: { payment: { groupBy: jest.fn() } },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => {
  const date = jest.requireActual('../../packages/utils/src/core/date');
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  return {
    ResponseBuilder: { success: (code: string, data: any) => ({ success: true, code, data }) },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
    getLocalDateKey: date.getLocalDateKey,
    formatDateKeyInTimeZone: dateRange.formatDateKeyInTimeZone,
    getCalendarDayRangeInTimeZone: dateRange.getCalendarDayRangeInTimeZone,
    parseProductImages: () => [],
  };
});

import { GET } from '../../apps/api/app/api/calendar/orders/by-date/route';

const merchant = { user: { id: 3, role: 'MERCHANT' }, userScope: { merchantId: 2 } };
const req = (q: string): any => ({ url: `http://localhost/api/calendar/orders/by-date${q}` });

// 2026-10-04 10:00 in Vietnam
const day = new Date('2026-10-04T03:00:00Z');
const base = { orderItems: [], customer: { firstName: 'A' }, createdAt: day, pickupPlanAt: day, returnPlanAt: day };
const orders = [
  { ...base, id: 1, orderType: 'RENT', status: 'RESERVED', totalAmount: 500000, depositAmount: 100000, securityDeposit: 0, lateFee: 0 },
  { ...base, id: 2, orderType: 'RENT', status: 'PICKUPED', totalAmount: 500000, depositAmount: 0, securityDeposit: 200000, lateFee: 300000, damageFee: 0 },
  { ...base, id: 3, orderType: 'RENT', status: 'CANCELLED', totalAmount: 500000, depositAmount: 0, securityDeposit: 0, lateFee: null },
];

describe('calendar by-date money fields (#389)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = merchant;
    mockDb.orders.searchWithItems.mockResolvedValue({ data: orders, total: orders.length });
    mockDb.prisma.payment.groupBy.mockResolvedValue([{ orderId: 1, notes: 'PICKUP', _sum: { amount: 150000 } }]);
  });

  it('adds amountDue, refundDue and lateFee to each row', async () => {
    const res: any = await GET(req('?date=2026-10-04'));
    expect(res.body.data.orders.map((o: any) => [o.id, o.amountDue, o.refundDue, o.lateFee])).toEqual([
      [1, 250000, 0, 0], // 500,000 − 100,000 − 150,000 paid at pickup
      [2, 100000, 0, 300000], // late 300,000 − collateral 200,000
      [3, 0, 0, 0], // CANCELLED owes nothing; missing fee → 0
    ]);
  });

  it('reads payments only for the page shown', async () => {
    await GET(req('?date=2026-10-04&limit=1&page=2'));
    expect(mockDb.prisma.payment.groupBy).toHaveBeenCalledTimes(1);
    expect(mockDb.prisma.payment.groupBy.mock.calls[0][0].where.orderId).toEqual({ in: [2] });
  });

  it('keeps the old fields', async () => {
    const res: any = await GET(req('?date=2026-10-04'));
    expect(res.body.data.orders[0]).toMatchObject({ id: 1, status: 'RESERVED', totalAmount: 500000, orderItems: [] });
  });
});
