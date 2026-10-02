/**
 * Order list "today" filter: /orders?startDate=2026-10-02&endDate=2026-10-02 used the UTC day
 * (07:00 → 07:00 in Vietnam) and hid orders made before 7 am. The route now sends Vietnam-day
 * bounds with `exactDateRange`, which the query must use as they are.
 */
jest.mock('../../../packages/database/src/client', () => ({ prisma: {} }));

import { applyOrderDateRange } from '../../../packages/database/src/order-date-range';

describe('applyOrderDateRange', () => {
  const start = new Date('2026-10-01T17:00:00.000Z');
  const end = new Date('2026-10-02T16:59:59.999Z');

  it('keeps exact Vietnam-day bounds', () => {
    const where: any = {};
    applyOrderDateRange(where, start, end, 'createdAt', true);
    expect(where.createdAt).toEqual({ gte: start, lte: end });
  });

  it('still normalises to whole UTC days without the flag (other callers)', () => {
    const where: any = {};
    applyOrderDateRange(where, new Date('2026-10-02'), new Date('2026-10-02'), 'createdAt');
    expect(where.createdAt).toEqual({ gte: new Date('2026-10-02T00:00:00.000Z'), lte: new Date('2026-10-02T23:59:59.999Z') });
  });
});
