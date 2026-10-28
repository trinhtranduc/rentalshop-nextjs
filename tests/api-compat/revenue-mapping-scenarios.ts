/**
 * Scenarios that pin the revenue routes NOT covered by the income daily / orders and Overview compat tests
 * (issue #1199, PR "revenue mapper consolidation"): the order-to-calculator mapping and the event WHERE of
 *
 * - GET /api/analytics/income          - GET /api/analytics/top-customers   - GET /api/analytics/system
 * - GET /api/analytics/today-metrics   - GET /api/analytics/dashboard       - GET /api/analytics/growth-metrics
 * - GET /api/analytics/enhanced-dashboard
 *
 * Each scenario records the JSON response AND every Prisma `where` the route sent, so a refactor that
 * changes a number or a query shape fails here. Orders: the Overview shop (1-7 Oct 2026, now = 6 Oct 2026).
 */
import { matchesWhere } from '../helpers/fake-order-store';
import { ORDERS } from './overview-scenarios';
import { loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

export { NOW } from './overview-scenarios';

const OUTLETS: Record<number, { id: number; publicId: number; name: string; merchantId: number }> = {
  1: { id: 1, publicId: 1, name: 'Cửa hàng 1', merchantId: 1 },
  2: { id: 2, publicId: 2, name: 'Cửa hàng 2', merchantId: 1 },
};

/** Plain JSON, as the API sends it (Dates become ISO strings, undefined keys disappear) */
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

/** db + prisma over the orders, recording every `where` the route sends (in call order) */
export function createRecordingStore(orders: Record<string, any>[]) {
  const queries: Array<{ call: string; where: unknown }> = [];
  const select = (call: string, args: any = {}) => {
    queries.push({ call, where: args.where ?? null });
    const rows = orders.filter((o) => matchesWhere(o, args.where));
    return (args.take ? rows.slice(0, args.take) : rows).map((r) => structuredClone(r));
  };
  const prisma = { order: { findMany: async (args: any) => select('prisma.order.findMany', args) } };
  const zero = async () => 0;
  const db = {
    outlets: {
      findById: async (id: number) => OUTLETS[id] ?? null,
      count: zero,
    },
    merchants: {
      findById: async (id: number) => ({
        id,
        outlets: Object.values(OUTLETS).filter((o) => o.merchantId === id).map((o) => ({ id: o.id, name: o.name })),
      }),
      count: zero,
    },
    users: { count: zero },
    products: { count: zero },
    customers: {
      getStats: zero,
      findById: async (id: number) => ({ id, firstName: 'Khách', lastName: String(id), phone: '0900000000', email: null }),
    },
    orders: {
      search: async (args: any) => {
        const data = select('db.orders.search', args);
        return { total: data.length, data: data.slice(0, args?.limit ?? data.length) };
      },
      findManyLightweight: async (args: any) => {
        const data = select('db.orders.findManyLightweight', args);
        return { total: data.length, data: data.slice(0, args?.limit ?? data.length) };
      },
      // dashboard passes the where itself, income passes `{ where }`: both are recorded as sent
      getStats: async (arg?: any) => select('db.orders.getStats', { where: arg && arg.where ? arg.where : arg }).length,
    },
    outletStock: { aggregate: async () => ({ _sum: { stock: 0, available: 0, renting: 0 } }) },
  };
  return { holder: { db, prisma } as StoreHolder, queries };
}

const MERCHANT = { user: { id: 1, email: 'merchant@test', role: 'MERCHANT' }, userScope: { merchantId: 1 } };
const OUTLET_ADMIN = { user: { id: 2, email: 'outlet@test', role: 'OUTLET_ADMIN' }, userScope: { merchantId: 1, outletId: 1 } };
const ADMIN = { user: { id: 3, email: 'admin@test', role: 'ADMIN' }, userScope: {} };

type Call = [routeDir: string, auth: typeof MERCHANT, query: string];

export const CALLS: Record<string, Call> = {
  incomeMonthByDay: ['analytics/income', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07&groupBy=day'],
  incomeYearByMonth: ['analytics/income', MERCHANT, 'startDate=2026-01-01&endDate=2026-12-31&groupBy=month'],
  incomeOutletAdmin: ['analytics/income', OUTLET_ADMIN, 'startDate=2026-10-01&endDate=2026-10-07&groupBy=day'],
  incomeAdmin: ['analytics/income', ADMIN, 'startDate=2026-10-01&endDate=2026-10-07&groupBy=day'],
  topCustomersWeek: ['analytics/top-customers', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07'],
  topCustomersOutletAdmin: ['analytics/top-customers', OUTLET_ADMIN, 'startDate=2026-09-01&endDate=2026-10-31'],
  systemWeek: ['analytics/system', ADMIN, 'startDate=2026-10-01&endDate=2026-10-07&groupBy=day'],
  systemYear: ['analytics/system', ADMIN, 'startDate=2026-01-01&endDate=2026-12-31&groupBy=month'],
  todayMetricsMerchant: ['analytics/today-metrics', MERCHANT, ''],
  todayMetricsAdmin: ['analytics/today-metrics', ADMIN, ''],
  dashboardToday: ['analytics/dashboard', MERCHANT, 'period=today'],
  dashboardAll: ['analytics/dashboard', ADMIN, 'period=all'],
  growthDefault: ['analytics/growth-metrics', MERCHANT, ''],
  growthRange: ['analytics/growth-metrics', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07'],
  growthAdmin: ['analytics/growth-metrics', ADMIN, 'startDate=2026-10-01&endDate=2026-10-07'],
  enhancedWeek: ['analytics/enhanced-dashboard', MERCHANT, 'startDate=2026-10-01&endDate=2026-10-07'],
  enhancedAdmin: ['analytics/enhanced-dashboard', ADMIN, 'startDate=2026-10-01&endDate=2026-10-31'],
};

export async function runRevenueMappingScenarios(root = THIS_ROOT): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  await quietly(async () => {
    for (const [name, [routeDir, auth, query]] of Object.entries(CALLS)) {
      const { holder, queries } = createRecordingStore(ORDERS);
      const store: StoreHolder = { db: null, prisma: null };
      Object.assign(store, holder);
      const { GET } = loadRoute(routeDir, store, root);
      const response = await GET(request(`/api/${routeDir}?${query}`), auth);
      out[name] = { response, queries };
    }
  });
  return json(out);
}
