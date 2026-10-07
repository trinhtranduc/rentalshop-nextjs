/**
 * Shared scenarios for the income API compatibility tests (release dev → main-real):
 * - GET /api/analytics/income/daily   (`income-daily-api-compat.test.ts`)
 * - GET /api/analytics/income/orders  (`income-orders-api-compat.test.ts`)
 *
 * Two in-memory shops, same week 1–7 Oct 2026, now = 8 Oct 2026 12:00 Vietnam:
 * - STABLE_ORDERS: every event between 10:00 and 17:00 Vietnam (03:00–10:00 UTC), so the UTC day and the
 *   Vietnam day are the same, and no late fee. Installed apps must get exactly the old response.
 * - EDGE_ORDERS: events just after Vietnam midnight (still the previous UTC day) and late fees. These are
 *   the intended changes of this release; the tests map the old response onto the new one rule by rule.
 *
 * The route handlers are loaded from a source tree (`load-route.ts`): this checkout, or `origin/main-real`
 * when the golden files are recorded.
 */
import { matchesWhere } from '../helpers/fake-order-store';
import { loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

/** "Now" for every scenario: 8 Oct 2026, 12:00 in Vietnam */
export const NOW = new Date('2026-10-08T05:00:00.000Z');

const at = (iso: string) => new Date(iso);
const OUTLETS: Record<number, { id: number; name: string; merchantId: number }> = {
  1: { id: 1, name: 'Cửa hàng 1', merchantId: 1 },
  2: { id: 2, name: 'Cửa hàng 2', merchantId: 1 },
  3: { id: 3, name: 'Shop khác', merchantId: 2 },
};

function order(id: number, fields: Record<string, any>) {
  const outletId = fields.outletId ?? 1;
  return {
    id,
    orderNumber: String(200000 + id),
    outletId,
    outlet: { id: outletId, name: OUTLETS[outletId].name },
    customerId: 100 + id,
    customer: { id: 100 + id, firstName: 'Khách', lastName: String(id), phone: `09000000${String(id).padStart(2, '0')}` },
    deletedAt: null,
    orderType: 'RENT',
    status: 'RESERVED',
    totalAmount: 0,
    depositAmount: 0,
    securityDeposit: 0,
    damageFee: 0,
    lateFee: 0,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    pickupPlanAt: null,
    returnPlanAt: null,
    pickedUpAt: null,
    returnedAt: null,
    ...fields,
    updatedAt: fields.updatedAt ?? fields.returnedAt ?? fields.pickedUpAt ?? fields.createdAt,
  };
}

/** Every event at 10:00–17:00 Vietnam, no late fee: the old and new code must agree on all of it */
export const STABLE_ORDERS = [
  // Returned on another day, with deposit, collateral and damage fee
  order(1, {
    status: 'RETURNED', totalAmount: 300000, depositAmount: 100000, securityDeposit: 1000000, damageFee: 20000,
    createdAt: at('2026-10-01T03:00:00.000Z'), pickupPlanAt: at('2026-10-02T03:00:00.000Z'), returnPlanAt: at('2026-10-04T03:00:00.000Z'),
    pickedUpAt: at('2026-10-02T03:00:00.000Z'), returnedAt: at('2026-10-04T04:00:00.000Z'),
  }),
  // Picked up and returned the same day
  order(2, {
    status: 'RETURNED', totalAmount: 200000, securityDeposit: 500000,
    createdAt: at('2026-10-01T04:00:00.000Z'), pickupPlanAt: at('2026-10-03T02:00:00.000Z'), returnPlanAt: at('2026-10-03T09:00:00.000Z'),
    pickedUpAt: at('2026-10-03T02:00:00.000Z'), returnedAt: at('2026-10-03T09:00:00.000Z'),
  }),
  // Created before the period, picked up in it, overdue now
  order(3, {
    status: 'PICKUPED', totalAmount: 400000, depositAmount: 200000, securityDeposit: 2000000,
    createdAt: at('2026-09-28T03:00:00.000Z'), pickupPlanAt: at('2026-10-01T03:00:00.000Z'), returnPlanAt: at('2026-10-04T03:00:00.000Z'),
    pickedUpAt: at('2026-10-01T03:00:00.000Z'),
  }),
  // Out on rent, due back after now (collateral to refund in the plan)
  order(4, {
    status: 'PICKUPED', totalAmount: 150000, securityDeposit: 300000,
    createdAt: at('2026-10-04T05:00:00.000Z'), pickupPlanAt: at('2026-10-05T08:00:00.000Z'), returnPlanAt: at('2026-10-08T08:00:00.000Z'),
    pickedUpAt: at('2026-10-05T08:00:00.000Z'),
  }),
  // Created and picked up the same day, due back inside the period
  order(5, {
    status: 'PICKUPED', totalAmount: 180000, depositAmount: 30000, securityDeposit: 250000,
    createdAt: at('2026-10-06T02:00:00.000Z'), pickupPlanAt: at('2026-10-06T03:00:00.000Z'), returnPlanAt: at('2026-10-07T05:00:00.000Z'),
    pickedUpAt: at('2026-10-06T03:00:00.000Z'),
  }),
  // Reserved, pickup day inside the period has passed (expected pickup)
  order(6, {
    totalAmount: 250000, depositAmount: 50000, securityDeposit: 700000,
    createdAt: at('2026-10-02T06:00:00.000Z'), pickupPlanAt: at('2026-10-06T09:00:00.000Z'), returnPlanAt: at('2026-10-09T09:00:00.000Z'),
  }),
  // Reserved, no deposit, pickup inside the period
  order(7, {
    totalAmount: 150000, securityDeposit: 1000000,
    createdAt: at('2026-10-03T07:00:00.000Z'), pickupPlanAt: at('2026-10-04T03:00:00.000Z'), returnPlanAt: at('2026-10-05T03:00:00.000Z'),
  }),
  // Reserved, pickup after now (revenue plan)
  order(8, {
    totalAmount: 300000, depositAmount: 100000,
    createdAt: at('2026-10-05T03:00:00.000Z'), pickupPlanAt: at('2026-10-09T02:00:00.000Z'), returnPlanAt: at('2026-10-10T02:00:00.000Z'),
  }),
  // Sales: one in the period, one before
  order(9, { orderType: 'SALE', status: 'COMPLETED', totalAmount: 120000, createdAt: at('2026-10-02T05:00:00.000Z') }),
  order(10, { orderType: 'SALE', status: 'COMPLETED', totalAmount: 80000, createdAt: at('2026-09-25T05:00:00.000Z') }),
  // Cancelled after paying the deposit
  order(11, {
    status: 'CANCELLED', totalAmount: 300000, depositAmount: 100000,
    createdAt: at('2026-10-01T08:00:00.000Z'), updatedAt: at('2026-10-03T08:00:00.000Z'),
    pickupPlanAt: at('2026-10-05T03:00:00.000Z'), returnPlanAt: at('2026-10-06T03:00:00.000Z'),
  }),
  // Cancelled after pickup, with collateral
  order(12, {
    status: 'CANCELLED', totalAmount: 260000, depositAmount: 60000, securityDeposit: 400000,
    createdAt: at('2026-10-01T09:00:00.000Z'), pickedUpAt: at('2026-10-02T09:00:00.000Z'), updatedAt: at('2026-10-05T09:00:00.000Z'),
    pickupPlanAt: at('2026-10-02T09:00:00.000Z'), returnPlanAt: at('2026-10-04T09:00:00.000Z'),
  }),
  // Deleted: never listed
  order(13, {
    status: 'PICKUPED', totalAmount: 999000, depositAmount: 99000, securityDeposit: 9990000, deletedAt: at('2026-10-03T03:00:00.000Z'),
    createdAt: at('2026-10-02T03:00:00.000Z'), pickupPlanAt: at('2026-10-02T03:00:00.000Z'), returnPlanAt: at('2026-10-04T03:00:00.000Z'),
    pickedUpAt: at('2026-10-02T03:00:00.000Z'),
  }),
  // Another outlet of the same shop
  order(14, {
    outletId: 2, status: 'PICKUPED', totalAmount: 500000, depositAmount: 100000, securityDeposit: 800000,
    createdAt: at('2026-10-02T03:00:00.000Z'), pickupPlanAt: at('2026-10-03T03:00:00.000Z'), returnPlanAt: at('2026-10-06T03:00:00.000Z'),
    pickedUpAt: at('2026-10-03T03:00:00.000Z'),
  }),
  // Returned with a damage fee larger than the collateral
  order(15, {
    status: 'RETURNED', totalAmount: 100000, damageFee: 50000,
    createdAt: at('2026-10-02T03:00:00.000Z'), pickupPlanAt: at('2026-10-03T04:00:00.000Z'), returnPlanAt: at('2026-10-05T04:00:00.000Z'),
    pickedUpAt: at('2026-10-03T04:00:00.000Z'), returnedAt: at('2026-10-05T04:00:00.000Z'),
  }),
  // Sale cancelled the next day
  order(16, {
    orderType: 'SALE', status: 'CANCELLED', totalAmount: 90000,
    createdAt: at('2026-10-03T03:00:00.000Z'), updatedAt: at('2026-10-04T03:00:00.000Z'),
  }),
  // Rent cancelled at creation (updatedAt = createdAt)
  order(17, {
    status: 'CANCELLED', totalAmount: 110000,
    createdAt: at('2026-10-04T06:00:00.000Z'), updatedAt: at('2026-10-04T06:00:00.000Z'),
    pickupPlanAt: at('2026-10-06T06:00:00.000Z'), returnPlanAt: at('2026-10-07T06:00:00.000Z'),
  }),
  // Another shop: never listed for merchant 1
  order(18, {
    outletId: 3, status: 'RETURNED', totalAmount: 700000, securityDeposit: 100000,
    createdAt: at('2026-10-02T03:00:00.000Z'), pickedUpAt: at('2026-10-03T03:00:00.000Z'), returnedAt: at('2026-10-05T03:00:00.000Z'),
    pickupPlanAt: at('2026-10-03T03:00:00.000Z'), returnPlanAt: at('2026-10-05T03:00:00.000Z'),
  }),
];

/**
 * The intended changes. Each order has one event of interest, on a day of its own, so it can be traced
 * from the old response to the new one.
 */
export const EDGE_ORDERS = [
  // E1 (#484): returned on another day with a late fee; the return event now counts the late fee
  order(31, {
    status: 'RETURNED', totalAmount: 200000, depositAmount: 50000, securityDeposit: 500000, damageFee: 10000, lateFee: 40000,
    createdAt: at('2026-09-29T03:00:00.000Z'), pickupPlanAt: at('2026-10-02T03:00:00.000Z'), returnPlanAt: at('2026-10-03T03:00:00.000Z'),
    pickedUpAt: at('2026-10-02T03:00:00.000Z'), returnedAt: at('2026-10-04T04:00:00.000Z'),
  }),
  // E2 (#484): picked up and returned the same day with a late fee
  order(32, {
    status: 'RETURNED', totalAmount: 150000, securityDeposit: 300000, lateFee: 30000,
    createdAt: at('2026-09-29T04:00:00.000Z'), pickupPlanAt: at('2026-10-06T02:00:00.000Z'), returnPlanAt: at('2026-10-06T05:00:00.000Z'),
    pickedUpAt: at('2026-10-06T02:00:00.000Z'), returnedAt: at('2026-10-06T09:00:00.000Z'),
  }),
  // E3 (#355): created at 00:30 Vietnam on 3 Oct (UTC: 2 Oct); deposit moves from 2 Oct to 3 Oct
  order(33, {
    totalAmount: 280000, depositAmount: 80000,
    createdAt: at('2026-10-02T17:30:00.000Z'), pickupPlanAt: at('2026-10-12T03:00:00.000Z'), returnPlanAt: at('2026-10-13T03:00:00.000Z'),
  }),
  // E4 (#355): picked up at 01:00 Vietnam on 5 Oct (UTC: 4 Oct); pickup moves from 4 Oct to 5 Oct
  order(34, {
    status: 'PICKUPED', totalAmount: 220000, depositAmount: 20000, securityDeposit: 600000,
    createdAt: at('2026-09-29T05:00:00.000Z'), pickupPlanAt: at('2026-10-05T03:00:00.000Z'), returnPlanAt: at('2026-10-12T03:00:00.000Z'),
    pickedUpAt: at('2026-10-04T18:00:00.000Z'),
  }),
  // E5 (#355): sale at 00:30 Vietnam on 1 Oct (UTC: 30 Sep); was outside 1–7 Oct, now on 1 Oct
  order(35, {
    orderType: 'SALE', status: 'COMPLETED', totalAmount: 70000, createdAt: at('2026-09-30T17:30:00.000Z'),
  }),
  // E6 (#355): created at 00:30 Vietnam on 8 Oct (UTC: 7 Oct); was on 7 Oct, now outside 1–7 Oct
  order(36, {
    totalAmount: 140000, depositAmount: 40000,
    createdAt: at('2026-10-07T17:30:00.000Z'), pickupPlanAt: at('2026-10-12T03:00:00.000Z'), returnPlanAt: at('2026-10-13T03:00:00.000Z'),
  }),
];

/** Late fee per edge order, and the edge orders whose event leaves / enters the 1–7 Oct window (#355) */
export const EDGE_LATE_FEES: Record<number, number> = { 31: 40000, 32: 30000 };
export const EDGE_ONLY_BEFORE = [36];
export const EDGE_ONLY_NOW = [35];

/** db + prisma over a list of orders, with the outlet / merchant lookups the income routes make */
export function createIncomeStore(orders: Record<string, any>[]): StoreHolder {
  const select = (args: any = {}) => {
    const rows = orders.filter((o) => matchesWhere(o, args.where));
    return (args.take ? rows.slice(0, args.take) : rows).map((r) => structuredClone(r));
  };
  const prisma = { order: { findMany: async (args: any) => select(args) } };
  const db = {
    outlets: { findById: async (id: number) => OUTLETS[id] ?? null },
    merchants: {
      findById: async (id: number) => ({
        id,
        outlets: Object.values(OUTLETS).filter((o) => o.merchantId === id).map((o) => ({ id: o.id, name: o.name })),
      }),
    },
  };
  return { db, prisma };
}

const MERCHANT = { user: { id: 1, email: 'merchant@test', role: 'MERCHANT' }, userScope: { merchantId: 1 } };
const OUTLET_ADMIN = { user: { id: 2, email: 'outlet@test', role: 'OUTLET_ADMIN' }, userScope: { merchantId: 1, outletId: 1 } };
const ADMIN = { user: { id: 3, email: 'admin@test', role: 'ADMIN' }, userScope: {} };

type Call = [store: 'stable' | 'edge', auth: typeof MERCHANT, query: string];

/** GET /api/analytics/income/daily: name → request */
export const DAILY_CALLS: Record<string, Call> = {
  dailyWeek: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07'],
  dailyWeekPlan: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&plan=true'],
  dailyWeekOutletAdmin: ['stable', OUTLET_ADMIN, 'startDate=2026-10-01&endDate=2026-10-07&plan=1'],
  dailyWeekAdminAllShops: ['stable', ADMIN, 'startDate=2026-10-01&endDate=2026-10-07'],
  dailyOneDay: ['stable', MERCHANT, 'startDate=2026-10-03&endDate=2026-10-03&plan=true'],
  dailyNoOrders: ['stable', MERCHANT, 'startDate=2026-08-01&endDate=2026-08-07'],
  dailyMissingDate: ['stable', MERCHANT, 'startDate=2026-10-01'],
  dailyBadDate: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=not-a-date'],
  dailyStartAfterEnd: ['stable', MERCHANT, 'startDate=2026-10-07&endDate=2026-10-01'],
  edgeDailyWeek: ['edge', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&plan=true'],
};

/** GET /api/analytics/income/orders: name → request */
export const ORDERS_CALLS: Record<string, Call> = {
  ordersAll: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07'],
  ordersAllNoPlan: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&plan=false'],
  ordersNew: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&status=new'],
  ordersPickup: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&status=pickup'],
  ordersReturn: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&status=return'],
  ordersCancelled: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&status=cancelled'],
  ordersPage1: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&limit=5&offset=0'],
  ordersPage2: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&limit=5&offset=5'],
  ordersOutletAdmin: ['stable', OUTLET_ADMIN, 'startDate=2026-10-01&endDate=2026-10-07'],
  ordersAdminAllShops: ['stable', ADMIN, 'startDate=2026-10-01&endDate=2026-10-07&plan=false'],
  ordersOneDay: ['stable', MERCHANT, 'startDate=2026-10-06&endDate=2026-10-06'],
  ordersMissingDate: ['stable', MERCHANT, 'endDate=2026-10-07'],
  ordersBadDate: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=not-a-date'],
  ordersBadLimit: ['stable', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&limit=0'],
  ordersStartAfterEnd: ['stable', MERCHANT, 'startDate=2026-10-07&endDate=2026-10-01'],
  edgeOrdersAll: ['edge', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&plan=false'],
  edgeOrdersNew: ['edge', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&status=new'],
};

/** Plain JSON, as the API sends it */
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

async function runCalls(routeDir: string, path: string, calls: Record<string, Call>, root: string) {
  const stores = { stable: createIncomeStore(STABLE_ORDERS), edge: createIncomeStore(EDGE_ORDERS) };
  const holder: StoreHolder = { db: null, prisma: null };
  const out: Record<string, any> = {};
  await quietly(async () => {
    const { GET } = loadRoute(routeDir, holder, root);
    for (const [name, [store, auth, query]] of Object.entries(calls)) {
      Object.assign(holder, stores[store]);
      out[name] = await GET(request(`${path}?${query}`), auth);
    }
  });
  return json(out);
}

export const runDailyScenarios = (root = THIS_ROOT) =>
  runCalls('analytics/income/daily', '/api/analytics/income/daily', DAILY_CALLS, root);

export const runIncomeOrdersScenarios = (root = THIS_ROOT) =>
  runCalls('analytics/income/orders', '/api/analytics/income/orders', ORDERS_CALLS, root);
