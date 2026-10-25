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
    expect(now[scenario]).toEqual(before[scenario]);
  });

  it.each(Object.keys(golden))('%s: answered 200 (the scenario is not an error path)', (scenario) => {
    expect(now[scenario].response.status).toBe(200);
  });
});
