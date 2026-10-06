/**
 * #518 — "Cho tạo đơn khi trùng lịch" (Merchant.allowOverlappingOrders = false).
 *
 * Pure rule (apps/api/lib/schedule-conflict.ts): on each Vietnam civil day of the rental,
 * booked(day) + requested > OutletStock.stock → conflict. Per-day peak, never a sum over the range.
 * Plus the #341 create guard hook and the edit helper's "no query unless needed" contract.
 *
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh; results must be identical.
 */
const mockTx: any = {
  $executeRaw: jest.fn(async () => 0),
  order: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  orderCreateKey: { findUnique: jest.fn(), upsert: jest.fn() },
};
jest.mock('../../packages/database/src/client', () => ({
  prisma: { $transaction: async (fn: any) => fn(mockTx) },
}));

import {
  findScheduleConflicts,
  isActiveRental,
  productsToRecheckOnEdit,
  scheduleWindowUtcBounds,
  sumRequestedByProduct,
  type ScheduleExistingOrder,
} from '../../apps/api/lib/schedule-conflict';
import {
  findEditScheduleConflicts,
  loadScheduleConflicts,
  merchantAllowsOverlappingOrders,
} from '../../apps/api/lib/schedule-conflict-check';
import { createOrderOnce } from '../../packages/database/src/order-create-guard';

/** Instant at `hour`:00 Vietnam time (UTC+7) on civil day `ymd`. */
function vn(ymd: string, hour = 9, minute = 0, second = 0): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute, second));
}

let nextId = 1;
function rental(
  orderNumber: string,
  pickup: Date,
  ret: Date,
  lines: Array<[number, number]>,
  extra: Partial<ScheduleExistingOrder> = {}
): ScheduleExistingOrder {
  return {
    id: nextId++,
    orderNumber,
    outletId: 1,
    orderType: 'RENT',
    status: 'RESERVED',
    deletedAt: null,
    pickupPlanAt: pickup,
    returnPlanAt: ret,
    orderItems: lines.map(([productId, quantity]) => ({ productId, quantity })),
    ...extra,
  };
}

function check(input: {
  stock: number;
  existing: ScheduleExistingOrder[];
  pickup: Date;
  ret: Date;
  items?: Array<{ productId: number; quantity: number; productName?: string }>;
  excludeOrderId?: number;
  outletId?: number;
}) {
  return findScheduleConflicts({
    outletId: input.outletId ?? 1,
    pickupPlanAt: input.pickup,
    returnPlanAt: input.ret,
    items: input.items ?? [{ productId: 11, quantity: 1, productName: 'Áo dài đỏ' }],
    stockByProductId: { 11: input.stock },
    existingOrders: input.existing,
    excludeOrderId: input.excludeOrderId,
  });
}

