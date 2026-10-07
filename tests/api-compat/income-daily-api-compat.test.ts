/**
 * GET /api/analytics/income/daily — installed apps keep working after the dev → main-real release.
 *
 * `golden/income-daily-main-real.json` holds the responses of `origin/main-real` (the code installed
 * apps use today) for the scenarios in `income-scenarios.ts` (see `generate-golden-income-daily.ts`).
 * Today's code must return the same JSON, field for field. Allowed differences, each an intended change:
 *
 * - #355 (PR #381) Vietnam days: events are listed on their Vietnam civil day, and `startDate`/`endDate`
 *   name Vietnam days (was UTC days). Only events between 00:00 and 07:00 Vietnam move. Checked on the
 *   edge shop, line by line, against the old response.
 * - #355 (PR #381) an unparseable date answers 400 `INVALID_DATE_FORMAT` (was 422 `BUSINESS_RULE_VIOLATION`,
 *   from a RangeError while logging). Old apps only send `yyyy-MM-dd`.
 * - #484 (PR #485) the return event counts the late fee (`lateFee`), like the damage fee.
 * - Added fields: none. (#355 also added the optional `timeZone` query param; old apps do not send it.)
 *
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/income-daily-main-real.json';
import { NOW, runDailyScenarios, EDGE_LATE_FEES } from './income-scenarios';
import { freezeClock } from './load-route';
import { entriesOf, notOnlyNow, oldEntriesMovedToVietnamDays, onlyNow, paths, withoutAdded } from './income-compat';

/** Field paths (array indexes as []) added since main-real; nothing else may appear or disappear */
const ADDED_FIELDS: RegExp[] = [];
const isAdded = (path: string) => ADDED_FIELDS.some((re) => re.test(path));

/** Scenarios whose answer changes on purpose; checked one by one below */
const INTENDED = ['dailyBadDate', 'edgeDailyWeek'];

let now: Record<string, any>;
const before = golden as Record<string, any>;
const unchanged = Object.keys(golden).filter((name) => !INTENDED.includes(name));

beforeAll(async () => {
  freezeClock(NOW);
  now = await runDailyScenarios();
});
afterAll(() => jest.useRealTimers());

describe('every field an installed app reads is unchanged', () => {
  it('covers the same scenarios as the golden file', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
  });

  it.each(unchanged)('%s: same status, fields, values and types as main-real', (scenario) => {
    expect(withoutAdded(now[scenario], isAdded, scenario)).toEqual(before[scenario]);
  });

  it.each(Object.keys(golden))('%s: no field removed or renamed', (scenario) => {
    const old = new Set(paths(before[scenario], scenario));
    const current = new Set(paths(now[scenario], scenario));
    if (scenario === 'dailyBadDate') return; // error body, compared below
    expect([...old].filter((p) => !current.has(p))).toEqual([]);
    expect([...current].filter((p) => !old.has(p) && !isAdded(p))).toEqual([]);
  });
});

describe('intended changes', () => {
  it('#355: an unparseable date is a 400 INVALID_DATE_FORMAT with the same error body shape', () => {
    expect(before.dailyBadDate.status).toBe(422);
    expect(now.dailyBadDate.status).toBe(400);
    expect(now.dailyBadDate.body.code).toBe('INVALID_DATE_FORMAT');
    expect(Object.keys(now.dailyBadDate.body).sort()).toEqual(Object.keys(before.dailyBadDate.body).sort());
  });

  it('edge shop: same top-level shape, every day and summary field still there', () => {
    expect(new Set(paths(now.edgeDailyWeek))).toEqual(new Set(paths(before.edgeDailyWeek)));
  });

  it('#355 + #484: each old line moves to its Vietnam day; the return line adds the late fee', () => {
    expect(notOnlyNow(now.edgeDailyWeek)).toEqual(oldEntriesMovedToVietnamDays(before.edgeDailyWeek, true));
  });

  it('#355: the sale at 00:30 Vietnam on 1 Oct now counts on 1 Oct', () => {
    expect(onlyNow(now.edgeDailyWeek).map((e) => [e.day, e.id, e.revenueType, e.revenue])).toEqual([
      ['2026/10/01', 35, 'SALE', 70000],
    ]);
  });

  it('day totals still add up to the listed lines, before and now', () => {
    for (const r of [before.edgeDailyWeek, now.edgeDailyWeek, before.dailyWeekPlan, now.dailyWeekPlan]) {
      for (const day of r.body.data.days) {
        expect([day.date, day.totalRevenue]).toEqual([day.date, day.orders.reduce((s: number, o: any) => s + o.revenue, 0)]);
      }
    }
  });

  it('period total = old total + late fees + the sale that moved in − the deposit that moved out', () => {
    const lateFees = Object.values(EDGE_LATE_FEES).reduce((s, v) => s + v, 0);
    const movedOut = entriesOf(before.edgeDailyWeek).filter((e) => e.id === 36).reduce((s, e) => s + e.revenue, 0);
    expect(movedOut).toBe(40000);
    expect(now.edgeDailyWeek.body.data.summary.totalRevenue).toBe(
      before.edgeDailyWeek.body.data.summary.totalRevenue + lateFees + 70000 - movedOut
    );
  });

  it('day-independent plan figures are unchanged', () => {
    const pick = (r: any) => {
      const { totalRevenuePlan, totalCollateralPlan, totalCollateralPlanExpectedToRefund } = r.body.data.summary;
      return { totalRevenuePlan, totalCollateralPlan, totalCollateralPlanExpectedToRefund };
    };
    expect(pick(now.edgeDailyWeek)).toEqual(pick(before.edgeDailyWeek));
  });
});
