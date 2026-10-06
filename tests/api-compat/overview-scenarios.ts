/**
 * Shared scenarios for the Overview API compatibility tests (#492, #494).
 *
 * One shop's orders around the week of 1–7 Oct 2026, with Vietnam-midnight edges, collateral,
 * fees, cancellations, a deleted order and an order of another outlet. `runOverviewScenarios`
 * feeds them to the three functions behind the Overview endpoints and returns every response:
 * - computeIncomePeriodSummary → GET /api/analytics/income/summary
 * - buildAnalyticsPeriodReport → GET /api/analytics/period and /api/analytics/overview
 * - getOutletOperations        → GET /api/analytics/outlet-operations
 */
import { createFakeOrderStore } from '../helpers/fake-order-store';

/** "Now" for every scenario: 6 Oct 2026, 12:00 in Vietnam */
export const NOW = new Date('2026-10-06T05:00:00.000Z');

const at = (iso: string) => new Date(iso);

function order(id: number, fields: Record<string, any>) {
  return {
    id,
    orderNumber: `ORD-1-${String(id).padStart(4, '0')}`,
    outletId: 1,
    customerId: 100 + id,
    deletedAt: null,
    orderType: 'RENT',
    status: 'RESERVED',
    totalAmount: 0,
    depositAmount: 0,
    securityDeposit: 0,
    damageFee: 0,
    lateFee: 0,
    isReadyToDeliver: false,
    pickupPlanAt: null,
    returnPlanAt: null,
    pickedUpAt: null,
    returnedAt: null,
    payments: [],
    customer: { firstName: 'Khách', lastName: String(id), phone: '0900000000' },
    orderItems: [],
    ...fields,
    updatedAt: fields.updatedAt ?? fields.returnedAt ?? fields.pickedUpAt ?? fields.createdAt,
  };
}

