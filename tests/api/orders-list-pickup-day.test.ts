/**
 * #1472 — web orders list "Ngày giao: Hôm nay" missed an order delivered that day but planned for another day.
 * `dateField=pickupDay` = planned pickup day OR actual pickup day (`pickedUpAt`), in Vietnam civil days.
 * The old `dateField=pickupPlanAt` (installed mobile apps, #389) keeps its exact meaning.
 *
 * The orders table below is an in-memory stand-in for Prisma: it evaluates the `where` that
 * `simplifiedOrders.findManyLightweight` really builds (gte / lte / not null / OR / AND), so the test checks which rows
 * the query matches, not how it is spelled. Run with TZ=UTC and TZ=Asia/Ho_Chi_Minh: the results must be identical.
 */
const matches = (row: any, where: any): boolean =>
  Object.entries(where).every(([key, cond]: [string, any]) => {
    if (cond === undefined) return true;
    if (key === 'OR') return cond.some((w: any) => matches(row, w));
    if (key === 'AND') return (Array.isArray(cond) ? cond : [cond]).every((w: any) => matches(row, w));
    if (key === 'outlet') return true; // merchant scope: every fixture row is in scope
    if (key === 'customer') return false; // search by customer: no fixture customer
    const value = row[key];
    if (cond === null) return value === null;
    if (cond instanceof Date || typeof cond !== 'object') return value === cond;
    return Object.entries(cond).every(([op, bound]: [string, any]) => {
      if (op === 'contains') return typeof value === 'string' && value.includes(bound);
      if (op === 'mode') return true;
      if (op === 'not') return bound === null ? value !== null : value !== bound;
      if (value === null || value === undefined) return false; // SQL: NULL never satisfies a range
      if (op === 'gte') return value >= bound;
      if (op === 'lte') return value <= bound;
      return true;
    });
  });

const vn = (iso: string) => new Date(`${iso}+07:00`); // Vietnam wall clock -> instant

const order = (id: number, o: Record<string, any>) => ({
  id,
  orderNumber: `1000${id}0`,
  orderType: 'RENT',
  status: 'RESERVED',
  deletedAt: null,
  outletId: 3,
  pickupPlanAt: null,
  returnPlanAt: null,
  pickedUpAt: null,
  returnedAt: null,
  createdAt: vn('2026-11-01T09:00:00'),
  orderItems: [],
  customer: null,
  outlet: null,
  ...o,
});

const table = [
  // 1: planned 02/11, delivered 03/11 08:54 (the reported order #284697)
  order(1, { status: 'RETURNED', pickupPlanAt: vn('2026-11-02T12:00:00'), pickedUpAt: vn('2026-11-03T08:54:00'), returnedAt: vn('2026-11-03T15:30:00') }),
  // 2: planned 03/11, not picked up yet
  order(2, { pickupPlanAt: vn('2026-11-03T10:00:00') }),
  // 3: planned 03/11 and picked up 03/11: matches both columns, must be one row
  order(3, { status: 'PICKUPED', pickupPlanAt: vn('2026-11-03T09:00:00'), pickedUpAt: vn('2026-11-03T09:10:00') }),
  // 4: planned 01/11, picked up 02/11: neither on 03/11
  order(4, { status: 'PICKUPED', pickupPlanAt: vn('2026-11-01T09:00:00'), pickedUpAt: vn('2026-11-02T09:00:00') }),
  // 5: sale order: no pickup plan, never picked up
  order(5, { orderType: 'SALE', status: 'COMPLETED' }),
  // 6: no plan, picked up 03/11
  order(6, { status: 'PICKUPED', pickedUpAt: vn('2026-11-03T14:00:00') }),
  // 7: picked up 00:30 Vietnam time on 03/11 (= 17:30Z on 02/11), planned 05/11
  order(7, { status: 'PICKUPED', pickupPlanAt: vn('2026-11-05T09:00:00'), pickedUpAt: new Date('2026-11-02T17:30:00.000Z') }),
  // 8: planned 23:59:59 Vietnam time on 02/11 (= 16:59:59Z): still 02/11
  order(8, { pickupPlanAt: new Date('2026-11-02T16:59:59.000Z') }),
  // 9: soft-deleted, planned 03/11
  order(9, { pickupPlanAt: vn('2026-11-03T10:00:00'), deletedAt: vn('2026-11-03T11:00:00') }),
];

const prismaMock: any = {
  order: { findMany: jest.fn(), count: jest.fn() },
  orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
  payment: { groupBy: jest.fn().mockResolvedValue([]) },
  $queryRaw: jest.fn().mockResolvedValue([]),
};
jest.mock('../../packages/database/src/client', () => ({ prisma: prismaMock }));
jest.mock('@rentalshop/utils', () => ({ removeVietnameseDiacritics: (s: string) => s }));

import { simplifiedOrders } from '../../packages/database/src/order';
import { getUtcRangeForDateKeys } from '../../packages/utils/src/core/date-range';

const TZ_VN = 'Asia/Ho_Chi_Minh';

beforeEach(() => {
  prismaMock.order.findMany.mockReset().mockImplementation(async ({ where, skip = 0, take }: any) => {
    const rows = table.filter((r) => matches(r, where)).sort((a, b) => a.id - b.id);
    return rows.slice(skip, take === undefined ? undefined : skip + take);
  });
  prismaMock.order.count.mockReset().mockImplementation(async ({ where }: any) => table.filter((r) => matches(r, where)).length);
});

