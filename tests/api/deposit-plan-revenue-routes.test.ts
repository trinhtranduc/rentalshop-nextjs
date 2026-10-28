/**
 * #1199 PHẦN B: các màn doanh thu cộng ra cùng một số khi có đơn kế hoạch cọc.
 * Tổng theo ngày (`income/daily`) = tổng danh sách đơn (`income/orders`) = Tổng quan (`computeIncomePeriodSummary`,
 * `buildAnalyticsPeriodReport`) = tổng `income`. Chạy dưới TZ=UTC và TZ=Asia/Ho_Chi_Minh.
 */
import { createFakeOrderStore } from '../helpers/fake-order-store';
import { createRecordingStore } from '../api-compat/revenue-mapping-scenarios';
import { freezeClock, loadRoute, quietly, request, type StoreHolder } from '../api-compat/load-route';
import { loadOverviewModules } from '../api-compat/load-overview-modules';

const at = (iso: string) => new Date(iso);
const NOW = at('2026-11-20T05:00:00Z');
const PLAN = {
  v: 1,
  items: [
    { key: 'i1', label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } },
    { key: 'i2', label: 'Cọc lần 2', type: 'PERCENT', value: 40, dueDateKey: '2026-11-23' },
  ],
};
const pay = (id: number, key: string, amount: number, processedAt: string) => ({
  id, amount, status: 'COMPLETED', notes: 'INSTALLMENT', installmentKey: key, type: 'DEPOSIT',
  processedAt: at(processedAt), createdAt: at(processedAt),
});
const refund = (id: number, amount: number, processedAt: string) => ({
  id, amount, status: 'REFUNDED', notes: 'CANCEL_REFUND', installmentKey: null, type: 'REFUND',
  processedAt: at(processedAt), createdAt: at(processedAt),
});

function order(id: number, fields: Record<string, any>) {
  return {
    id, orderNumber: String(300000 + id), outletId: 1, outlet: { id: 1, name: 'Cửa hàng 1' },
    customerId: 100 + id, customer: { id: 100 + id, firstName: 'Khách', lastName: String(id), phone: '0900000001' },
    deletedAt: null, orderType: 'RENT', status: 'RESERVED', totalAmount: 0, depositAmount: 0, securityDeposit: 0,
    damageFee: 0, lateFee: 0, discountType: null, discountValue: 0, discountAmount: 0, pickupTotalAmount: null,
    pickupPlanAt: null, returnPlanAt: null, pickedUpAt: null, returnedAt: null, depositPlan: null,
    cancelKeptAmount: null, cancelledAt: null, payments: [], ...fields,
    updatedAt: fields.updatedAt ?? fields.returnedAt ?? fields.pickedUpAt ?? fields.createdAt,
  };
}

const ORDERS = [
  // worked example: net 12.000.000, returned
  order(1, {
    status: 'RETURNED', totalAmount: 12_000_000, depositAmount: 8_400_000, securityDeposit: 2_000_000, depositPlan: PLAN,
    createdAt: at('2026-10-25T03:00:00Z'), pickupPlanAt: at('2026-11-14T03:00:00Z'), returnPlanAt: at('2026-11-17T03:00:00Z'),
    pickedUpAt: at('2026-11-14T03:00:00Z'), returnedAt: at('2026-11-17T03:00:00Z'),
    payments: [pay(1, 'i1', 3_600_000, '2026-10-25T03:00:00Z'), pay(2, 'i2', 4_800_000, '2026-11-13T03:00:00Z')],
  }),
  // reserved, first stage paid, second due 23/11, pickup 25/11 (after now)
  order(2, {
    totalAmount: 10_000_000, depositAmount: 3_000_000, depositPlan: PLAN,
    createdAt: at('2026-11-18T03:00:00Z'), pickupPlanAt: at('2026-11-25T03:00:00Z'), returnPlanAt: at('2026-11-27T03:00:00Z'),
    payments: [pay(3, 'i1', 3_000_000, '2026-11-18T03:00:00Z')],
  }),
  // cancelled 12/11 keeping 1.800.000 of 3.600.000
  order(3, {
    status: 'CANCELLED', totalAmount: 12_000_000, depositAmount: 1_800_000, depositPlan: PLAN, cancelKeptAmount: 1_800_000,
    cancelledAt: at('2026-11-12T03:00:00Z'), createdAt: at('2026-10-25T04:00:00Z'), updatedAt: at('2026-11-12T03:00:01Z'),
    pickupPlanAt: at('2026-11-14T03:00:00Z'),
    payments: [pay(4, 'i1', 3_600_000, '2026-10-25T04:00:00Z'), refund(5, 1_800_000, '2026-11-12T03:00:00Z')],
  }),
  // no plan: old formula
  order(4, {
    status: 'RETURNED', totalAmount: 2_000_000, depositAmount: 500_000, securityDeposit: 1_000_000,
    createdAt: at('2026-10-30T03:00:00Z'), pickupPlanAt: at('2026-11-02T03:00:00Z'), pickedUpAt: at('2026-11-02T03:00:00Z'),
    returnedAt: at('2026-11-04T03:00:00Z'),
  }),
];
// 12.000.000 + 3.000.000 + 1.800.000 + 2.000.000 collected (collateral nets to 0 for the returned orders)
const EXPECTED_TOTAL = 12_000_000 + 3_000_000 + 1_800_000 + 2_000_000;
const MERCHANT = { user: { id: 1, email: 'm@test', role: 'MERCHANT' }, userScope: { merchantId: 1 } };