describe('findScheduleConflicts (#518)', () => {
  it('uses the per-day peak, not the sum of every overlapping order across the range', () => {
    // Stock 2. A holds 10–11, B holds 12–13 (one unit each). Any single day has 1 booked.
    const existing = [
      rental('ORD-1-0001', vn('2026-09-10'), vn('2026-09-11', 18), [[11, 1]]),
      rental('ORD-1-0002', vn('2026-09-12'), vn('2026-09-13', 18), [[11, 1]]),
    ];
    // Range sum would be 1 + 1 + 1 = 3 > 2; the per-day peak is 1 + 1 = 2 <= 2 → allowed
    expect(check({ stock: 2, existing, pickup: vn('2026-09-10'), ret: vn('2026-09-13', 18) })).toEqual([]);
  });

  it('rejects only on the day where the holds stack up, and names the orders holding it', () => {
    const existing = [
      rental('ORD-1-0001', vn('2026-09-10'), vn('2026-09-12', 18), [[11, 1]]),
      rental('ORD-1-0002', vn('2026-09-11'), vn('2026-09-13', 18), [[11, 1]]),
      rental('ORD-1-0003', vn('2026-09-20'), vn('2026-09-21'), [[11, 1]]), // outside the window
    ];
    const conflicts = check({ stock: 2, existing, pickup: vn('2026-09-09'), ret: vn('2026-09-11', 20) });
    expect(conflicts).toEqual([
      {
        productId: 11,
        productName: 'Áo dài đỏ',
        requested: 1,
        available: 0,
        days: ['2026-09-11'],
        orderNumbers: ['ORD-1-0001', 'ORD-1-0002'],
      },
    ]);
    // The day before the stack is free
    expect(check({ stock: 2, existing, pickup: vn('2026-09-09'), ret: vn('2026-09-10', 20) })).toEqual([]);
  });

  it('a same-day rental (pickup = return) occupies that day, for the existing order and the new one', () => {
    const sameDay = vn('2026-09-15', 0); // stored at VN midnight, pickup = return
    const existing = [rental('ORD-1-0009', sameDay, sameDay, [[11, 1]])];
    const conflicts = check({ stock: 1, existing, pickup: vn('2026-09-15', 10), ret: vn('2026-09-15', 10) });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].days).toEqual(['2026-09-15']);
    expect(check({ stock: 1, existing, pickup: vn('2026-09-16', 10), ret: vn('2026-09-16', 10) })).toEqual([]);
  });

  it('VN midnight edge: 16:59:59Z is still the earlier VN day, 17:00:00Z is the next one', () => {
    // Returns 2026-09-14T16:59:59Z = 23:59:59 VN on the 14th → holds 14 only
    const lateReturn = rental('ORD-1-0010', vn('2026-09-13'), new Date('2026-09-14T16:59:59.000Z'), [[11, 1]]);
    const newPickup = new Date('2026-09-14T17:00:00.000Z'); // 00:00 VN on the 15th
    expect(check({ stock: 1, existing: [lateReturn], pickup: newPickup, ret: vn('2026-09-16') })).toEqual([]);

    // Returns 2026-09-14T17:00:00Z = 00:00 VN on the 15th → holds the 15th too
    const midnightReturn = rental('ORD-1-0011', vn('2026-09-13'), new Date('2026-09-14T17:00:00.000Z'), [[11, 1]]);
    const conflicts = check({ stock: 1, existing: [midnightReturn], pickup: newPickup, ret: vn('2026-09-16') });
    expect(conflicts[0].days).toEqual(['2026-09-15']);
  });

  it('never conflicts with the order being edited', () => {
    const own = rental('ORD-1-0020', vn('2026-09-10'), vn('2026-09-12'), [[11, 1]]);
    expect(check({ stock: 1, existing: [own], pickup: vn('2026-09-10'), ret: vn('2026-09-12') })).toHaveLength(1);
    expect(
      check({ stock: 1, existing: [own], pickup: vn('2026-09-10'), ret: vn('2026-09-12'), excludeOrderId: own.id })
    ).toEqual([]);
  });

  it('only active RENT orders at the same outlet, not deleted, hold stock', () => {
    const p = vn('2026-09-10');
    const r = vn('2026-09-12');
    const ignored = [
      rental('ORD-2-0001', p, r, [[11, 1]], { outletId: 2 }),
      rental('ORD-1-0031', p, r, [[11, 1]], { status: 'CANCELLED' }),
      rental('ORD-1-0032', p, r, [[11, 1]], { status: 'RETURNED' }),
      rental('ORD-1-0033', p, r, [[11, 1]], { orderType: 'SALE', status: 'RESERVED' }),
      rental('ORD-1-0034', p, r, [[11, 1]], { deletedAt: new Date() }),
      rental('ORD-1-0035', p, r, [[12, 5]]), // another product
      rental('ORD-1-0036', null as any, null as any, [[11, 1]]), // no dates
    ];
    expect(check({ stock: 1, existing: ignored, pickup: p, ret: r })).toEqual([]);

    const picked = rental('ORD-1-0037', p, r, [[11, 1]], { status: 'PICKUPED' });
    expect(check({ stock: 1, existing: [...ignored, picked], pickup: p, ret: r })[0].orderNumbers).toEqual(['ORD-1-0037']);
  });

  it('sums every line of the same product in the new order, and in the existing ones', () => {
    const existing = [rental('ORD-1-0040', vn('2026-09-10'), vn('2026-09-10'), [[11, 1]])];
    const twoLines = [
      { productId: 11, quantity: 1 },
      { productId: 11, quantity: 1 },
    ];
    expect(check({ stock: 3, existing, pickup: vn('2026-09-10'), ret: vn('2026-09-10'), items: twoLines })).toEqual([]);

    const three = [
      { productId: 11, quantity: 2 },
      { productId: 11, quantity: 1 },
    ];
    const conflicts = check({ stock: 3, existing, pickup: vn('2026-09-10'), ret: vn('2026-09-10'), items: three });
    expect(conflicts[0]).toEqual(expect.objectContaining({ requested: 3, available: 2 }));

    const splitHold = [rental('ORD-1-0041', vn('2026-09-10'), vn('2026-09-10'), [[11, 1], [11, 1]])];
    expect(check({ stock: 2, existing: splitHold, pickup: vn('2026-09-10'), ret: vn('2026-09-10') })).toHaveLength(1);
  });

  it('available is the fewest free units on any day of the window', () => {
    const existing = [
      rental('ORD-1-0050', vn('2026-09-10'), vn('2026-09-10'), [[11, 1]]),
      rental('ORD-1-0051', vn('2026-09-11'), vn('2026-09-11'), [[11, 3]]),
    ];
    const conflicts = check({ stock: 3, existing, pickup: vn('2026-09-10'), ret: vn('2026-09-11'), items: [{ productId: 11, quantity: 1 }] });
    expect(conflicts[0]).toEqual(expect.objectContaining({ available: 0, days: ['2026-09-11'], orderNumbers: ['ORD-1-0051'] }));
  });

  it('stock 0 or no stock row with no other order holding it is not a conflict (stock is not tracked)', () => {
    const conflicts = findScheduleConflicts({
      outletId: 1,
      pickupPlanAt: vn('2026-09-10'),
      returnPlanAt: vn('2026-09-10'),
      items: [{ productId: 99, quantity: 1 }],
      stockByProductId: new Map(),
      existingOrders: [],
    });
    expect(conflicts).toEqual([]);
  });

  it('no stock row but another order holds it that day: conflict', () => {
    const conflicts = findScheduleConflicts({
      outletId: 1,
      pickupPlanAt: vn('2026-09-10'),
      returnPlanAt: vn('2026-09-10'),
      items: [{ productId: 99, quantity: 1 }],
      stockByProductId: new Map(),
      existingOrders: [rental('ORD-1-0070', vn('2026-09-10'), vn('2026-09-11'), [[99, 1]])],
    });
    expect(conflicts).toEqual([
      { productId: 99, productName: null, requested: 1, available: 0, days: ['2026-09-10'], orderNumbers: ['ORD-1-0070'] },
    ]);
  });

  it('works across a month end and over a year-long range', () => {
    const existing = [rental('ORD-1-0060', vn('2026-09-30'), vn('2026-10-01'), [[11, 1]])];
    const monthEnd = check({ stock: 1, existing, pickup: vn('2026-09-29'), ret: vn('2026-10-02') });
    expect(monthEnd[0].days).toEqual(['2026-09-30', '2026-10-01']);
    const year = check({ stock: 1, existing, pickup: vn('2026-01-01'), ret: vn('2026-12-31') });
    expect(year[0].days).toEqual(['2026-09-30', '2026-10-01']);
  });

  it('limits the check to the given products', () => {
    const existing = [rental('ORD-1-0070', vn('2026-09-10'), vn('2026-09-10'), [[11, 1], [12, 1]])];
    const conflicts = findScheduleConflicts({
      outletId: 1,
      pickupPlanAt: vn('2026-09-10'),
      returnPlanAt: vn('2026-09-10'),
      items: [{ productId: 11, quantity: 1 }, { productId: 12, quantity: 1 }],
      stockByProductId: { 11: 1, 12: 1 },
      existingOrders: existing,
      productIds: [12],
    });
    expect(conflicts.map((c) => c.productId)).toEqual([12]);
  });

  it('SQL window bounds are VN midnights around the inclusive day range', () => {
    expect(scheduleWindowUtcBounds(vn('2026-09-10', 6), vn('2026-09-12', 23))).toEqual({
      start: new Date('2026-09-09T17:00:00.000Z'),
      end: new Date('2026-09-12T17:00:00.000Z'),
    });
  });

  it('helpers: active rental, summed quantities', () => {
    expect(isActiveRental('RENT', 'RESERVED')).toBe(true);
    expect(isActiveRental('RENT', 'PICKUPED')).toBe(true);
    expect(isActiveRental('RENT', 'RETURNED')).toBe(false);
    expect(isActiveRental('SALE', 'RESERVED')).toBe(false);
    expect(sumRequestedByProduct([{ productId: 1, quantity: 2 }, { productId: 1, quantity: 1 }, { productId: null, quantity: 4 }]))
      .toEqual(new Map([[1, { quantity: 3, productName: null }]]));
  });
});