/** Same filters the route builds from `?dateField&startDate&endDate` day keys */
async function list(dateField: string | undefined, from?: string, to?: string, extra: Record<string, any> = {}) {
  const res = await simplifiedOrders.findManyLightweight({
    merchantId: 2,
    dateField,
    startDate: from ? getUtcRangeForDateKeys({ from }, TZ_VN).start : undefined,
    endDate: to ? getUtcRangeForDateKeys({ from: to }, TZ_VN).end : undefined,
    exactDateRange: true,
    limit: 50,
    ...extra,
  } as any);
  return res;
}
const ids = (res: any) => res.data.map((o: any) => o.id).sort((a: number, b: number) => a - b);

describe('dateField=pickupDay (#1472): planned OR actual pickup day', () => {
  it('1. planned 02/11 but picked up 03/11 matches "Hôm nay" on 03/11', async () => {
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03'))).toContain(1);
  });

  it('2. planned 03/11, not picked up yet, still matches', async () => {
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03'))).toContain(2);
  });

  it('3. planned and picked up on 03/11 is one row, and the count agrees', async () => {
    const res = await list('pickupDay', '2026-11-03', '2026-11-03');
    expect(ids(res).filter((id: number) => id === 3)).toEqual([3]);
    expect(res.total).toBe(res.data.length);
  });

  it('4. an order with neither day on 03/11 is excluded', async () => {
    const got = ids(await list('pickupDay', '2026-11-03', '2026-11-03'));
    expect(got).not.toContain(4); // planned 01/11, picked up 02/11
    expect(got).not.toContain(8); // planned 02/11 23:59:59
    expect(got).toEqual([1, 2, 3, 6, 7]);
  });

  it('5. no plan and not picked up (sale, draft) is excluded; soft-deleted orders are not listed', async () => {
    const got = ids(await list('pickupDay', '2026-11-03', '2026-11-03'));
    expect(got).not.toContain(5);
    expect(got).not.toContain(9);
  });

  it('7. Vietnam day boundary: picked up 00:30 on 03/11 (17:30Z on 02/11) is 03/11, not 02/11', async () => {
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03'))).toContain(7);
    const second = ids(await list('pickupDay', '2026-11-02', '2026-11-02'));
    expect(second).not.toContain(7);
    expect(second).toEqual([1, 4, 8]); // 1 planned 02/11, 4 picked up 02/11, 8 planned 23:59:59 on 02/11
  });

  it('a range of several days takes either column in any of the days', async () => {
    expect(ids(await list('pickupDay', '2026-11-02', '2026-11-03'))).toEqual([1, 2, 3, 4, 6, 7, 8]);
  });

  it('a start without an end is open-ended, as for the other fields', async () => {
    expect(ids(await list('pickupDay', '2026-11-03', undefined))).toEqual([1, 2, 3, 6, 7]);
    expect(ids(await list('pickupDay', undefined, '2026-11-01'))).toEqual([4]);
  });

  it('keeps pagination and totals: pages of 2 walk the same rows as one page', async () => {
    const one = await list('pickupDay', '2026-11-03', '2026-11-03');
    const p1 = await list('pickupDay', '2026-11-03', '2026-11-03', { page: 1, limit: 2 });
    const p2 = await list('pickupDay', '2026-11-03', '2026-11-03', { page: 2, limit: 2 });
    const p3 = await list('pickupDay', '2026-11-03', '2026-11-03', { page: 3, limit: 2 });
    expect([p1.total, p2.total, p3.total]).toEqual([5, 5, 5]);
    expect([...ids(p1), ...ids(p2), ...ids(p3)].sort()).toEqual(ids(one));
  });

  it('works with a status chip and the order type filter', async () => {
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03', { status: 'PICKUPED' }))).toEqual([3, 6, 7]);
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03', { status: 'RETURNED', orderType: 'RENT' }))).toEqual([1]);
  });

  it('works together with search, with or without the merchant filter (the search OR stays)', async () => {
    // order numbers are 1000<id>0: "100010" -> id 1, "100020" -> id 2, ...
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03', { q: '100010' }))).toEqual([1]);
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03', { q: '100040' }))).toEqual([]);
    expect(ids(await list('pickupDay', '2026-11-03', '2026-11-03', { q: '100020', merchantId: undefined }))).toEqual([2]);
  });

  it('sortBy=nearestTask keeps the date filter on every query of the page', async () => {
    const res = await list('pickupDay', '2026-11-03', '2026-11-03', { sortBy: 'nearestTask' });
    expect(ids(res).every((id: number) => [1, 2, 3, 6, 7].includes(id))).toBe(true);
    expect(res.total).toBe(5);
  });
});

describe('dateField=pickupPlanAt (installed mobile apps) keeps its meaning (#1472 regression guard)', () => {
  it('6. matches the planned day only, no OR, no pickedUpAt', async () => {
    expect(ids(await list('pickupPlanAt', '2026-11-03', '2026-11-03'))).toEqual([2, 3]);
    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    const { start, end } = { start: getUtcRangeForDateKeys({ from: '2026-11-03' }, TZ_VN).start, end: getUtcRangeForDateKeys({ from: '2026-11-03' }, TZ_VN).end };
    expect(where.pickupPlanAt).toEqual({ gte: start, lte: end, not: null });
    expect(where).not.toHaveProperty('OR');
    expect(where).not.toHaveProperty('AND');
    expect(where).not.toHaveProperty('pickedUpAt');
  });

  it('the other planned and actual fields are untouched', async () => {
    expect(ids(await list('pickedUpAt', '2026-11-03', '2026-11-03'))).toEqual([1, 3, 6, 7]);
    expect(ids(await list('returnedAt', '2026-11-03', '2026-11-03'))).toEqual([1]);
    expect(ids(await list(undefined, '2026-11-01', '2026-11-01')).length).toBe(8); // createdAt, deleted row left out
  });
});