export const ORDERS = [
  // Returned on another day, with collateral, late and damage fees; created at 00:00 Vietnam on 1 Oct
  order(1, {
    status: 'RETURNED', totalAmount: 300000, depositAmount: 100000, securityDeposit: 1000000, lateFee: 50000, damageFee: 20000,
    createdAt: at('2026-09-30T17:00:00.000Z'), pickupPlanAt: at('2026-10-02T03:00:00.000Z'), returnPlanAt: at('2026-10-03T03:00:00.000Z'),
    pickedUpAt: at('2026-10-02T03:00:00.000Z'), returnedAt: at('2026-10-04T16:59:59.000Z'),
  }),
  // Picked up and returned the same day
  order(2, {
    status: 'RETURNED', totalAmount: 200000, securityDeposit: 500000,
    createdAt: at('2026-10-01T04:00:00.000Z'), pickupPlanAt: at('2026-10-03T02:00:00.000Z'), returnPlanAt: at('2026-10-03T10:00:00.000Z'),
    pickedUpAt: at('2026-10-03T02:00:00.000Z'), returnedAt: at('2026-10-03T10:00:00.000Z'),
  }),
  // Created last period, picked up this period, overdue now
  order(3, {
    status: 'PICKUPED', totalAmount: 400000, depositAmount: 200000, securityDeposit: 2000000,
    createdAt: at('2026-09-28T03:00:00.000Z'), pickupPlanAt: at('2026-10-01T01:00:00.000Z'), returnPlanAt: at('2026-10-04T03:00:00.000Z'),
    pickedUpAt: at('2026-10-01T01:00:00.000Z'),
  }),
  // Picked up at 23:59:59 Vietnam on 5 Oct, due back today
  order(4, {
    status: 'PICKUPED', totalAmount: 150000, securityDeposit: 300000,
    createdAt: at('2026-10-04T05:00:00.000Z'), pickupPlanAt: at('2026-10-05T10:00:00.000Z'), returnPlanAt: at('2026-10-06T08:00:00.000Z'),
    pickedUpAt: at('2026-10-05T16:59:59.000Z'),
  }),
  // Picked up today, no collateral, due back in 3 days
  order(5, {
    status: 'PICKUPED', totalAmount: 180000, depositAmount: 30000,
    createdAt: at('2026-10-05T02:00:00.000Z'), pickupPlanAt: at('2026-10-06T02:00:00.000Z'), returnPlanAt: at('2026-10-09T02:00:00.000Z'),
    pickedUpAt: at('2026-10-06T02:00:00.000Z'),
  }),
  // To hand over later today, collateral to collect
  order(6, {
    totalAmount: 250000, depositAmount: 50000, securityDeposit: 700000,
    createdAt: at('2026-10-02T06:00:00.000Z'), pickupPlanAt: at('2026-10-06T09:00:00.000Z'), returnPlanAt: at('2026-10-08T09:00:00.000Z'),
  }),
  // No-show: pickup day was 4 Oct
  order(7, {
    totalAmount: 150000, securityDeposit: 1000000,
    createdAt: at('2026-10-03T07:00:00.000Z'), pickupPlanAt: at('2026-10-04T03:00:00.000Z'), returnPlanAt: at('2026-10-05T03:00:00.000Z'),
  }),
  // Created at 00:00 Vietnam today, pickup in two days, no collateral
  order(8, {
    totalAmount: 300000, depositAmount: 100000,
    createdAt: at('2026-10-05T17:00:00.000Z'), pickupPlanAt: at('2026-10-08T02:00:00.000Z'), returnPlanAt: at('2026-10-10T02:00:00.000Z'),
  }),
  // Pickup tomorrow, collateral to collect
  order(9, {
    totalAmount: 220000, depositAmount: 20000, securityDeposit: 400000,
    createdAt: at('2026-10-04T09:00:00.000Z'), pickupPlanAt: at('2026-10-07T02:00:00.000Z'), returnPlanAt: at('2026-10-08T02:00:00.000Z'),
  }),
  // Sales: one this period, one last period
  order(10, { orderType: 'SALE', status: 'COMPLETED', totalAmount: 120000, createdAt: at('2026-10-02T05:00:00.000Z') }),
  order(11, { orderType: 'SALE', status: 'COMPLETED', totalAmount: 80000, createdAt: at('2026-09-25T05:00:00.000Z') }),
  // Cancelled after paying the deposit
  order(12, {
    status: 'CANCELLED', totalAmount: 300000, depositAmount: 100000,
    createdAt: at('2026-10-01T08:00:00.000Z'), updatedAt: at('2026-10-03T08:00:00.000Z'),
    pickupPlanAt: at('2026-10-05T03:00:00.000Z'), returnPlanAt: at('2026-10-06T03:00:00.000Z'),
  }),
  // Cancelled after pickup, with collateral
  order(13, {
    status: 'CANCELLED', totalAmount: 260000, depositAmount: 60000, securityDeposit: 400000,
    createdAt: at('2026-10-01T09:00:00.000Z'), pickedUpAt: at('2026-10-02T09:00:00.000Z'), updatedAt: at('2026-10-05T09:00:00.000Z'),
    pickupPlanAt: at('2026-10-02T09:00:00.000Z'), returnPlanAt: at('2026-10-04T09:00:00.000Z'),
  }),
  // Whole rental in the previous period
  order(14, {
    status: 'RETURNED', totalAmount: 350000, depositAmount: 50000, securityDeposit: 600000,
    createdAt: at('2026-09-24T03:00:00.000Z'), pickupPlanAt: at('2026-09-25T03:00:00.000Z'), returnPlanAt: at('2026-09-27T03:00:00.000Z'),
    pickedUpAt: at('2026-09-25T03:00:00.000Z'), returnedAt: at('2026-09-27T03:00:00.000Z'),
  }),
  // Deleted: never counted
  order(15, {
    status: 'PICKUPED', totalAmount: 999000, depositAmount: 99000, securityDeposit: 9990000, deletedAt: at('2026-10-03T00:00:00.000Z'),
    createdAt: at('2026-10-02T03:00:00.000Z'), pickupPlanAt: at('2026-10-02T03:00:00.000Z'), returnPlanAt: at('2026-10-04T03:00:00.000Z'),
    pickedUpAt: at('2026-10-02T03:00:00.000Z'),
  }),
  // Another outlet: counted only when the filter includes outlet 2
  order(16, {
    outletId: 2, status: 'PICKUPED', totalAmount: 500000, depositAmount: 100000, securityDeposit: 800000,
    createdAt: at('2026-10-02T03:00:00.000Z'), pickupPlanAt: at('2026-10-03T03:00:00.000Z'), returnPlanAt: at('2026-10-06T03:00:00.000Z'),
    pickedUpAt: at('2026-10-03T03:00:00.000Z'),
  }),
  // Rent RESERVED with a deposit, created in the previous period, pickup this period still to come
  order(17, {
    totalAmount: 400000, depositAmount: 150000, securityDeposit: 500000,
    createdAt: at('2026-09-29T03:00:00.000Z'), pickupPlanAt: at('2026-10-07T16:59:59.000Z'), returnPlanAt: at('2026-10-09T03:00:00.000Z'),
  }),
];

