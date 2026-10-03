/**
 * #361 — analytics/period top products must not count CANCELLED orders.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@rentalshop/utils', () => ({
  calculatePeriodRevenueBatch: async () => { throw new Error('unused'); },
  getOrderRevenueEvents: async () => { throw new Error('unused'); },
  parseProductImages: () => [],
}));
jest.mock('../../../packages/utils/src/analytics/income-period-summary', () => ({
  computeIncomePeriodSummary: async () => { throw new Error('unused'); },
}));
import { buildAnalyticsPeriodReport } from '../../../packages/utils/src/analytics/period-report';

describe('analytics period top products (#361)', () => {
  it('reads only orders that are not CANCELLED', async () => {
    const search = jest.fn(async (_args: any) => ({ data: [] }));
    const db: any = new Proxy(
      { orders: { search } },
      { get: (target: any, key) => target[key] ?? new Proxy({}, { get: () => async () => { throw new Error('unused'); } }) }
    );
    const prisma: any = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => { throw new Error('unused'); } }) });

    await buildAnalyticsPeriodReport(prisma, db, {
      startDate: '2026-09-27',
      endDate: '2026-10-03',
      groupBy: 'day',
      limit: 5,
      outletFilter: { outletId: { in: [1] } },
      userRole: 'MERCHANT',
    });

    expect(search).toHaveBeenCalled();
    const where = (search.mock.calls[0][0] as any).where;
    expect(where.status).toEqual({ not: 'CANCELLED' });
    expect(where.outletId).toEqual({ in: [1] });
  });
});