beforeAll(() => freezeClock(NOW));
afterAll(() => jest.useRealTimers());

async function get(routeDir: string, query: string) {
  const { holder } = createRecordingStore(ORDERS);
  const store: StoreHolder = { db: null, prisma: null };
  Object.assign(store, holder);
  let res: any;
  await quietly(async () => {
    const { GET } = loadRoute(routeDir, store);
    res = await GET(request(`/api/${routeDir}?${query}`), MERCHANT);
  });
  return res;
}

describe('every revenue screen adds up to the same number', () => {
  const range = 'startDate=2026-10-20&endDate=2026-11-20';

  it('income/daily', async () => {
    const res = await get('analytics/income/daily', range);
    expect(res.status).toBe(200);
    const days: Record<string, number> = {};
    for (const d of res.body.data.dailyData ?? res.body.data.days ?? res.body.data.periods ?? []) days[d.date] = d.totalRevenue;
    expect(res.body.data.summary.totalRevenue).toBe(EXPECTED_TOTAL);
    expect(days['2026/10/25']).toBe(3_600_000 + 3_600_000);
    expect(days['2026/11/12']).toBe(-1_800_000);
    expect(days['2026/11/13']).toBe(4_800_000);
    expect(days['2026/11/14']).toBe(5_600_000);
    expect(days['2026/11/17']).toBe(-2_000_000);
  });

  it('income/orders: rows add up to the daily total', async () => {
    const res = await get('analytics/income/orders', `${range}&limit=100&plan=false`);
    expect(res.status).toBe(200);
    const rows = (res.body.data.days as any[]).flatMap((d) => d.orders) as any[];
    expect(rows.reduce((s, o) => s + o.revenue, 0)).toBe(EXPECTED_TOTAL);
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('income by day: realIncome adds up, futureIncome is only the rest stage, futureInstallments by due day', async () => {
    const res = await get('analytics/income', 'startDate=2026-10-20&endDate=2026-11-30&groupBy=day');
    expect(res.status).toBe(200);
    const points = res.body.data as any[];
    expect(points.reduce((s, p) => s + p.realIncome, 0)).toBe(EXPECTED_TOTAL);
    // order 2: pickup 25/11, total 10.000.000 - stages 3.000.000 (paid) - 4.000.000 (i2, unpaid) = 3.000.000 rest
    const future = points.reduce((s, p) => s + p.futureIncome, 0);
    expect(future).toBe(3_000_000);
    const inst = points.flatMap((p) => p.futureInstallments ?? []);
    expect(inst).toEqual([{ dueDateKey: '2026-11-23', amount: 4_000_000, count: 1 }]);
    // days without a plan stage carry no futureInstallments key at all
    expect(points.filter((p) => 'futureInstallments' in p)).toHaveLength(1);
  });

  it('Tổng quan: income summary and period report', async () => {
    const m = loadOverviewModules();
    const { prisma, db } = createFakeOrderStore(ORDERS);
    const outlet1 = { outletId: { in: [1] } };
    const summary = await m.computeIncomePeriodSummary(prisma, { startDate: '2026-10-20', endDate: '2026-11-30', outletFilter: outlet1 });
    expect(summary.summary.totalRevenue).toBe(EXPECTED_TOTAL);
    const report = await m.buildAnalyticsPeriodReport(prisma, db, {
      startDate: '2026-10-20', endDate: '2026-11-30', groupBy: 'day', limit: 5, userRole: 'MERCHANT', outletFilter: outlet1,
    });
    expect(report.revenue.totalRevenue).toBe(EXPECTED_TOTAL);
    expect(report.revenue.collectedBreakdown).toEqual({ deposits: 15_500_000, pickupAndSale: 5_100_000, fees: 0, refunds: 1_800_000 });
    expect(report.series.reduce((s: number, p: any) => s + p.realIncome, 0)).toBe(EXPECTED_TOTAL);
    const due = report.series.find((p: any) => p.futureInstallments);
    expect(due.date).toBe('2026/11/23');
    expect(due.futureInstallments).toEqual([{ dueDateKey: '2026-11-23', amount: 4_000_000, count: 1 }]);
    expect(due.futureIncome).toBe(0);
  });

  it('a payment collected in the window selects an order whose own dates are outside it', async () => {
    const res = await get('analytics/income/daily', 'startDate=2026-11-13&endDate=2026-11-13');
    expect(res.body.data.summary.totalRevenue).toBe(4_800_000);
  });

  it('the cancel refund is on the cancel day only', async () => {
    const res = await get('analytics/income/daily', 'startDate=2026-11-12&endDate=2026-11-12');
    expect(res.body.data.summary.totalRevenue).toBe(-1_800_000);
  });
});
