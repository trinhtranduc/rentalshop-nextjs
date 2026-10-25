/**
 * #1199 (refactor, no behaviour change): the shared order mapper and event WHERE give exactly what the
 * hand-written copies in the analytics routes gave. The expected values below are those old copies.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildEventWhere,
  toRevenueOrderData,
  EVENT_WHERE_BASIC,
  EVENT_WHERE_CIVIL,
  EVENT_WHERE_PERIOD,
} from '../../../packages/utils/src/core/revenue-mapping';

const start = new Date('2026-10-01T00:00:00.000Z');
const end = new Date('2026-10-07T23:59:59.999Z');
const DAY = 24 * 60 * 60 * 1000;
const back = new Date(start.getTime() - DAY);
const forward = new Date(end.getTime() + DAY);

describe('toRevenueOrderData', () => {
  const at = new Date('2026-10-02T03:00:00.000Z');

  it('copies the 14 fields the calculator reads', () => {
    const row = {
      orderType: 'RENT', status: 'PICKUPED', totalAmount: 500, depositAmount: 100, securityDeposit: 300,
      damageFee: 20, lateFee: 10, pickupTotalAmount: 450, createdAt: at, pickedUpAt: at, returnedAt: null,
      pickupPlanAt: at, returnPlanAt: at, updatedAt: at, id: 7, customerId: 9, notes: 'ignored',
    };
    expect(toRevenueOrderData(row)).toEqual({
      orderType: 'RENT', status: 'PICKUPED', totalAmount: 500, depositAmount: 100, securityDeposit: 300,
      damageFee: 20, lateFee: 10, pickupTotalAmount: 450, createdAt: at, pickedUpAt: at, returnedAt: null,
      pickupPlanAt: at, returnPlanAt: at, updatedAt: at,
    });
  });

  it('money defaults to 0 and pickupTotalAmount to null (never 0: null means "use the total", #505)', () => {
    const data = toRevenueOrderData({ orderType: 'SALE', status: 'COMPLETED', totalAmount: null, pickupTotalAmount: undefined });
    expect(data).toMatchObject({
      totalAmount: 0, depositAmount: 0, securityDeposit: 0, damageFee: 0, lateFee: 0, pickupTotalAmount: null,
    });
    expect(toRevenueOrderData({ orderType: 'RENT', status: 'RESERVED', pickupTotalAmount: 0 }).pickupTotalAmount).toBe(0);
  });

  it('dates pass through as given (Date, ISO string, null, missing)', () => {
    const iso = '2026-10-02T03:00:00.000Z';
    const data = toRevenueOrderData({ orderType: 'RENT', status: 'RESERVED', createdAt: iso, pickedUpAt: null });
    expect(data.createdAt).toBe(iso);
    expect(data.pickedUpAt).toBeNull();
    expect(data.returnedAt).toBeUndefined();
  });
});

describe('buildEventWhere', () => {
  const range = { start, end };
  // #1199: the one clause added for deposit plans, last in every shape: a stage collected / refunded in the period
  const paymentClause = {
    payments: {
      some: {
        status: { in: ['COMPLETED', 'REFUNDED'] },
        notes: { in: ['INSTALLMENT', 'CANCEL_REFUND'] },
        processedAt: { gte: start, lte: end },
      },
    },
  };

  it('civil shape (income daily, summary, orders list): the exact old OR', () => {
    expect(buildEventWhere(range, EVENT_WHERE_CIVIL)).toEqual({
      OR: [
        { createdAt: { gte: start, lte: end } },
        { pickedUpAt: { gte: start, lte: end, not: null } },
        { returnedAt: { gte: start, lte: end, not: null } },
        { AND: [{ status: 'CANCELLED' }, { updatedAt: { gte: start, lte: end } }] },
        { AND: [{ orderType: 'SALE' }, { status: 'COMPLETED' }, { updatedAt: { gte: start, lte: end } }] },
        paymentClause,
      ],
    });
  });

  it('is the default shape', () => {
    expect(buildEventWhere(range)).toEqual(buildEventWhere(range, EVENT_WHERE_CIVIL));
  });

  it('period shape (monthly income, period report, growth): a day of margin on pickups / returns, plus plans', () => {
    expect(buildEventWhere(range, EVENT_WHERE_PERIOD)).toEqual({
      OR: [
        { createdAt: { gte: start, lte: end } },
        { pickedUpAt: { gte: back, lte: forward, not: null } },
        { returnedAt: { gte: back, lte: forward, not: null } },
        { updatedAt: { gte: start, lte: end }, status: 'CANCELLED' },
        { pickupPlanAt: { gte: start, lte: end, not: null } },
        { returnPlanAt: { gte: start, lte: end, not: null } },
        paymentClause,
      ],
    });
  });

  it('basic shape (system analytics): no "not null", no sale-completed, no plans', () => {
    const where = buildEventWhere(range, EVENT_WHERE_BASIC);
    expect(where).toEqual({
      OR: [
        { createdAt: { gte: start, lte: end } },
        { pickedUpAt: { gte: start, lte: end } },
        { returnedAt: { gte: start, lte: end } },
        { updatedAt: { gte: start, lte: end }, status: 'CANCELLED' },
        paymentClause,
      ],
    });
    expect(Object.keys((where.OR[1] as any).pickedUpAt)).not.toContain('not');
  });

  it('does not share one object between clauses (a caller may extend one)', () => {
    const { OR } = buildEventWhere(range, EVENT_WHERE_CIVIL);
    expect((OR[0] as any).createdAt).not.toBe((OR[3] as any).AND[1].updatedAt);
  });
});
