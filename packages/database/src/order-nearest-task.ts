/**
 * `sortBy=nearestTask` for the orders list (#389). Kept free of heavy imports so it can be unit tested.
 *
 * Order:
 *   1. open orders by their task instant, ascending — RESERVED by `pickupPlanAt`, PICKUPED by `returnPlanAt`.
 *      Every late task (before 00:00 Vietnam today) sorts ahead of today's and later ones, so "late first, then the
 *      nearest" needs no time-zone math. Open orders without a task date come after the dated ones.
 *   2. RETURNED / COMPLETED / CANCELLED, newest first (`createdAt` desc).
 *
 * Prisma cannot order by "pickupPlanAt or returnPlanAt depending on status", so a page is planned from two light,
 * SQL-sorted queries (id + one date, at most `page × limit` rows each) merged in memory, then one closed-orders
 * query with skip/take. Cost grows with the page number inside the open segment, not with the table size.
 */
export const OPEN_TASK_FIELD = { RESERVED: 'pickupPlanAt', PICKUPED: 'returnPlanAt' } as const;
export const CLOSED_ORDER_STATUSES = ['RETURNED', 'COMPLETED', 'CANCELLED'] as const;

export interface TaskRow {
  id: number;
  at: Date | null;
}

const taskTime = (row: TaskRow) => (row.at ? row.at.getTime() : Number.POSITIVE_INFINITY);

/** Both open lists merged by task instant (nulls last), ties by id → stable pages. */
export function mergeNearestTasks(reserved: TaskRow[], pickuped: TaskRow[]): number[] {
  return [...reserved, ...pickuped]
    .sort((a, b) => taskTime(a) - taskTime(b) || a.id - b.id)
    .map((row) => row.id);
}

/**
 * Which slices a page needs: `openTake` rows from each open list (merged, then sliced from `openSkip`) and
 * `closedSkip` / `closedTake` from the closed list.
 */
export function planNearestTaskPage({ openCount, offset, limit }: { openCount: number; offset: number; limit: number }) {
  if (offset >= openCount) {
    return { openTake: 0, openSkip: 0, closedSkip: offset - openCount, closedTake: limit };
  }
  const openEnd = Math.min(offset + limit, openCount);
  return { openTake: openEnd, openSkip: offset, closedSkip: 0, closedTake: limit - (openEnd - offset) };
}

interface OrderClient {
  order: {
    count: (args: any) => Promise<number>;
    findMany: (args: any) => Promise<any[]>;
  };
}

/** Ordered order ids of one page; `where` is the full list filter (scope, status, type, search, dates). */
export async function findNearestTaskPageIds(
  prisma: OrderClient,
  where: Record<string, unknown>,
  page: number,
  limit: number
): Promise<number[]> {
  const offset = (Math.max(1, page) - 1) * limit;
  const segment = (extra: Record<string, unknown>) => ({ AND: [where, extra] });

  const [reservedCount, pickupedCount] = await Promise.all([
    prisma.order.count({ where: segment({ status: 'RESERVED' }) }),
    prisma.order.count({ where: segment({ status: 'PICKUPED' }) }),
  ]);
  const plan = planNearestTaskPage({ openCount: reservedCount + pickupedCount, offset, limit });

  const openRows = async (status: keyof typeof OPEN_TASK_FIELD, count: number): Promise<TaskRow[]> => {
    if (plan.openTake === 0 || count === 0) return [];
    const field = OPEN_TASK_FIELD[status];
    const rows = await prisma.order.findMany({
      where: segment({ status }),
      select: { id: true, [field]: true },
      orderBy: [{ [field]: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      take: plan.openTake,
    });
    return rows.map((row: any) => ({ id: row.id, at: row[field] ? new Date(row[field]) : null }));
  };

  const [reserved, pickuped] = await Promise.all([
    openRows('RESERVED', reservedCount),
    openRows('PICKUPED', pickupedCount),
  ]);
  const openIds = mergeNearestTasks(reserved, pickuped).slice(plan.openSkip, plan.openSkip + limit);

  let closedIds: number[] = [];
  if (plan.closedTake > 0) {
    const rows = await prisma.order.findMany({
      where: segment({ status: { in: [...CLOSED_ORDER_STATUSES] } }),
      select: { id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: plan.closedSkip,
      take: plan.closedTake,
    });
    closedIds = rows.map((row: any) => row.id);
  }
  return [...openIds, ...closedIds];
}
