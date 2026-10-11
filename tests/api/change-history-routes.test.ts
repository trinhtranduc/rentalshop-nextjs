/**
 * #519 — GET /api/orders/:id/{history,changes} and /api/products/:id/{history,changes}:
 * merchant / outlet scope, /history shape unchanged, /changes shape, nothing private leaks.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

// Fake AuditLog store + orders/products. Order 5 is outlet 1 of merchant 2; order 6 is outlet 3 of
// merchant 2; order 8 belongs to merchant 99. Product 10 is merchant 2, product 20 merchant 99.
const orders: Record<number, any> = {
  5: { id: 5, outletId: 1, outlet: { merchantId: 2 } },
  6: { id: 6, outletId: 3, outlet: { merchantId: 2 } },
  8: { id: 8, outletId: 7, outlet: { merchantId: 99 } },
};
const products: Record<number, any> = { 10: { id: 10, merchantId: 2 }, 20: { id: 20, merchantId: 99 } };

const lan = { id: 9, email: 'lan@shop.vn', firstName: 'Lan', lastName: 'Nguyễn', role: 'OUTLET_STAFF' };
const owner = { id: 2, email: 'owner@shop.vn', firstName: 'Minh', lastName: 'Trần', role: 'MERCHANT' };

const orderSnap = (o: any) => ({ status: 'RESERVED', totalAmount: 1000000, depositAmount: 0, returnPlanAt: '2026-10-04T17:00:00.000Z', items: [], ...o });
let auditRows: any[] = [];

function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([k, v]) =>
    k === 'OR' ? (v as any[]).some((w) => matches(row, w)) : row[k] === v
  );
}
const mockPrisma = {
  order: { findUnique: jest.fn(async ({ where }: any) => orders[where.id] ?? null) },
  product: { findUnique: jest.fn(async ({ where }: any) => products[where.id] ?? null) },
  auditLog: {
    findMany: jest.fn(async ({ where, take, skip, select, include }: any) => {
      const rows = auditRows
        .filter((r) => matches(r, where))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
        .slice(skip ?? 0, (skip ?? 0) + (take ?? 50));
      if (select) {
        // /changes asks for name + role only
        return rows.map((r) => ({
          id: r.id,
          action: r.action,
          details: r.details,
          createdAt: r.createdAt,
          user: r.user ? { firstName: r.user.firstName, lastName: r.user.lastName, role: r.user.role } : null,
        }));
      }
      return rows; // /history (include: user with email, like the real logger)
    }),
    count: jest.fn(async ({ where }: any) => auditRows.filter((r) => matches(r, where)).length),
    findFirst: jest.fn(async ({ where }: any) => {
      const rows = auditRows.filter((r) => matches(r, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows[0] ? { createdAt: rows[0].createdAt } : null;
    }),
  },
};

jest.mock('@rentalshop/database', () => {
  const { AuditLogger } = jest.requireActual('../../packages/database/src/audit');
  const logger = new AuditLogger(mockPrisma);
  return { prisma: mockPrisma, getAuditLogger: () => logger };
});
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data?: any) => ({ success: true, code, message: code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', details: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  normalizeStartDate: (d: Date) => d,
  normalizeEndDate: (d: Date) => d,
}));

import { GET as orderHistory } from '../../apps/api/app/api/orders/[orderId]/history/route';
import { GET as orderChanges } from '../../apps/api/app/api/orders/[orderId]/changes/route';
import { GET as productHistory } from '../../apps/api/app/api/products/[id]/history/route';
import { GET as productChanges } from '../../apps/api/app/api/products/[id]/changes/route';

const merchantCtx = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
const outletAdmin1 = { user: { id: 9, role: 'OUTLET_ADMIN', merchantId: 2, outletId: 1 }, userScope: { merchantId: 2, outletId: 1 } };
// #670: outlet staff may not read change history at all
const staffOutlet1 = { user: { id: 9, role: 'OUTLET_STAFF', merchantId: 2, outletId: 1 }, userScope: { merchantId: 2, outletId: 1 } };
const adminCtx = { user: { id: 1, role: 'ADMIN' }, userScope: {} };

const req = (url: string): any => ({ url, headers: { get: () => null } });

function row(id: number, entityType: string, entityId: number, action: string, createdAt: string, details: any, user: any, outletId: number | null = null) {
  return {
    id,
    entityType,
    entityId: String(entityId),
    action,
    details: JSON.stringify(details),
    userId: user?.id ?? null,
    user,
    merchantId: 2,
    outletId,
    merchant: null,
    outlet: null,
    ipAddress: '203.0.113.9',
    userAgent: 'AnyRent/1.0',
    createdAt: new Date(createdAt),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  ctx = merchantCtx;
  auditRows = [
    row(1, 'Order', 5, 'CREATE', '2026-10-05T02:00:00Z', { newValues: orderSnap({}) }, owner),
    row(2, 'Order', 5, 'UPDATE', '2026-10-06T08:10:00Z', { oldValues: orderSnap({}), newValues: orderSnap({ status: 'PICKUPED' }) }, lan, 1),
    row(3, 'Order', 5, 'UPDATE', '2026-10-06T03:00:00Z', { oldValues: orderSnap({}), newValues: orderSnap({ depositAmount: 300000 }) }, owner),
    row(4, 'Order', 6, 'UPDATE', '2026-10-06T03:00:00Z', { oldValues: orderSnap({}), newValues: orderSnap({ depositAmount: 1 }) }, owner),
    // An old row: totals redacted, raw snapshot with customer email
    row(5, 'Order', 5, 'UPDATE', '2026-10-05T05:00:00Z', {
      oldValues: { totalAmount: '[REDACTED]', customerId: '[REDACTED]', customer: { email: 'khach@x.vn' }, notes: null, status: 'RESERVED' },
      newValues: { totalAmount: '[REDACTED]', customerId: '[REDACTED]', customer: { email: 'khach@x.vn' }, notes: 'gọi trước', status: 'RESERVED' },
    }, owner),
    row(10, 'Product', 10, 'UPDATE', '2026-10-06T04:00:00Z', {
      oldValues: { name: 'Áo', outletStock: [{ outletId: 1, outletName: 'Chi nhánh chính', stock: 3 }] },
      newValues: { name: 'Áo', outletStock: [{ outletId: 1, outletName: 'Chi nhánh chính', stock: 4 }] },
    }, lan, 1),
    row(11, 'Product', 10, 'UPDATE', '2026-10-06T05:00:00Z', {
      oldValues: { name: 'Áo', rentPrice: 350000 }, newValues: { name: 'Áo', rentPrice: 300000 },
    }, owner, null),
    // Stock change made in another outlet of the same shop
    row(12, 'Product', 10, 'UPDATE', '2026-10-06T03:00:00Z', {
      oldValues: { name: 'Áo', outletStock: [{ outletId: 3, outletName: 'Chi nhánh 2', stock: 2 }] },
      newValues: { name: 'Áo', outletStock: [{ outletId: 3, outletName: 'Chi nhánh 2', stock: 5 }] },
    }, owner, 3),
  ];
});

describe('GET /api/orders/:id/history scope (#519)', () => {
  it('404 for an order of another merchant, no audit read', async () => {
    const res: any = await orderHistory(req('http://x/api/orders/8/history'), { params: { orderId: '8' } });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ORDER_NOT_FOUND');
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('404 for an outlet admin on an order of another outlet of the same merchant', async () => {
    ctx = outletAdmin1;
    const res: any = await orderHistory(req('http://x/api/orders/6/history'), { params: { orderId: '6' } });
    expect(res.status).toBe(404);
  });

  it('404 for an order that does not exist', async () => {
    const res: any = await orderHistory(req('http://x/api/orders/404/history'), { params: { orderId: '404' } });
    expect(res.status).toBe(404);
  });

  it('keeps the old response shape for the owner (data = raw logs, pagination)', async () => {
    const res: any = await orderHistory(req('http://x/api/orders/5/history?limit=2'), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['data', 'pagination', 'success']);
    expect(res.body.pagination).toEqual({ total: 4, limit: 2, offset: 0, hasMore: true });
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['action', 'category', 'changes', 'createdAt', 'description', 'entityId', 'entityName', 'entityType', 'id',
        'ipAddress', 'merchant', 'merchantId', 'newValues', 'oldValues', 'outcome', 'outlet', 'outletId',
        'requestId', 'severity', 'user', 'userAgent'].sort()
    );
  });

  it('ADMIN reads any order; an outlet admin reads their own outlet', async () => {
    ctx = adminCtx;
    expect(((await orderHistory(req('http://x/api/orders/8/history'), { params: { orderId: '8' } })) as any).status).toBe(200);
    ctx = outletAdmin1;
    expect(((await orderHistory(req('http://x/api/orders/5/history'), { params: { orderId: '5' } })) as any).status).toBe(200);
  });
});

describe('GET /api/products/:id/history scope (#519)', () => {
  it('404 for a product of another merchant', async () => {
    const res: any = await productHistory(req('http://x/api/products/20/history'), { params: { id: '20' } });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('owner keeps the old shape', async () => {
    const res: any = await productHistory(req('http://x/api/products/10/history'), { params: { id: '10' } });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['data', 'pagination', 'success']);
    expect(res.body.data).toHaveLength(3);
  });
});

describe('GET /api/orders/:id/changes (#519)', () => {
  it('returns entries newest first with total and latestAt', async () => {
    const res: any = await orderChanges(req('http://x/api/orders/5/changes'), { params: { orderId: '5' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { entries, total, latestAt } = res.body.data;
    expect(total).toBe(4);
    expect(latestAt).toBe('2026-10-06T08:10:00.000Z');
    expect(entries.map((e: any) => [e.id, e.kind])).toEqual([
      [2, 'ORDER_PICKED_UP'],
      [3, 'ORDER_DEPOSIT'],
      [5, 'ORDER_NOTE'],
      [1, 'ORDER_CREATED'],
    ]);
    expect(entries[0]).toEqual({
      id: 2,
      at: '2026-10-06T08:10:00.000Z',
      kind: 'ORDER_PICKED_UP',
      actor: { name: 'Lan Nguyễn', role: 'OUTLET_STAFF' },
      changes: [{ field: 'status', from: 'RESERVED', to: 'PICKUPED' }],
      items: [],
    });
    expect(entries[2].note).toEqual({ text: 'gọi trước', imagesAdded: 0, imagesRemoved: 0 });
  });

  it('never returns emails, IPs, user agents or [REDACTED]', async () => {
    const res: any = await orderChanges(req('http://x/api/orders/5/changes'), { params: { orderId: '5' } });
    const text = JSON.stringify(res.body);
    for (const secret of ['@shop.vn', 'khach@x.vn', '203.0.113.9', 'AnyRent/1.0', 'REDACTED', 'email', 'ipAddress', 'userAgent']) {
      expect(text).not.toContain(secret);
    }
  });

  it('pages with limit/offset; latestAt stays the newest row', async () => {
    const res: any = await orderChanges(req('http://x/api/orders/5/changes?limit=1&offset=1'), { params: { orderId: '5' } });
    expect(res.body.data.entries.map((e: any) => e.id)).toEqual([3]);
    expect(res.body.data.total).toBe(4);
    expect(res.body.data.latestAt).toBe('2026-10-06T08:10:00.000Z');
  });

  it('empty history: total 0, latestAt null', async () => {
    auditRows = [];
    const res: any = await orderChanges(req('http://x/api/orders/5/changes'), { params: { orderId: '5' } });
    expect(res.body.data).toEqual({ entries: [], total: 0, latestAt: null });
  });

  it('400 on a bad limit or id, 404 on other merchant / other outlet', async () => {
    expect(((await orderChanges(req('http://x/api/orders/5/changes?limit=500'), { params: { orderId: '5' } })) as any).status).toBe(400);
    expect(((await orderChanges(req('http://x/api/orders/abc/changes'), { params: { orderId: 'abc' } })) as any).status).toBe(400);
    expect(((await orderChanges(req('http://x/api/orders/8/changes'), { params: { orderId: '8' } })) as any).status).toBe(404);
    ctx = outletAdmin1;
    expect(((await orderChanges(req('http://x/api/orders/6/changes'), { params: { orderId: '6' } })) as any).status).toBe(404);
    expect(((await orderChanges(req('http://x/api/orders/5/changes'), { params: { orderId: '5' } })) as any).status).toBe(200);
  });
});

describe('GET /api/products/:id/changes (#519)', () => {
  it('owner sees all rows', async () => {
    const res: any = await productChanges(req('http://x/api/products/10/changes'), { params: { id: '10' } });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.entries.map((e: any) => e.kind)).toEqual(['PRODUCT_PRICE', 'PRODUCT_STOCK', 'PRODUCT_STOCK']);
    expect(res.body.data.entries[1].changes).toEqual([{ field: 'stock.Chi nhánh chính', from: 3, to: 4 }]);
  });

  it('an outlet admin sees rows of their outlet and shop-level rows, never another outlet', async () => {
    ctx = outletAdmin1;
    const res: any = await productChanges(req('http://x/api/products/10/changes'), { params: { id: '10' } });
    expect(res.body.data.total).toBe(2);
    // 11: owner's price edit (no outlet) applies to every outlet; 12 (outlet 3) is hidden
    expect(res.body.data.entries.map((e: any) => e.id)).toEqual([11, 10]);
    expect(res.body.data.latestAt).toBe('2026-10-06T05:00:00.000Z');
  });

  it('404 for a product of another merchant', async () => {
    const res: any = await productChanges(req('http://x/api/products/20/changes'), { params: { id: '20' } });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('change history is for owners and outlet admins only (#670)', () => {
  it('403 FORBIDDEN for outlet staff on every history route, without reading audit rows', async () => {
    ctx = staffOutlet1;
    const calls: [string, any][] = [
      ['order history', await orderHistory(req('http://x/api/orders/5/history'), { params: { orderId: '5' } })],
      ['order changes', await orderChanges(req('http://x/api/orders/5/changes'), { params: { orderId: '5' } })],
      ['product history', await productHistory(req('http://x/api/products/10/history'), { params: { id: '10' } })],
      ['product changes', await productChanges(req('http://x/api/products/10/changes'), { params: { id: '10' } })],
    ];
    for (const [name, res] of calls) {
      expect([name, res.status, res.body.code]).toEqual([name, 403, 'FORBIDDEN']);
    }
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('owner and outlet admin still read it', async () => {
    ctx = outletAdmin1;
    expect(((await orderChanges(req('http://x/api/orders/5/changes'), { params: { orderId: '5' } })) as any).status).toBe(200);
    expect(((await productChanges(req('http://x/api/products/10/changes'), { params: { id: '10' } })) as any).status).toBe(200);
  });
});
