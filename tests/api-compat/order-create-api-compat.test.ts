/**
 * POST /api/orders — installed apps keep working after the dev → main-real release.
 *
 * `golden/order-create-main-real.json` holds the responses of `origin/main-real` for the scenarios in
 * `order-create-scenarios.ts` (see `generate-golden-order-create.ts`): every response of every request,
 * and how many orders the table holds afterwards. Today's code must answer the same, field for field.
 * Allowed differences, each an intended change:
 *
 * - #341 (PR #453) one Save = one order: a second identical create without `Idempotency-Key` by the same
 *   staff within 60 s, or a create with an `Idempotency-Key` already used, returns the first order (same
 *   response, 200) instead of inserting a second one. main-real inserted a second order.
 * - #361 (PR #364) a SALE stores no `depositAmount` / `securityDeposit`, whatever the client sends.
 * - Added fields: none. (#341 also reads the optional `Idempotency-Key` header; old apps do not send it.)
 *
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/order-create-main-real.json';
import { NOW, runOrderCreateScenarios } from './order-create-scenarios';
import { freezeClock } from './load-route';
import { paths } from './income-compat';

/** #341 replays: the second request returns the first order (scenario → index of the replayed request) */
const REPLAYED: Record<string, number> = { sameOrderTwiceNoKey: 1, walkInTwiceNoKey: 1, sameKeyTwice: 1 };
/** #361: deposits a SALE no longer stores */
const SALE_DEPOSIT_DROPPED = ['saleWithDeposit'];

let now: Record<string, any>;
const before = golden as Record<string, any>;
const unchanged = Object.keys(golden).filter((n) => !(n in REPLAYED) && !SALE_DEPOSIT_DROPPED.includes(n));

/** Fields that identify one inserted row: they differ between a replayed order and a second insert */
const withoutRowIdentity = (data: any) => {
  const { id, orderNumber, createdAt, updatedAt, orderItems, ...rest } = data;
  return { ...rest, orderItems: orderItems.map(({ id: _id, ...item }: any) => item) };
};

beforeAll(async () => {
  freezeClock(NOW);
  now = await runOrderCreateScenarios();
});
afterAll(() => jest.useRealTimers());

describe('every field an installed app reads is unchanged', () => {
  it('covers the same scenarios as the golden file', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
  });

  it.each(unchanged)('%s: same responses and same number of orders as main-real', (scenario) => {
    expect(now[scenario]).toEqual(before[scenario]);
  });

  it.each(Object.keys(golden))('%s: no field removed, renamed or added', (scenario) => {
    expect(new Set(paths(now[scenario]))).toEqual(new Set(paths(before[scenario])));
  });

  it.each(Object.keys(REPLAYED))('%s: the first create answers exactly as on main-real', (scenario) => {
    expect(now[scenario].responses[0]).toEqual(before[scenario].responses[0]);
  });
});

describe('#341: one Save = one order', () => {
  it.each(Object.entries(REPLAYED))('%s: request %i returns the first order, nothing inserted', (scenario, i) => {
    const [first, again] = [now[scenario].responses[0], now[scenario].responses[i]];
    expect(again.status).toBe(200);
    expect(again).toEqual(first);
    expect(now[scenario].ordersInTable).toBe(1);
  });

  it.each(Object.entries(REPLAYED))('%s: main-real inserted a second order with the same content', (scenario, i) => {
    const [first, again] = [before[scenario].responses[0], before[scenario].responses[i]];
    expect(before[scenario].ordersInTable).toBe(2);
    expect(again.body.data.id).not.toBe(first.body.data.id);
    // Same body apart from the row identity: an old app reading the replay sees the order it just sent
    expect(withoutRowIdentity(now[scenario].responses[i].body.data)).toEqual(withoutRowIdentity(again.body.data));
    expect({ ...now[scenario].responses[i], body: { ...now[scenario].responses[i].body, data: null } }).toEqual({
      ...again,
      body: { ...again.body, data: null },
    });
  });

  it('two different Idempotency-Keys are two orders, even identical and a second apart', () => {
    const [a, b] = now.sameOrderDifferentKeys.responses;
    expect(now.sameOrderDifferentKeys.ordersInTable).toBe(2);
    expect(a.body.data.id).not.toBe(b.body.data.id);
  });

  it('without a key, the same order after 61 s, or other quantities within 60 s, are new orders', () => {
    expect(now.sameOrderAfterWindow.ordersInTable).toBe(2);
    expect(now.differentItemsNoKey.ordersInTable).toBe(2);
  });
});

describe('#361: a sale holds no deposit', () => {
  it('saleWithDeposit: same response except depositAmount and securityDeposit are 0', () => {
    const old = before.saleWithDeposit.responses[0];
    const current = now.saleWithDeposit.responses[0];
    expect([old.body.data.depositAmount, old.body.data.securityDeposit]).toEqual([50000, 100000]);
    expect(current).toEqual({
      ...old,
      body: { ...old.body, data: { ...old.body.data, depositAmount: 0, securityDeposit: 0 } },
    });
  });
});
