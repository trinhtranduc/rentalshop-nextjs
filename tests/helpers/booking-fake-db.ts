/**
 * #1124 — an in-memory Prisma fake for the booking request routes. Only the calls those routes make: flat `where`
 * objects with equality, `in`, `gte`, `gt`, `lt`, `not`; `include: { items: true }`; `groupBy` on status.
 */
type Row = Record<string, any>;

export function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([field, cond]) => {
    if (cond === undefined) return true;
    const value = row[field];
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('in' in cond && !cond.in.includes(value)) return false;
      if ('gte' in cond && !(value >= cond.gte)) return false;
      if ('gt' in cond && !(value > cond.gt)) return false;
      if ('lt' in cond && !(value < cond.lt)) return false;
      if ('not' in cond && value === cond.not) return false;
      if ('some' in cond) return true; // order.orderItems.some — filtered by the order fixtures themselves
      return true;
    }
    if (cond === null) return value === null || value === undefined;
    return value === cond;
  });
}

export interface BookingStore {
  merchants: Row[];
  outlets: Row[];
  products: Row[];
  stocks: Row[];
  orders: Row[]; // { outletId, productId, quantity, pickupPlanAt, returnPlanAt, status, orderType }
  requests: Row[];
  items: Row[];
  customers: Row[];
  nextId: number;
}

export function emptyStore(): BookingStore {
  return { merchants: [], outlets: [], products: [], stocks: [], orders: [], requests: [], items: [], customers: [], nextId: 100 };
}

function withItems(store: BookingStore, r: Row | undefined, include?: Row) {
  if (!r) return null;
  return include?.items ? { ...r, items: store.items.filter((i) => i.requestId === r.id) } : { ...r };
}