/** Vietnam civil-day bounds as UTC instants */
const vnDay = (key: string) => {
  const start = new Date(`${key}T00:00:00.000+07:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
};

export interface OverviewModules {
  computeIncomePeriodSummary: (prisma: any, params: any) => Promise<any>;
  buildAnalyticsPeriodReport: (prisma: any, db: any, params: any) => Promise<any>;
  /** Called with a store's prisma; returns that store's getOutletOperations */
  getOutletOperations: (prisma: any) => (query: any) => Promise<any>;
}

/** Plain JSON, as the API sends it (Dates become ISO strings, undefined keys disappear) */
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

export async function runOverviewScenarios(m: OverviewModules): Promise<Record<string, any>> {
  const { prisma, db } = createFakeOrderStore(ORDERS);
  const outlet1 = { outletId: { in: [1] } };
  const out: Record<string, any> = {};

  out.incomeSummaryWeek = await m.computeIncomePeriodSummary(prisma, {
    startDate: '2026-10-01', endDate: '2026-10-07', outletFilter: outlet1,
  });
  out.incomeSummaryTwoMonthsNoDays = await m.computeIncomePeriodSummary(prisma, {
    startDate: '2026-09-01', endDate: '2026-10-31', outletFilter: outlet1, includeDailyPeriods: false,
  });
  out.incomeSummaryAllOutlets = await m.computeIncomePeriodSummary(prisma, {
    startDate: '2026-10-01', endDate: '2026-10-07', outletFilter: {},
  });
  out.incomeSummaryToday = await m.computeIncomePeriodSummary(prisma, {
    startDate: '2026-10-06', endDate: '2026-10-06', outletFilter: outlet1,
  });

  const report = (params: Record<string, any>) =>
    m.buildAnalyticsPeriodReport(prisma, db, { limit: 5, userRole: 'MERCHANT', outletFilter: outlet1, ...params });
  out.periodWeekByDay = await report({ startDate: '2026-10-01', endDate: '2026-10-07', groupBy: 'day' });
  out.periodTodayOnly = await report({ startDate: '2026-10-06', endDate: '2026-10-06', groupBy: 'day' });
  out.periodYearByMonth = await report({ startDate: '2026-01-01', endDate: '2026-12-31', groupBy: 'month' });
  out.periodAllOutlets = await report({ startDate: '2026-10-01', endDate: '2026-10-07', groupBy: 'day', outletFilter: {} });
  out.periodNoOrders = await report({ startDate: '2026-10-01', endDate: '2026-10-07', groupBy: 'day', outletFilter: { outletId: { in: [99] } } });
  out.periodOutletAdmin = await report({ startDate: '2026-10-01', endDate: '2026-10-07', groupBy: 'day', userRole: 'OUTLET_ADMIN' });

  const operations = m.getOutletOperations(prisma);
  const today = vnDay('2026-10-06');
  const tomorrow = vnDay('2026-10-07');
  const soonEnd = vnDay('2026-10-09').end;
  const trendDays = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'].map(
    (dateKey) => ({ dateKey, ...vnDay(dateKey) })
  );
  out.operationsManager = await operations({
    outletIds: [1], start: today.start, end: today.end, soonEnd, includeCash: true,
    trendDays, tomorrowStart: tomorrow.start, tomorrowEnd: tomorrow.end,
  });
  out.operationsStaff = await operations({
    outletIds: [1], start: today.start, end: today.end, soonEnd, includeCash: false, trendDays,
  });
  out.operationsTwoOutlets = await operations({
    outletIds: [1, 2], start: today.start, end: today.end, soonEnd, includeCash: true,
  });
  out.operationsEmptyOutlet = await operations({
    outletIds: [99], start: today.start, end: today.end, soonEnd, includeCash: true,
  });

  return json(out);
}