describe('productsToRecheckOnEdit (#518)', () => {
  const base = {
    outletId: 1,
    pickupPlanAt: vn('2026-09-10'),
    returnPlanAt: vn('2026-09-12'),
    active: true,
    items: [{ productId: 11, quantity: 1 }, { productId: 12, quantity: 2 }],
  };

  it('nothing relevant changed (notes, status RESERVED → PICKUPED, same items) → no check', () => {
    expect(productsToRecheckOnEdit({ before: base, after: { ...base } })).toEqual([]);
  });

  it('a quantity decrease or removed line → no check', () => {
    expect(productsToRecheckOnEdit({ before: base, after: { ...base, items: [{ productId: 12, quantity: 1 }] } })).toEqual([]);
  });

  it('a grown quantity or a new product → only those products', () => {
    const items = [{ productId: 11, quantity: 2 }, { productId: 12, quantity: 2 }, { productId: 13, quantity: 1 }];
    expect(productsToRecheckOnEdit({ before: base, after: { ...base, items } })).toEqual([11, 13]);
  });

  it('new dates, another outlet, or becoming active again → every product', () => {
    expect(productsToRecheckOnEdit({ before: base, after: { ...base, returnPlanAt: vn('2026-09-13') } })).toEqual([11, 12]);
    expect(productsToRecheckOnEdit({ before: base, after: { ...base, outletId: 2 } })).toEqual([11, 12]);
    expect(productsToRecheckOnEdit({ before: { ...base, active: false }, after: base })).toEqual([11, 12]);
  });

  it('an order that ends up inactive or without dates → no check', () => {
    expect(productsToRecheckOnEdit({ before: base, after: { ...base, active: false, outletId: 2 } })).toEqual([]);
    expect(productsToRecheckOnEdit({ before: base, after: { ...base, pickupPlanAt: null } })).toEqual([]);
  });
});

