/**
 * Change history reads (#519): who may read an order's / product's history, and the
 * GET /changes query. Takes the Prisma client as a parameter so route tests can pass a fake.
 */
import { buildChangeTimeline, type ChangeEntityType, type ChangeEntry, type ChangeLogRow } from './change-timeline';

const PLATFORM_ROLES = ['ADMIN', 'OPS'];
const OUTLET_ROLES = ['OUTLET_ADMIN', 'OUTLET_STAFF'];

export interface HistoryCaller {
  role: string;
  merchantId?: number | null;
  outletId?: number | null;
}

/** Minimal Prisma surface used here (the real client is passed in; tests pass a fake). */
export interface HistoryDb {
  order: { findUnique: (args: unknown) => Promise<{ outletId: number; outlet?: { merchantId: number } | null } | null> };
  product: { findUnique: (args: unknown) => Promise<{ merchantId: number } | null> };
  auditLog: {
    findMany: (args: unknown) => Promise<ChangeLogRow[]>;
    count: (args: unknown) => Promise<number>;
    findFirst: (args: unknown) => Promise<{ createdAt: Date | string } | null>;
  };
}

export function isOutletRole(role: string): boolean {
  return OUTLET_ROLES.includes(role);
}

/**
 * True when the caller may read this order's history: platform roles always; other roles only for
 * an order of their merchant; outlet roles only for an order of their outlet. Soft-deleted orders
 * are included (their history is still readable by the owner).
 */
export async function canReadOrderHistory(db: HistoryDb, orderId: number, caller: HistoryCaller): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, outletId: true, outlet: { select: { merchantId: true } } },
  });
  if (!order) return false;
  if (PLATFORM_ROLES.includes(caller.role)) return true;
  if (!caller.merchantId || order.outlet?.merchantId !== caller.merchantId) return false;
  if (isOutletRole(caller.role)) return caller.outletId != null && order.outletId === caller.outletId;
  return true;
}

/** True when the product belongs to the caller's merchant (platform roles: always). */
export async function canReadProductHistory(db: HistoryDb, productId: number, caller: HistoryCaller): Promise<boolean> {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, merchantId: true } });
  if (!product) return false;
  if (PLATFORM_ROLES.includes(caller.role)) return true;
  return !!caller.merchantId && product.merchantId === caller.merchantId;
}

export interface ChangeTimelinePage {
  entries: ChangeEntry[];
  total: number;
  latestAt: string | null;
}

/**
 * One page of readable entries, newest first, plus the total row count and the newest instant
 * (for "6 lần thay đổi · gần nhất 15:10"). `outletId` limits rows to those written in that outlet
 * plus shop-level rows (no outlet, e.g. the owner's price edits), which apply to every outlet.
 * Only names and roles of users are read: no email, IP or user agent.
 */
export async function loadChangeTimeline(
  db: HistoryDb,
  params: { entityType: ChangeEntityType; entityId: number; outletId?: number | null; limit: number; offset: number }
): Promise<ChangeTimelinePage> {
  const where: Record<string, unknown> = { entityType: params.entityType, entityId: String(params.entityId) };
  if (params.outletId != null) where.OR = [{ outletId: params.outletId }, { outletId: null }];
  const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  const [rows, total, latest] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy,
      take: params.limit,
      skip: params.offset,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    }),
    db.auditLog.count({ where }),
    params.offset === 0 ? Promise.resolve(null) : db.auditLog.findFirst({ where, orderBy, select: { createdAt: true } }),
  ]);

  const entries = buildChangeTimeline(rows, params.entityType);
  const latestAt = params.offset === 0 ? (entries[0]?.at ?? null) : latest?.createdAt ? new Date(latest.createdAt).toISOString() : null;
  return { entries, total, latestAt };
}
