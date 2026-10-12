/**
 * #893 (additive) — GET /api/customers/{id}/orders adds `itemNames` (name, quantity) per order, so the apps
 * can show "Vest đen slim fit ×2, Cà vạt lụa" on a customer's order rows. Old fields keep their names and meaning.
 */
const searchCalls: any[] = [];
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
      searchCalls.push(f);
      return {
        data: hit.map((r) => ({
          ...r,
          createdAt: new Date('2026-10-01T03:00:00Z'),
          _count: { orderItems: 2 },
          // db.orders.search with includeItemNames: true (packages/database/src/order.ts)
          ...(f.includeItemNames
            ? { orderItems: [{ quantity: 2, product: { name: 'Vest đen slim fit' } }, { quantity: 1, product: null }] }
            : {}),
        })),
        total: hit.length, page: f.page, limit: f.limit,
      };
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

const order = (id: number, status: string, totalAmount: number): Row => ({
  id, customerId: 10, outletId: 1, merchantId: 2, status, totalAmount, deletedAt: null,
});

const call = async () => {
  const request: any = { url: 'http://localhost/api/customers/10/orders?page=1&limit=20' };
  return (await GET(request, { params: { id: '10' } })) as any;
};

describe('#893 customer orders carry item names', () => {
  beforeEach(() => {
    ctx = { user: { role: 'MERCHANT' }, userScope: { merchantId: 2 } };
    rows = [order(1, 'RESERVED', 100_000), order(2, 'RETURNED', 200_000)];
    searchCalls.length = 0;
  });

  it('asks the search for item names, bounded by the same page limit', async () => {
    await call();
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0].includeItemNames).toBe(true);
    expect(searchCalls[0].limit).toBe(20);
  });

  it('adds itemNames with productName and quantity; a missing product gives null', async () => {
    const res = await call();
    const [first] = res.body.data.orders;
    expect(first.itemNames).toEqual([
      { productName: 'Vest đen slim fit', quantity: 2 },
      { productName: null, quantity: 1 },
    ]);
  });

  it('never sends a partial `orderItems` (old iOS decodes OrderItem with required id/unitPrice/totalPrice)', async () => {
    const res = await call();
    for (const o of res.body.data.orders) expect(o).not.toHaveProperty('orderItems');
  });

  it('keeps the old fields and their meaning', async () => {
    const res = await call();
    const [first] = res.body.data.orders;
    expect(first.id).toBe(1);
    expect(first.status).toBe('RESERVED');
    expect(first.totalAmount).toBe(100_000);
    expect(first._count).toEqual({ orderItems: 2 });
    expect(first.createdAt).toBe('2026-10-01T03:00:00.000Z');
    expect(res.body.data.total).toBe(2);
  });
});
