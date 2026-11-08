/**
 * Revenue routes keep the exact same numbers and the exact same Prisma queries after the order-to-calculator
 * mapper and the event WHERE were moved into one shared place (issue #1199, refactor, no behaviour change).
 *
 * `golden/revenue-mapping-dev.json` was recorded from `origin/dev` BEFORE the refactor
 * (see `generate-golden-revenue-mapping.ts`). Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/revenue-mapping-dev.json';
import { NOW, runRevenueMappingScenarios } from './revenue-mapping-scenarios';
import { freezeClock } from './load-route';

let now: Record<string, any>;
const before = golden as Record<string, any>;

/**
 * #1199 adds, for deposit plans, one `OR` member `{ payments: { some } }` to every event WHERE and one query for the
 * RESERVED plan orders (`depositPlan` filter). Neither exists for an order without a plan: this takes both out of
 * the recorded queries so every other part of every query (and every response byte) is still compared to the golden.
 */
function withoutPlanQueries(scenario: Record<string, any>) {
  const strip = (value: any): any => {
    if (Array.isArray(value)) return value.filter((v) => !(v && typeof v === 'object' && 'payments' in v)).map(strip);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, strip(v)]));
    return value;
  };
  return {
    ...scenario,
    queries: scenario.queries
      .filter((q: any) => !(q.where && typeof q.where === 'object' && 'depositPlan' in q.where))
      .map((q: any) => strip(q)),
  };
}

/**
 * #1500 top customers and the dashboard also count a cancelled order that kept a fee: their query swaps
 * `status: { not: CANCELLED }` for `AND: [{ OR: [not cancelled, cancelKeptAmount > 0] }]` and the dashboard also selects
 * `cancelKeptAmount`. This puts the recorded old shape back so every other part is still compared to the golden.
 */
function withoutCancelFeeQuery(scenario: Record<string, any>) {
  const isCountsMarker = (v: any) => v && typeof v === 'object' && Array.isArray(v.OR) && v.OR.some((m: any) => m && m.cancelKeptAmount);
  const fix = (value: any): any => {
    if (Array.isArray(value)) return value.map(fix);
    if (value && typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (k === 'AND' && Array.isArray(v) && v.length === 1 && isCountsMarker(v[0])) {
          out.status = { not: 'CANCELLED' };
        } else if (k === 'cancelKeptAmount' && v === true) {
          continue;
        } else if (k === 'status' && v === undefined) {
          continue;
        } else {
          out[k] = fix(v);
        }
      }
      return out;
    }
    return value;
  };
  return { ...scenario, queries: scenario.queries.map(fix) };
}

beforeAll(async () => {
  freezeClock(NOW);
  now = await runRevenueMappingScenarios();
});
afterAll(() => jest.useRealTimers());

describe('revenue routes: same response and same queries as before the refactor', () => {
  it('covers the same scenarios as the golden file', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
  });

  it.each(Object.keys(golden))('%s: same status, body and Prisma where as before', (scenario) => {
    expect(withoutCancelFeeQuery(withoutPlanQueries(now[scenario]))).toEqual(before[scenario]);
  });

  it.each(Object.keys(golden))('%s: answered 200 (the scenario is not an error path)', (scenario) => {
    expect(now[scenario].response.status).toBe(200);
  });
});
