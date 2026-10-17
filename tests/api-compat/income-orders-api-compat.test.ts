/**
 * GET /api/analytics/income/orders — installed apps keep working after the dev → main-real release.
 *
 * `golden/income-orders-main-real.json` holds the responses of `origin/main-real` for the scenarios in
 * `income-scenarios.ts` (see `generate-golden-income-orders.ts`). Today's code must return the same JSON,
 * field for field, for every status filter, pagination, scope and error. Allowed differences, each an
 * intended change, checked on the edge shop line by line against the old response:
 *
 * - #355 (PR #381) Vietnam days: lines are listed on the Vietnam civil day of their event, and
 *   `startDate`/`endDate` name Vietnam days (was UTC days). Only events between 00:00 and 07:00 Vietnam move.
 * - #484 (PR #485) the return line counts the late fee (`lateFee`), like the damage fee.
 * - Added field (#721): `collateral` on every order line of `status=all`: the collateral part of the line's revenue.
 *   (#355 also added the optional `timeZone` query param; old apps do not send it.)
 * - Text only, listed in `TEXT_CHANGED` (status, `code`, `success`, data unchanged; checked against the catalog):
 *   #986/#987 `message`/`error` of `ordersMissingDate`, `ordersBadDate`, `ordersBadLimit`, `ordersStartAfterEnd`
 *   are the Vietnamese catalog sentence, as listed as intended in the PR #999 review; #1013 a success `message`
 *   is the catalog sentence of `INCOME_ORDERS_SUCCESS` (main-real sent the raw code, dev wrongly the error sentence).
 *
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/income-orders-main-real.json';
import { NOW, runIncomeOrdersScenarios } from './income-scenarios';
import { freezeClock } from './load-route';
import {
  expectCatalogTexts,
  notOnlyNow,
  oldEntriesMovedToVietnamDays,
  onlyNow,
  paths,
  withMainRealTexts,
  withoutAdded,
} from './income-compat';

/** Field paths (array indexes as []) added since main-real; nothing else may appear or disappear */
const ADDED_FIELDS: RegExp[] = [/\.orders\.\[\]\.collateral$/];
const isAdded = (path: string) => ADDED_FIELDS.some((re) => re.test(path));

/** Scenarios whose answer changes on purpose; checked one by one below */
const INTENDED = ['edgeOrdersAll', 'edgeOrdersNew'];

/** Scenarios whose `message` / `error` text alone changes on purpose (see header); every other field still equal */
const TEXT_CHANGED: Record<string, string> = {
  ordersAll: '#1013',
  ordersAllNoPlan: '#1013',
  ordersNew: '#1013',
  ordersPickup: '#1013',
  ordersReturn: '#1013',
  ordersCancelled: '#1013',
  ordersPage1: '#1013',
  ordersPage2: '#1013',
  ordersOutletAdmin: '#1013',
  ordersAdminAllShops: '#1013',
  ordersOneDay: '#1013',
  ordersMissingDate: '#986',
  ordersBadDate: '#986',
  ordersBadLimit: '#986',
  ordersStartAfterEnd: '#986',
};

let now: Record<string, any>;
const before = golden as Record<string, any>;
const unchanged = Object.keys(golden).filter((name) => !INTENDED.includes(name));

beforeAll(async () => {
  freezeClock(NOW);
  now = await runIncomeOrdersScenarios();
});
afterAll(() => jest.useRealTimers());

describe('every field an installed app reads is unchanged', () => {
  it('covers the same scenarios as the golden file', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
  });

  it.each(unchanged)('%s: same status, fields, values and types as main-real', (scenario) => {
    const current = withoutAdded(now[scenario], isAdded, scenario);
    expect(scenario in TEXT_CHANGED ? withMainRealTexts(current, before[scenario]) : current).toEqual(before[scenario]);
  });

  it.each(Object.keys(golden))('%s: no field removed or renamed', (scenario) => {
    const old = new Set(paths(before[scenario], scenario));
    const current = new Set(paths(now[scenario], scenario));
    expect([...old].filter((p) => !current.has(p))).toEqual([]);
    expect([...current].filter((p) => !old.has(p) && !isAdded(p))).toEqual([]);
  });
});

/** #721 `collateral` is an added field: lines are compared with the old response without it */
const withoutCollateral = (rows: any[]) => rows.map(({ collateral: _collateral, ...rest }) => rest);

describe('intended text changes', () => {
  it.each(Object.entries(TEXT_CHANGED))('%s (%s): message / error is the catalog sentence of its code', (scenario) => {
    expectCatalogTexts(now[scenario]);
  });

  it('#1013: a successful answer never says it failed (edge shop too)', () => {
    expectCatalogTexts(now.edgeOrdersAll);
    expectCatalogTexts(now.edgeOrdersNew);
  });
});

describe('intended changes (edge shop)', () => {
  it('#355 + #484 status=all: each old line moves to its Vietnam day; the return line adds the late fee', () => {
    expect(withoutCollateral(notOnlyNow(now.edgeOrdersAll))).toEqual(oldEntriesMovedToVietnamDays(before.edgeOrdersAll, true));
  });

  it('#355 status=new: created-on lines move to the Vietnam day of creation', () => {
    expect(notOnlyNow(now.edgeOrdersNew)).toEqual(oldEntriesMovedToVietnamDays(before.edgeOrdersNew, false));
  });

  it('#355: the sale at 00:30 Vietnam on 1 Oct now lists on 1 Oct', () => {
    expect(onlyNow(now.edgeOrdersAll).map((e) => [e.day, e.id, e.revenueType, e.revenue])).toEqual([
      ['2026/10/01', 35, 'SALE', 70000],
    ]);
    expect(onlyNow(now.edgeOrdersNew).map((e) => [e.day, e.id, e.revenueType, e.revenue])).toEqual([
      ['2026/10/01', 35, 'NEW', 0],
    ]);
  });

  it('worked by hand: what moved and what the late fee added', () => {
    const lines = (r: any) =>
      r.body.data.days.map((d: any) => [d.date, d.orders.map((o: any) => `${o.id}:${o.revenue}`).join(' ')]);
    // main-real (UTC days): E3 deposit on 2 Oct, E4 pickup on 4 Oct, E6 deposit on 7 Oct, no late fees
    expect(lines(before.edgeOrdersAll)).toEqual([
      ['2026/10/02', '31:650000 33:80000'],
      ['2026/10/04', '31:-490000 34:800000'],
      ['2026/10/06', '32:150000'],
      ['2026/10/07', '36:40000'],
    ]);
    // today (Vietnam days): E5 sale on 1 Oct, E3 on 3 Oct, E4 on 5 Oct, E6 gone (8 Oct);
    // E1 return 10k damage + 40k late − 500k collateral; E2 same-day 150k + 30k late
    expect(lines(now.edgeOrdersAll)).toEqual([
      ['2026/10/01', '35:70000'],
      ['2026/10/02', '31:650000'],
      ['2026/10/03', '33:80000'],
      ['2026/10/04', '31:-450000'],
      ['2026/10/05', '34:800000'],
      ['2026/10/06', '32:180000'],
    ]);
  });
});