describe('DB helpers (#518)', () => {
  function fakeClient(opts: { allow?: boolean | null; stock?: number; orders?: any[] } = {}) {
    return {
      merchant: {
        findUnique: jest.fn(async () =>
          opts.allow === null ? null : { allowOverlappingOrders: opts.allow ?? true }
        ),
      },
      outletStock: { findMany: jest.fn(async () => [{ productId: 11, stock: opts.stock ?? 1 }]) },
      order: { findMany: jest.fn(async () => opts.orders ?? []) },
      product: { findMany: jest.fn(async () => [{ id: 11, name: 'Áo dài đỏ' }]) },
    };
  }
  const existingOrder = {
    id: 5,
    orderType: 'RENT',
    status: 'RESERVED',
    outletId: 1,
    pickupPlanAt: vn('2026-09-10'),
    returnPlanAt: vn('2026-09-12'),
    orderItems: [{ productId: 11, quantity: 1, product: { name: 'Áo dài đỏ' } }],
  };
  const holder = rental('ORD-1-0100', vn('2026-09-13'), vn('2026-09-14'), [[11, 1]]);

  it('missing merchant or column reads as allowed; only an explicit false turns the check on', async () => {
    expect(await merchantAllowsOverlappingOrders(fakeClient({ allow: null }), 2)).toBe(true);
    expect(await merchantAllowsOverlappingOrders(fakeClient({ allow: true }), 2)).toBe(true);
    expect(await merchantAllowsOverlappingOrders(fakeClient({ allow: false }), 2)).toBe(false);
    expect(await merchantAllowsOverlappingOrders(fakeClient({ allow: false }), null)).toBe(true);
  });

  it('an edit that changes nothing relevant reads nothing (not even the setting)', async () => {
    const client = fakeClient({ allow: false });
    const resolveMerchantId = jest.fn(async () => 2);
    const conflicts = await findEditScheduleConflicts(client, {
      existingOrder,
      next: { status: 'PICKUPED', pickupPlanAt: vn('2026-09-10').toISOString() },
      resolveMerchantId,
    });
    expect(conflicts).toEqual([]);
    expect(resolveMerchantId).not.toHaveBeenCalled();
    expect(client.merchant.findUnique).not.toHaveBeenCalled();
    expect(client.order.findMany).not.toHaveBeenCalled();
  });

  it('setting ON: a date edit reads the setting only, no stock or order query', async () => {
    const client = fakeClient({ allow: true, orders: [holder] });
    const conflicts = await findEditScheduleConflicts(client, {
      existingOrder,
      next: { returnPlanAt: vn('2026-09-14').toISOString() },
      resolveMerchantId: async () => 2,
    });
    expect(conflicts).toEqual([]);
    expect(client.merchant.findUnique).toHaveBeenCalledTimes(1);
    expect(client.outletStock.findMany).not.toHaveBeenCalled();
    expect(client.order.findMany).not.toHaveBeenCalled();
  });

  it('setting OFF: a date edit into a held day is a conflict; the query excludes the order and its outlet is scoped', async () => {
    const client = fakeClient({ allow: false, orders: [holder] });
    const conflicts = await findEditScheduleConflicts(client, {
      existingOrder,
      next: { returnPlanAt: vn('2026-09-14').toISOString() },
      resolveMerchantId: async () => 2,
    });
    expect(conflicts).toEqual([
      expect.objectContaining({ productId: 11, productName: 'Áo dài đỏ', days: ['2026-09-13', '2026-09-14'], orderNumbers: ['ORD-1-0100'] }),
    ]);
    const where = client.order.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        outletId: 1,
        orderType: 'RENT',
        status: { in: ['RESERVED', 'PICKUPED'] },
        deletedAt: null,
        id: { not: 5 },
        pickupPlanAt: { lt: new Date('2026-09-14T17:00:00.000Z') },
        returnPlanAt: { gte: new Date('2026-09-09T17:00:00.000Z') },
      })
    );
    expect(client.product.findMany).not.toHaveBeenCalled(); // name known from the order's lines
  });

  it('loadScheduleConflicts: nothing to check → no query; unknown names are looked up only on conflict', async () => {
    const client = fakeClient({ orders: [rental('ORD-1-0101', vn('2026-09-10'), vn('2026-09-10'), [[11, 1]])] });
    expect(await loadScheduleConflicts(client, { outletId: 1, pickupPlanAt: null, returnPlanAt: vn('2026-09-10'), items: [{ productId: 11, quantity: 1 }] })).toEqual([]);
    expect(client.order.findMany).not.toHaveBeenCalled();
    const conflicts = await loadScheduleConflicts(client, {
      outletId: 1,
      pickupPlanAt: vn('2026-09-10'),
      returnPlanAt: vn('2026-09-10'),
      items: [{ productId: 11, quantity: 1 }],
    });
    expect(conflicts[0].productName).toBe('Áo dài đỏ');
    expect(client.product.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('createOrderOnce beforeInsert hook (#518 + #341)', () => {
  const guard = { outletId: 1, customerId: 3, createdById: 7, orderType: 'RENT', totalAmount: 100, items: [{ productId: 11, quantity: 1 }] };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.order.findMany.mockResolvedValue([]);
    mockTx.order.create.mockImplementation(async ({ data }: any) => ({ id: 900, ...data }));
  });

  it('a non-null hook result cancels the insert and comes back as `blocked`', async () => {
    const result = await createOrderOnce(guard, { orderNumber: 'X' }, {}, undefined, {
      beforeInsert: async () => [{ productId: 11 }],
    });
    expect(result).toEqual({ order: null, replay: false, blocked: [{ productId: 11 }] });
    expect(mockTx.order.create).not.toHaveBeenCalled();
  });

  it('a retried create replays its existing order and never reaches the hook', async () => {
    mockTx.order.findMany.mockResolvedValue([{ id: 800, orderItems: [{ productId: 11, quantity: 1 }] }]);
    const hook = jest.fn(async () => ['would block']);
    const result = await createOrderOnce(guard, { orderNumber: 'X' }, {}, undefined, { beforeInsert: hook });
    expect(result).toEqual({ order: expect.objectContaining({ id: 800 }), replay: true });
    expect(hook).not.toHaveBeenCalled();
  });

  it('a null hook result (or no hook) inserts as before', async () => {
    const hook = jest.fn(async () => null);
    expect(await createOrderOnce(guard, { orderNumber: 'X' }, {}, undefined, { beforeInsert: hook })).toEqual({
      order: expect.objectContaining({ id: 900 }),
      replay: false,
    });
    expect(hook).toHaveBeenCalledWith(mockTx);
    expect(await createOrderOnce(guard, { orderNumber: 'Y' }, {})).toEqual({ order: expect.objectContaining({ id: 900 }), replay: false });
  });
});
