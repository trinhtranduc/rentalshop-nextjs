/**
 * #389 — `GET /api/orders?sortBy=nearestTask`: late tasks first (RESERVED with pickup before today, PICKUPED with
 * return before today, in Vietnam days), then the nearest planned pickup / return, then RETURNED / COMPLETED /
 * CANCELLED. Prisma cannot order by "pickupPlanAt or returnPlanAt depending on status", so the page is planned from
 * two light, index-friendly queries and merged.
 *
 * Ascending task instants put every late task (before 00:00 Vietnam today) ahead of today's and later ones, so the
 * order does not depend on the server time zone. Run with TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  mergeNearestTasks,
  planNearestTaskPage,
  findNearestTaskPageIds,
  CLOSED_ORDER_STATUSES,
} from '../../../packages/database/src/order-nearest-task';

const at = (iso: string | null) => (iso ? new Date(iso) : null);

describe('nearest-task order (#389)', () => {
  // "Today" in Vietnam = 2026-10-04 (starts 2026-10-03T17:00:00Z)
  const reserved = [
    { id: 11, at: at('2026-10-03T16:59:59Z') }, // pickup 23:59:59 on 03/10 VN → late
    { id: 12, at: at('2026-10-03T17:00:00Z') }, // pickup 00:00 on 04/10 VN → today, not late
    { id: 13, at: at('2026-10-06T02:00:00Z') },
    { id: 14, at: null }, // no planned pickup
  ];
  const pickuped = [
    { id: 21, at: at('2026-09-30T03:00:00Z') }, // return 30/09 → late, most overdue
    { id: 22, at: at('2026-10-05T03:00:00Z') },
  ];

  it('merges both open lists by task instant: late first, then nearest, undated last', () => {
    expect(mergeNearestTasks(reserved, pickuped)).toEqual([21, 11, 12, 22, 13, 14]);
  });

  it('breaks ties by id so pages are stable', () => {
    const same = at('2026-10-05T03:00:00Z');
    expect(mergeNearestTasks([{ id: 9, at: same }], [{ id: 3, at: same }])).toEqual([3, 9]);
  });

  it('plans a page inside the open orders', () => {
    expect(planNearestTaskPage({ openCount: 30, offset: 0, limit: 20 })).toEqual({ openTake: 20, openSkip: 0, closedSkip: 0, closedTake: 0 });
  });

  it('plans a page across the open / closed boundary', () => {
    expect(planNearestTaskPage({ openCount: 30, offset: 20, limit: 20 })).toEqual({ openTake: 30, openSkip: 20, closedSkip: 0, closedTake: 10 });
  });

  it('plans a page of closed orders only', () => {
    expect(planNearestTaskPage({ openCount: 30, offset: 40, limit: 20 })).toEqual({ openTake: 0, openSkip: 0, closedSkip: 10, closedTake: 20 });
  });

  it('closed statuses are RETURNED, COMPLETED and CANCELLED', () => {
    expect([...CLOSED_ORDER_STATUSES].sort()).toEqual(['CANCELLED', 'COMPLETED', 'RETURNED']);
  });

  describe('findNearestTaskPageIds', () => {
    // Base where = merchant scope + outlet + a search; every segment must keep it
    const baseWhere = { deletedAt: null, outletId: 5, outlet: { merchantId: 2 } };

    function fakePrisma() {
      const rows: Record<string, any[]> = {
        RESERVED: reserved.map((r) => ({ id: r.id, pickupPlanAt: r.at })),
        PICKUPED: pickuped.map((r) => ({ id: r.id, returnPlanAt: r.at })),
        CLOSED: [{ id: 41 }, { id: 42 }, { id: 43 }],
      };
      const segment = (where: any) => {
        const status = where.AND[1].status;
        return typeof status === 'string' ? status : 'CLOSED';
      };
      return {
        order: {
          count: jest.fn(async ({ where }: any) => rows[segment(where)].length),
          findMany: jest.fn(async ({ where, take, skip = 0 }: any) => rows[segment(where)].slice(skip, skip + take)),
        },
      };
    }

    it('returns the first page in nearest-task order', async () => {
      const prisma = fakePrisma();
      expect(await findNearestTaskPageIds(prisma as any, baseWhere, 1, 4)).toEqual([21, 11, 12, 22]);
    });

    it('fills a page past the open orders with closed ones (newest first)', async () => {
      const prisma = fakePrisma();
      expect(await findNearestTaskPageIds(prisma as any, baseWhere, 2, 4)).toEqual([13, 14, 41, 42]);
      const closedCall = prisma.order.findMany.mock.calls.find(([a]: any) => a.where.AND[1].status.in);
      expect(closedCall[0]).toMatchObject({ skip: 0, take: 2, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    });

    it('keeps the merchant / outlet scope and filters in every query', async () => {
      const prisma = fakePrisma();
      await findNearestTaskPageIds(prisma as any, baseWhere, 2, 4);
      const calls = [...prisma.order.count.mock.calls, ...prisma.order.findMany.mock.calls];
      expect(calls.length).toBeGreaterThan(0);
      for (const [args] of calls) expect(args.where.AND[0]).toBe(baseWhere);
    });

    it('reads at most page × limit light rows per open status, sorted in SQL', async () => {
      const prisma = fakePrisma();
      await findNearestTaskPageIds(prisma as any, baseWhere, 1, 4);
      const reservedCall = prisma.order.findMany.mock.calls.find(([a]: any) => a.where.AND[1].status === 'RESERVED');
      expect(reservedCall[0]).toEqual({
        where: { AND: [baseWhere, { status: 'RESERVED' }] },
        select: { id: true, pickupPlanAt: true },
        orderBy: [{ pickupPlanAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
        take: 4,
      });
    });

    it('CANCELLED orders never come before an open task', async () => {
      const prisma = fakePrisma();
      const all = await findNearestTaskPageIds(prisma as any, baseWhere, 1, 50);
      expect(all).toEqual([21, 11, 12, 22, 13, 14, 41, 42, 43]);
    });
  });
});
