/**
 * #492 — Overview headline is the order value of the period, with growth against the previous period.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@rentalshop/utils', () => {
  const revenue = jest.requireActual('../../../packages/utils/src/core/revenue-calculator') as any;
  return {
    calculatePeriodRevenueBatch: revenue.calculatePeriodRevenueBatch,
    getOrderRevenueEvents: revenue.getOrderRevenueEvents,
    parseProductImages: () => [],
  };
});

import { buildAnalyticsPeriodReport } from '../../../packages/utils/src/analytics/period-report';

const CURRENT_START = new Date('2026-09-30T17:00:00.000Z'); // 1 Oct, Vietnam day

function fakes(previousTotal: number | 'fail') {
  const findMany = jest.fn(async (args: any) => {
    const select = args?.select ?? {};
    if (select.orderNumber || !select.depositAmount || select.securityDeposit) return [];
    const isCurrent = args.where.createdAt.gte.getTime() === CURRENT_START.getTime();
    if (!isCurrent && previousTotal === 'fail') throw new Error('db down');
    const total = isCurrent ? 300000 : (previousTotal as number);
    return [{ orderType: 'SALE', status: 'COMPLETED', totalAmount: total, depositAmount: 0 }];
  });
  const prisma = {
    order: { findMany, groupBy: jest.fn(async () => []) },
    outlet: { findMany: jest.fn(async () => []) },
    orderItem: { findMany: jest.fn(async () => []) },
    product: { findMany: jest.fn(async () => []) },
  } as any;
  const db = {
    orders: { search: jest.fn(async () => ({ total: 0, data: [] })), getStats: jest.fn(async () => 0) },
    orderItems: { groupBy: jest.fn(async () => []) },
    products: { findById: jest.fn() },
    customers: { findById: jest.fn() },
    merchants: { findById: jest.fn() },
    outlets: { findById: jest.fn() },
  } as any;
  return { prisma, db };
}

const params = {
  startDate: '2026-10-01',
  endDate: '2026-10-07',
  groupBy: 'day' as const,
  limit: 5,
  outletFilter: {},
  userRole: 'MERCHANT',
};

describe('growth.orderValue (#492)', () => {
  it('compares the order value with the previous period', async () => {
    const { prisma, db } = fakes(200000);
    const report = await buildAnalyticsPeriodReport(prisma, db, params);
    expect(report.revenue.totalOrderValue).toBe(300000);
    expect(report.growth.orderValue).toEqual({ current: 300000, previous: 200000, growth: 50 });
  });

  it('is left out when the previous period cannot be read', async () => {
    const { prisma, db } = fakes('fail');
    const report = await buildAnalyticsPeriodReport(prisma, db, params);
    expect(report.growth.orderValue).toBeUndefined();
    expect(report.revenue.totalOrderValue).toBe(300000);
  });
});
