/**
 * #405 — GET /api/customers/{id}/orders returned `summary.totalAmount` summed over every order,
 * cancelled ones included. Money totals exclude CANCELLED (AGENTS.md revenue rule).
 * `summary.totalOrders` stays a plain count of the listed orders, cancelled included.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

type Row = {
  id: number;
  customerId: number;
  outletId: number;
  merchantId: number;
  status: string;
  totalAmount: number;
  deletedAt: Date | null;
};
let rows: Row[] = [];

// Minimal Prisma `where` evaluator for the fields the route uses.
const matchStatus = (status: string, cond: any): boolean => {
  if (cond === undefined) return true;
  if (typeof cond === 'string') return status === cond;
  if (cond.not !== undefined && status === cond.not) return false;
  if (cond.notIn && cond.notIn.includes(status)) return false;
  if (cond.in && !cond.in.includes(status)) return false;
  if (cond.equals !== undefined && status !== cond.equals) return false;
  return true;
};
const matches = (r: Row, where: any): boolean => {
  if (where.deletedAt === null && r.deletedAt !== null) return false;
  if (where.customerId !== undefined && r.customerId !== where.customerId) return false;
  if (where.outletId !== undefined && r.outletId !== where.outletId) return false;
  if (where.outlet?.merchantId !== undefined && r.merchantId !== where.outlet.merchantId) return false;
  if (!matchStatus(r.status, where.status)) return false;
  if (where.NOT?.status !== undefined && matchStatus(r.status, where.NOT.status)) return false;
  return true;
};

const mockPrisma: any = {
  order: {
    aggregate: jest.fn(async ({ where, _sum }: any) => {
      const hit = rows.filter((r) => matches(r, where));
      return {
        _sum: { totalAmount: _sum?.totalAmount && hit.length ? hit.reduce((s, r) => s + r.totalAmount, 0) : null },
      };
    }),
  },
};

const mockDb: any = {
  customers: {
    findById: jest.fn(async (id: number) =>
      id === 10 ? { id: 10, firstName: 'Lan', lastName: 'Ng', phone: '090', merchantId: 2 } : null
    ),
  },
  orders: {
    // Same scope as packages/database/src/order.ts search: no status filter unless asked
    search: jest.fn(async (f: any) => {
      const where: any = { deletedAt: null, customerId: f.customerId };
      if (f.outletId) where.outletId = f.outletId;
      else if (f.merchantId) where.outlet = { merchantId: f.merchantId };
      const hit = rows.filter((r) => matches(r, where));
      return { data: hit.map((r) => ({ ...r, createdAt: new Date('2026-10-01T03:00:00Z') })), total: hit.length, page: f.page, limit: f.limit };
    }),
  },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));
jest.mock('../../apps/api/lib/customer-loyalty', () => ({
  fetchMerchantLoyaltyStatus: jest.fn(async () => 'disabled'),
  fetchCustomerLoyaltySnapshot: jest.fn(async () => null),
}));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    success: (code: string, data: any) => ({ success: true, code, data }),
    error: (code: string) => ({ success: false, code }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/customers/[id]/orders/route';

const order = (id: number, status: string, totalAmount: number, outletId = 1, extra: Partial<Row> = {}): Row => ({
  id, customerId: 10, outletId, merchantId: 2, status, totalAmount, deletedAt: null, ...extra,
});

const call = async () => {
  const request: any = { url: 'http://localhost/api/customers/10/orders?page=1&limit=50' };
  return (await GET(request, { params: { id: '10' } })) as any;
};

const merchant = { user: { role: 'MERCHANT' }, userScope: { merchantId: 2 } };
const outletStaff = { user: { role: 'OUTLET_STAFF' }, userScope: { merchantId: 2, outletId: 1 } };

describe('#405 customer orders summary excludes cancelled orders from money', () => {
  beforeEach(() => {
    ctx = merchant;
    rows = [
      order(1, 'RESERVED', 100_000),
      order(2, 'PICKUPED', 200_000),
      order(3, 'RETURNED', 300_000),
      order(4, 'COMPLETED', 400_000),
      order(5, 'CANCELLED', 5_000_000),
      order(6, 'RETURNED', 999_000, 1, { deletedAt: new Date() }), // soft-deleted: never counted
      order(7, 'RETURNED', 777_000, 1, { customerId: 11 }), // other customer
    ];
  });

  it('sums only non-cancelled orders into summary.totalAmount', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalAmount).toBe(1_000_000);
  });

  it('keeps counting cancelled orders in summary.totalOrders, equal to total and the listed rows', async () => {
    const res = await call();
    const { summary, total, orders } = res.body.data;
    expect(summary.totalOrders).toBe(5);
    expect(total).toBe(5);
    expect(orders.map((o: any) => o.status)).toContain('CANCELLED');
  });

  it('returns 0 (a number) when every order is cancelled', async () => {
    rows = [order(1, 'CANCELLED', 250_000), order(2, 'CANCELLED', 80_000)];
    const res = await call();
    expect(res.body.data.summary).toEqual({ totalOrders: 2, totalAmount: 0 });
  });

  it('keeps the outlet scope for outlet staff and still excludes cancelled', async () => {
    ctx = outletStaff;
    rows.push(order(8, 'RETURNED', 50_000, 3), order(9, 'CANCELLED', 60_000, 3));
    const res = await call();
    expect(res.body.data.summary.totalAmount).toBe(1_000_000);
    expect(res.body.data.summary.totalOrders).toBe(5);
  });

  it('keeps field names and types', async () => {
    const res = await call();
    const { summary } = res.body.data;
    expect(Object.keys(summary).sort()).toEqual(['totalAmount', 'totalOrders']);
    expect(typeof summary.totalAmount).toBe('number');
    expect(Number.isInteger(summary.totalOrders)).toBe(true);
  });
});
