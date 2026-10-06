/**
 * Overview API compatibility (#492, #494): installed apps keep working.
 *
 * `golden/overview-before-492.json` holds the responses of the code before #492 (commit 852bd196^)
 * for the scenarios in `overview-scenarios.ts` (see `generate-golden.ts`). Today's code must return
 * every one of those fields with the same value and type; the only differences allowed are the new,
 * additive fields listed in ADDED_FIELDS. The new fields are then checked against hand-worked numbers.
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/overview-before-492.json';
import { NOW, runOverviewScenarios } from './overview-scenarios';
import { freezeClock, loadOverviewModules } from './load-overview-modules';

/** Field paths (array indexes as []) that #492 and #494 added; nothing else may appear or disappear */
const ADDED_FIELDS = [
  // GET /api/analytics/income/summary (and `operational` inside the period report)
  /^income\w+\.summary\.(collectedBreakdown|collateralFlow)(\.|$)/,
  /^period\w+\.operational\.(collectedBreakdown|collateralFlow)(\.|$)/,
  // GET /api/analytics/period and /overview
  /^period\w+\.revenue\.(collectedBreakdown|collateralFlow|outstandingBreakdown)(\.|$)/,
  /^period\w+\.growth\.orderValue(\.|$)/,
  // GET /api/analytics/outlet-operations (managers only)
  /^operations\w+\.cash\.(collateralToCollect|collateralToReturn)(\.|$)/,
];
const isAdded = (path: string) => ADDED_FIELDS.some((re) => re.test(path));

function paths(value: any, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  const entries = Array.isArray(value) ? value.map((v) => ['[]', v] as const) : Object.entries(value);
  const out = new Set<string>([prefix]);
  for (const [key, child] of entries) {
    for (const p of paths(child, prefix ? `${prefix}.${key}` : String(key))) out.add(p);
  }
  return [...out];
}

/** The response an old app sees: today's response with the added fields removed */
function withoutAddedFields(value: any, prefix = ''): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => withoutAddedFields(v, `${prefix}.[]`));
  const out: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!isAdded(path)) out[key] = withoutAddedFields(child, path);
  }
  return out;
}

let now: Record<string, any>;
const before = golden as Record<string, any>;

beforeAll(async () => {
  freezeClock(NOW);
  now = await runOverviewScenarios(loadOverviewModules());
});
afterAll(() => jest.useRealTimers());

describe('every field an installed app reads is unchanged', () => {
  it('covers the same scenarios as the golden file', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
  });

  it.each(Object.keys(golden))('%s: same fields, values and types as before #492', (scenario) => {
    expect(withoutAddedFields(now[scenario], scenario)).toEqual(before[scenario]);
  });

  it.each(Object.keys(golden))('%s: no field removed or renamed, only the listed fields added', (scenario) => {
    const old = new Set(paths(before[scenario], scenario));
    const current = new Set(paths(now[scenario], scenario));
    expect([...old].filter((p) => !current.has(p))).toEqual([]);
    expect([...current].filter((p) => !old.has(p) && !isAdded(p))).toEqual([]);
  });

  it('the added fields are really there (the allowlist is not hiding a missing field)', () => {
    expect(now.incomeSummaryWeek.summary.collectedBreakdown).toBeDefined();
    expect(now.incomeSummaryWeek.summary.collateralFlow).toBeDefined();
    expect(now.periodWeekByDay.revenue.collectedBreakdown).toBeDefined();
    expect(now.periodWeekByDay.revenue.collateralFlow).toBeDefined();
    expect(now.periodWeekByDay.revenue.outstandingBreakdown).toBeDefined();
    expect(now.periodWeekByDay.growth.orderValue).toBeDefined();
    expect(now.operationsManager.cash.collateralToCollect).toBeDefined();
    expect(now.operationsManager.cash.collateralToReturn).toBeDefined();
  });

  it('staff still get no cash block at all', () => {
    expect(now.operationsStaff.cash).toBeNull();
  });
});

