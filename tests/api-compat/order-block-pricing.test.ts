/**
 * #1189 POST /api/orders with a day-block product, on the real route and the real `db.orders` over an in-memory table
 * (same harness as the order-create golden). Pickup 10/10 02:00Z .. return 12/10 02:00Z = 3 Vietnam days.
 *
 * Old apps (no `X-Client-Capabilities: block-pricing`):
 * - old iOS adds the BLOCK product at $0 as a FIXED line without option id (e2e-old-app-baseline.md row 12-13);
 * - old Android sends the day-1 price 80.000 for any number of days, FIXED, rentalDays 1.
 * The server prices both from the table. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { AUTH, createDb, createOrderTable, NOW, RENT_BODY } from './order-create-scenarios';
import { freezeClock, loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

const CAP = { 'X-Client-Capabilities': 'block-pricing' };
const IOS_OLD_LINE = { productId: 13, quantity: 1, unitPrice: 0, totalPrice: 0, deposit: 0, pricingType: 'FIXED' };
const ANDROID_OLD_LINE = { productId: 13, quantity: 1, unitPrice: 80000, totalPrice: 80000, deposit: 0, pricingType: 'FIXED', rentDays: 1 };
const body = (lines: any[], extra: Record<string, unknown> = {}) => ({ ...RENT_BODY, orderItems: lines, totalAmount: 0, ...extra });

async function post(
  payload: any,
  opts: { headers?: Record<string, string>; settings?: unknown; currency?: string; twice?: boolean } = {}
) {
  const holder: StoreHolder = { db: null, prisma: null };
  return quietly(async () => {
    const table = createOrderTable();
    const { POST } = loadRoute('orders', holder, THIS_ROOT);
    (table.prisma as any).merchant = { findUnique: async () => ({ settings: opts.settings ?? null }) };
    holder.prisma = table.prisma;
    holder.db = createDb(THIS_ROOT, table.prisma, { currency: opts.currency ?? 'VND', timezone: 'Asia/Ho_Chi_Minh' });
    jest.setSystemTime(NOW);
    const first = await POST(request('/api/orders', { body: payload, headers: opts.headers ?? {} }), AUTH);
    const again = opts.twice ? await POST(request('/api/orders', { body: payload, headers: opts.headers ?? {} }), AUTH) : null;
    return { first, again, count: table.count() };
  });
}

beforeAll(() => freezeClock(NOW));
afterAll(() => jest.useRealTimers());

describe('old apps: the server prices the BLOCK line (default "recompute")', () => {
  it.each([
    ['old iOS ($0, FIXED, no option id)', IOS_OLD_LINE],
    ['old Android (day-1 price, FIXED, rentDays 1)', ANDROID_OLD_LINE],
    ['an app that echoes the option id', { ...ANDROID_OLD_LINE, pricingOptionId: 31 }],
  ])('%s: 3 days = 120.000, snapshot stored', async (_name, line) => {
    const { first } = await post(body([line]));
    expect(first.status).toBe(200);
    const data = first.body.data;
    expect(data.totalAmount).toBe(120000);
    const item = data.orderItems[0];
    expect(item).toMatchObject({ unitPrice: 120000, totalPrice: 120000, rentalDays: 3, pricingType: 'BLOCK', pricingOptionId: 31 });
    expect(item.pricingSnapshot).toMatchObject({
      type: 'BLOCK', tiers: [80000, 100000, 120000], days: 3, totalPrice: 120000, extraDays: 0, currency: 'VND',
    });
  });

  it('5 days: 160.000; quantity 2: 320.000', async () => {
    const dates = { pickupPlanAt: '2026-10-10T02:00:00.000Z', returnPlanAt: '2026-10-14T02:00:00.000Z' };
    const one = await post(body([ANDROID_OLD_LINE], dates));
    expect(one.first.body.data.totalAmount).toBe(160000);
    expect(one.first.body.data.orderItems[0].pricingSnapshot).toMatchObject({ days: 5, extraDays: 2, extraAmount: 40000 });
    const two = await post(body([{ ...ANDROID_OLD_LINE, quantity: 2, totalPrice: 160000 }], dates));
    expect(two.first.body.data.totalAmount).toBe(320000);
    expect(two.first.body.data.orderItems[0]).toMatchObject({ unitPrice: 160000, totalPrice: 320000 });
  });

  it('same-day pickup and return is 1 day = 80.000; 16:59:59Z / 17:00:00Z are two days', async () => {
    const same = await post(body([IOS_OLD_LINE], { pickupPlanAt: '2026-10-10T02:00:00.000Z', returnPlanAt: '2026-10-10T09:00:00.000Z' }));
    expect(same.first.body.data.totalAmount).toBe(80000);
    const edge = await post(body([IOS_OLD_LINE], { pickupPlanAt: '2026-10-10T16:59:59.000Z', returnPlanAt: '2026-10-10T17:00:00.000Z' }));
    expect(edge.first.body.data.totalAmount).toBe(100000);
  });

  it('a mixed order: other lines keep the app price, the discount applies after the rental total', async () => {
    const fixed = { productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000, deposit: 0 };
    const mixed = await post(body([IOS_OLD_LINE, fixed]));
    expect(mixed.first.body.data.totalAmount).toBe(270000);
    // 10 % of (120.000 + 150.000) = 27.000; the app computed 10 % of its own lines
    const pct = await post(body([IOS_OLD_LINE, fixed], { discountType: 'percentage', discountValue: 10, discountAmount: 15000 }));
    expect(pct.first.body.data).toMatchObject({ totalAmount: 243000, discountAmount: 27000, discountValue: 10 });
    const amount = await post(body([IOS_OLD_LINE], { discountType: 'amount', discountValue: 20000, discountAmount: 20000 }));
    expect(amount.first.body.data).toMatchObject({ totalAmount: 100000, discountAmount: 20000 });
  });

  it('a line that explicitly uses a DAILY option is not a BLOCK line', async () => {
    const { first } = await post(body([{ productId: 12, quantity: 1, unitPrice: 50000, totalPrice: 150000, rentDays: 3, pricingType: 'DAILY' }], { totalAmount: 150000 }));
    expect(first.body.data.totalAmount).toBe(150000);
    expect(first.body.data.orderItems[0].pricingSnapshot).toBeUndefined();
  });

  it('a SALE of a block product keeps the app price (blocks are for rentals)', async () => {
    const { first } = await post({ orderType: 'SALE', customerId: 101, totalAmount: 90000, orderItems: [{ productId: 13, quantity: 1, unitPrice: 90000, totalPrice: 90000 }] });
    expect(first.body.data.totalAmount).toBe(90000);
    expect(first.body.data.orderItems[0].pricingSnapshot).toBeUndefined();
  });

  it('USD shop: the unit price is kept to cents', async () => {
    const { first } = await post(body([IOS_OLD_LINE]), { currency: 'USD' });
    expect(first.body.data.totalAmount).toBe(120000);
  });

  it('#341: the same order sent twice is one order (the guard compares the computed total)', async () => {
    const { first, again, count } = await post(body([ANDROID_OLD_LINE]), { twice: true });
    expect(count).toBe(1);
    expect(again!.body.data.id).toBe(first.body.data.id);
    expect(again!.body.data.totalAmount).toBe(120000);
  });
});

describe('shop setting oldApps: "block" (400 PRICING_TYPE_REQUIRES_UPDATE)', () => {
  it('refuses the BLOCK line of an old app with an empty `error` and nothing stored', async () => {
    const { first, count } = await post(body([ANDROID_OLD_LINE]), { settings: { blockPricing: { oldApps: 'block' } } });
    expect(first.status).toBe(400);
    expect(first.body).toMatchObject({ success: false, code: 'PRICING_TYPE_REQUIRES_UPDATE', error: '' });
    expect(first.body.message).toBeTruthy();
    expect(count).toBe(0);
  });

  it('an order without a BLOCK line is not affected, nor a client that knows block-pricing', async () => {
    const plain = await post(body([{ productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000 }], { totalAmount: 150000 }), { settings: { blockPricing: { oldApps: 'block' } } });
    expect(plain.first.status).toBe(200);
    const capable = await post(body([{ ...ANDROID_OLD_LINE, unitPrice: 120000, totalPrice: 120000 }], { totalAmount: 120000 }), {
      settings: { blockPricing: { oldApps: 'block' } }, headers: CAP,
    });
    expect(capable.first.status).toBe(200);
  });

  it('an unknown value means "recompute"', async () => {
    const { first } = await post(body([ANDROID_OLD_LINE]), { settings: { blockPricing: { oldApps: 'whatever' } } });
    expect(first.body.data.totalAmount).toBe(120000);
  });
});

describe('clients with the block-pricing capability', () => {
  const right = { ...ANDROID_OLD_LINE, unitPrice: 120000, totalPrice: 120000, pricingOptionId: 31, pricingType: 'BLOCK' };

  it('a price that matches the table is accepted, the snapshot is stored', async () => {
    const { first } = await post(body([right], { totalAmount: 120000 }), { headers: CAP });
    expect(first.status).toBe(200);
    expect(first.body.data.totalAmount).toBe(120000);
    expect(first.body.data.orderItems[0].pricingSnapshot).toMatchObject({ type: 'BLOCK', days: 3, totalPrice: 120000 });
  });

  it('a wrong price is 400 BLOCK_PRICE_MISMATCH', async () => {
    const { first, count } = await post(body([{ ...right, unitPrice: 80000, totalPrice: 80000 }], { totalAmount: 80000 }), { headers: CAP });
    expect(first.status).toBe(400);
    expect(first.body.code).toBe('BLOCK_PRICE_MISMATCH');
    expect(count).toBe(0);
  });

  it('priceOverridden keeps the staff price and marks the snapshot', async () => {
    const { first } = await post(body([{ ...right, unitPrice: 100000, totalPrice: 100000, priceOverridden: true }], { totalAmount: 100000 }), { headers: CAP });
    expect(first.status).toBe(200);
    expect(first.body.data.totalAmount).toBe(100000);
    expect(first.body.data.orderItems[0]).toMatchObject({ totalPrice: 100000 });
    expect(first.body.data.orderItems[0].pricingSnapshot).toMatchObject({ overridden: true });
  });
});

describe('a client-sent pricingSnapshot is never stored', () => {
  it('POST ignores it (zod strips the key)', async () => {
    const { first } = await post(body([{ productId: 11, quantity: 1, unitPrice: 1, totalPrice: 1, pricingSnapshot: { type: 'BLOCK', tiers: [1] } }], { totalAmount: 1 }));
    expect(first.body.data.orderItems[0].pricingSnapshot).toBeUndefined();
  });
});