export function fakePrisma(store: BookingStore): any {
  const client: any = {
    merchant: {
      findUnique: jest.fn(async ({ where }: any) => store.merchants.find((m) => m.id === where.id) ?? null),
    },
    outlet: {
      findFirst: jest.fn(async ({ where }: any) => store.outlets.find((o) => matches(o, where)) ?? null),
      findUnique: jest.fn(async ({ where }: any) => store.outlets.find((o) => o.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any = {}) => store.outlets.filter((o) => matches(o, where))),
    },
    product: {
      findMany: jest.fn(async ({ where }: any = {}) => store.products.filter((p) => matches(p, where))),
    },
    outletStock: {
      findFirst: jest.fn(async ({ where }: any) => store.stocks.find((s) => matches(s, where)) ?? null),
    },
    order: {
      // Rental orders overlapping the asked window for one product: the route filters by outlet, status and
      // dates; the fixtures carry productId + quantity flat, returned in the route's select shape.
      findMany: jest.fn(async ({ where }: any) => {
        const productId = where?.orderItems?.some?.productId;
        return store.orders
          .filter((o) => o.outletId === where.outletId && (!productId || o.productId === productId))
          .filter((o) => (where.status?.in ?? ['RESERVED', 'PICKUPED']).includes(o.status))
          .filter((o) => !where.pickupPlanAt?.lt || o.pickupPlanAt < where.pickupPlanAt.lt)
          .filter((o) => !where.returnPlanAt?.gte || o.returnPlanAt >= where.returnPlanAt.gte)
          .map((o) => ({ pickupPlanAt: o.pickupPlanAt, returnPlanAt: o.returnPlanAt, orderItems: [{ quantity: o.quantity }] }));
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const o = store.orders.find((x) => x.id === where.id);
        return o ? { id: o.id, orderNumber: o.orderNumber } : null;
      }),
    },
    bookingRequest: {
      count: jest.fn(async ({ where }: any = {}) => store.requests.filter((r) => matches(r, where)).length),
      create: jest.fn(async ({ data, include }: any) => {
        if (store.requests.some((r) => r.code === data.code)) {
          const err: any = new Error('Unique constraint failed on the fields: (`code`)');
          err.code = 'P2002';
          throw err;
        }
        const { items, ...rest } = data;
        const row = { id: store.nextId++, createdAt: new Date(), updatedAt: new Date(), status: 'PENDING', orderId: null, ...rest };
        store.requests.push(row);
        for (const it of items?.create ?? []) store.items.push({ id: store.nextId++, requestId: row.id, ...it });
        return withItems(store, row, include);
      }),
      findUnique: jest.fn(async ({ where, include }: any) =>
        withItems(store, store.requests.find((r) => (where.id != null ? r.id === where.id : r.code === where.code)), include)),
      findFirst: jest.fn(async ({ where, include }: any) => withItems(store, store.requests.find((r) => matches(r, where)), include)),
      findMany: jest.fn(async ({ where, skip = 0, take, include }: any = {}) => {
        const rows = store.requests
          .filter((r) => matches(r, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
          .slice(skip, take ? skip + take : undefined);
        return rows.map((r) => withItems(store, r, include));
      }),
      groupBy: jest.fn(async ({ where }: any) => {
        const counts = new Map<string, number>();
        for (const r of store.requests.filter((x) => matches(x, where))) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
        return [...counts.entries()].map(([status, n]) => ({ status, _count: { _all: n } }));
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const rows = store.requests.filter((r) => matches(r, where));
        rows.forEach((r) => Object.assign(r, data, { updatedAt: new Date() }));
        return { count: rows.length };
      }),
    },
    customer: {
      findFirst: jest.fn(async ({ where }: any) => store.customers.find((c) => matches(c, where)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: store.nextId++, deletedAt: null, ...data };
        store.customers.push(row);
        return row;
      }),
    },
  };
  client.$transaction = jest.fn(async (fn: any) => fn(client));
  return client;
}

/** A shop with booking on, two outlets (one not taking requests), two products and stock */
export function seedShop(store: BookingStore, overrides: { enabled?: boolean } = {}) {
  store.merchants.push({ id: 2, name: 'Linh Phương Beauty', tenantKey: 'linhphuong', isActive: true, onlineBookingEnabled: overrides.enabled ?? true, phone: '0909000111' });
  store.merchants.push({ id: 9, name: 'Other shop', tenantKey: 'other', isActive: true, onlineBookingEnabled: true });
  store.outlets.push({ id: 3, merchantId: 2, name: 'Thủ Đức', isActive: true, acceptsOnlineBooking: true });
  store.outlets.push({ id: 4, merchantId: 2, name: 'Quận 1', isActive: true, acceptsOnlineBooking: false });
  store.outlets.push({ id: 8, merchantId: 9, name: 'Other', isActive: true, acceptsOnlineBooking: true });
  store.products.push({ id: 11, merchantId: 2, name: 'Áo dài gấm đỏ', rentPrice: 250000, isActive: true, deletedAt: null });
  store.products.push({ id: 12, merchantId: 2, name: 'Khăn đóng nam', rentPrice: 30000, isActive: true, deletedAt: null });
  store.products.push({ id: 81, merchantId: 9, name: 'Other product', rentPrice: 1, isActive: true, deletedAt: null });
  store.stocks.push({ productId: 11, outletId: 3, stock: 2 });
  store.stocks.push({ productId: 12, outletId: 3, stock: 1 });
}

export const nextResponseMock = () => ({
  NextRequest: jest.fn(),
  NextResponse: Object.assign(
    jest.fn((body: any, init?: any) => ({ body, status: init?.status || 200 })),
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
  ),
});

export const utilsMock = () => ({
  ResponseBuilder: {
    success: (code: string, data?: any) => ({ success: true, code, message: code, data }),
    error: (code: string, error?: any) => ({ success: false, code, message: code, error: error ?? code }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, code: 'INTERNAL', message: String(e) }, statusCode: 500 }),
});

export function jsonRequest(url: string, body?: any, headers: Record<string, string> = {}): any {
  const h: Record<string, string> = { 'content-type': 'application/json', ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) };
  return { url, method: body ? 'POST' : 'GET', headers: { get: (k: string) => h[k.toLowerCase()] ?? null }, json: async () => body };
}