describe('new fields add up with the old totals', () => {
  const summaries = () =>
    Object.entries(now).flatMap(([name, r]) => [
      ...(r.summary ? [[name, r.summary.totalCollected, r.summary.totalRevenue, r.summary.collectedBreakdown, r.summary.collateralFlow]] : []),
      ...(r.revenue ? [[name, r.revenue.collected, r.revenue.totalRevenue, r.revenue.collectedBreakdown, r.revenue.collateralFlow]] : []),
    ]) as [string, number, number, any, any][];

  it('collectedBreakdown sums to collected (deposits + pickupAndSale + fees - refunds)', () => {
    for (const [name, collected, , b] of summaries()) {
      expect([name, b.deposits + b.pickupAndSale + b.fees - b.refunds]).toEqual([name, collected]);
    }
  });

  it('collected + collateral received - returned = the old totalRevenue', () => {
    for (const [name, collected, totalRevenue, , flow] of summaries()) {
      expect(flow.received).toBeGreaterThanOrEqual(0);
      expect(flow.returned).toBeGreaterThanOrEqual(0);
      expect([name, collected + flow.received - flow.returned]).toEqual([name, totalRevenue]);
    }
  });

  it('outstandingBreakdown splits the old outstanding exactly', () => {
    for (const [name, r] of Object.entries(now)) {
      if (!r.revenue) continue;
      const { atPickup, overduePickup } = r.revenue.outstandingBreakdown;
      expect([name, atPickup.amount + overduePickup.amount]).toEqual([name, r.revenue.outstanding]);
    }
  });

  it('growth.orderValue.current is the old totalOrderValue', () => {
    for (const [name, r] of Object.entries(now)) {
      if (!r.revenue) continue;
      expect([name, r.growth.orderValue.current]).toEqual([name, r.revenue.totalOrderValue]);
    }
  });
});

describe('new fields, worked by hand (outlet 1, week 1–7 Oct, now = 6 Oct 12:00 Vietnam)', () => {
  it('collected money by source', () => {
    expect(now.periodWeekByDay.revenue.collectedBreakdown).toEqual({
      // deposits of orders created this week: #1 100k, #5 30k, #6 50k, #8 100k, #9 20k, #12 100k, #13 60k
      deposits: 460000,
      // balances at pickup: #1 200k, #2 200k, #3 200k, #4 150k, #5 150k, #13 200k; sale #10 120k
      pickupAndSale: 1220000,
      // #1 late 50k + damage 20k
      fees: 70000,
      // cancelled: #12 deposit 100k, #13 after pickup 260k
      refunds: 360000,
    });
  });

  it('collateral received and handed back', () => {
    // received: #1 1M, #3 2M, #4 300k (picked up 23:59:59 on 5 Oct), #13 400k; #2 picked up and returned the same day moves none
    // returned: #1 1M on return, #13 400k on cancel
    expect(now.periodWeekByDay.revenue.collateralFlow).toEqual({ received: 3700000, returned: 1400000 });
    expect(now.incomeSummaryWeek.summary.collateralFlow).toEqual({ received: 3700000, returned: 1400000 });
  });

  it('outstanding split at the start of today', () => {
    // still to collect at pickup: #6, #8, #9 (200k each); overdue pickup: no-show #7 150k
    expect(now.periodWeekByDay.revenue.outstandingBreakdown).toEqual({
      atPickup: { amount: 600000, orders: 3 },
      overduePickup: { amount: 150000, orders: 1 },
    });
  });

  it('order value growth against the previous 7 days', () => {
    // previous week (24–30 Sep): #3 400k, #11 80k, #14 350k, #17 400k
    expect(now.periodWeekByDay.growth.orderValue).toEqual({ current: 1870000, previous: 1230000, growth: 52.03 });
  });

  it('a one-day period uses Vietnam days: #8 created at 00:00 on 6 Oct is today, #5 is yesterday', () => {
    expect(now.periodTodayOnly.growth.orderValue).toEqual({ current: 300000, previous: 180000, growth: 66.67 });
  });

  it('no orders: every new field is zero, never missing', () => {
    const r = now.periodNoOrders;
    expect(r.revenue.collectedBreakdown).toEqual({ deposits: 0, pickupAndSale: 0, fees: 0, refunds: 0 });
    expect(r.revenue.collateralFlow).toEqual({ received: 0, returned: 0 });
    expect(r.revenue.outstandingBreakdown).toEqual({ atPickup: { amount: 0, orders: 0 }, overduePickup: { amount: 0, orders: 0 } });
    expect(r.growth.orderValue).toEqual({ current: 0, previous: 0, growth: 0 });
  });

  it('collateral to collect and to return, in scope and not deleted', () => {
    // to collect: RESERVED #6 700k, #7 1M, #9 400k, #17 500k; to return: PICKUPED #3 2M, #4 300k (#5 has none, #15 deleted)
    expect(now.operationsManager.cash.collateralToCollect).toEqual({ securityDeposit: 2600000, orders: 4 });
    expect(now.operationsManager.cash.collateralToReturn).toEqual({ securityDeposit: 2300000, orders: 2 });
    // outlet 2 adds #16 800k
    expect(now.operationsTwoOutlets.cash.collateralToReturn).toEqual({ securityDeposit: 3100000, orders: 3 });
    expect(now.operationsEmptyOutlet.cash.collateralToCollect).toEqual({ securityDeposit: 0, orders: 0 });
  });
});
