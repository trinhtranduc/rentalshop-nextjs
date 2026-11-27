/**
 * #1684 POST /api/orders on the real route and the real `db.orders` over an in-memory table (same harness as the order-create
 * golden). "Now" is 8 Oct 2026 12:00 in Vietnam. A client that sends `X-Client-Capabilities: no-past-orders` does not get a rental
 * for a Vietnam day before today; an installed app sends no capability and is served exactly as before (a past pickup is created).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { AUTH, createDb, createOrderTable, NOW, RENT_BODY } from './order-create-scenarios';
import { freezeClock, loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

const CAP = { 'X-Client-Capabilities': 'no-past-orders' };
const rent = (pickupPlanAt: string, returnPlanAt: string) => ({ ...RENT_BODY, pickupPlanAt, returnPlanAt });

async function post(payload: any, headers: Record<string, string> = {}) {
  const holder: StoreHolder = { db: null, prisma: null };
  return quietly(async () => {
    const table = createOrderTable();
    const { POST } = loadRoute('orders', holder, THIS_ROOT);
    (table.prisma as any).merchant = { findUnique: async () => ({ settings: null }) };
    holder.prisma = table.prisma;
    holder.db = createDb(THIS_ROOT, table.prisma, { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' });
    jest.setSystemTime(NOW);
    const res = await POST(request('/api/orders', { body: payload, headers }), AUTH);
    return { res, count: table.count() };
  });
}

beforeAll(() => freezeClock(NOW));
afterAll(() => jest.useRealTimers());

describe('a client with the no-past-orders capability', () => {
  it('a rental that starts yesterday (7 Oct) is refused: 400 PICKUP_DATE_IN_PAST, nothing is stored', async () => {
    const { res, count } = await post(rent('2026-10-07T02:00:00.000Z', '2026-10-09T02:00:00.000Z'), CAP);
    expect(res.status).toBe(400);
    expect(res.body.code ?? res.body.error?.code).toBe('PICKUP_DATE_IN_PAST');
    expect(count).toBe(0);
  });

  it.each([
    ['today, the hour has passed (8 Oct 00:30 VN = 7 Oct 17:30Z)', '2026-10-07T17:30:00.000Z'],
    ['today 12:00 VN (now)', '2026-10-08T05:00:00.000Z'],
    ['today 23:59 VN', '2026-10-08T16:59:00.000Z'],
    ['tomorrow', '2026-10-09T02:00:00.000Z'],
  ])('%s: created', async (_name, pickup) => {
    const { res, count } = await post(rent(pickup, '2026-10-12T02:00:00.000Z'), CAP);
    expect(res.status).toBe(200);
    expect(count).toBe(1);
  });

  it('yesterday 23:59 VN (7 Oct 16:59Z) is still yesterday: refused', async () => {
    const { res } = await post(rent('2026-10-07T16:59:00.000Z', '2026-10-09T02:00:00.000Z'), CAP);
    expect(res.status).toBe(400);
  });
});

describe('an installed app (no capability): nothing changes', () => {
  it.each([
    ['no header', {}],
    ['other capabilities only', { 'X-Client-Capabilities': 'installments,block-pricing,branch-listing' }],
  ])('%s: a rental that starts yesterday is created as before', async (_name, headers) => {
    const { res, count } = await post(rent('2026-10-07T02:00:00.000Z', '2026-10-09T02:00:00.000Z'), headers as Record<string, string>);
    expect(res.status).toBe(200);
    expect(count).toBe(1);
  });
});
