import { createHash } from 'crypto';
import { prisma } from './client';

/**
 * #341 — one Save / Confirm must create one order.
 *
 * `createOrderOnce` runs "find the order this request already made → else insert" inside one
 * transaction that first takes a Postgres advisory lock for (outlet, customer, creator). A second
 * in-flight or retried create therefore waits for the first, then finds and returns its order.
 *
 * - With an Idempotency-Key (new apps): the order is found through `OrderCreateKey(userId, key)`.
 * - Without one (installed apps, web): an identical order by the same staff in the last 60 s is the match.
 */

/** First int of `pg_advisory_xact_lock(int, int)`, so these locks never collide with other features. */
export const ORDER_CREATE_LOCK_NAMESPACE = 341;
/** Installed apps send no key; an identical order created this recently is treated as the same create. */
export const ORDER_DUPLICATE_WINDOW_MS = 60_000;

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export type OrderCreateGuardItem = { productId: number; quantity: number };

export type OrderCreateGuard = {
  outletId: number;
  customerId?: number | null;
  createdById: number;
  orderType: string;
  totalAmount: number;
  pickupPlanAt?: Date | null;
  returnPlanAt?: Date | null;
  /** Lines as persisted (resolved product id), not as requested. */
  items: OrderCreateGuardItem[];
  /** Raw `Idempotency-Key` header; malformed values are ignored (treated as no key). */
  idempotencyKey?: string | null;
};

/** An `Idempotency-Key` header value we accept, or null (missing or malformed keys are ignored). */
export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  return IDEMPOTENCY_KEY_PATTERN.test(key) ? key : null;
}

/** Order-independent composition: the same lines in another order give the same signature. */
export function orderItemSignature(items: OrderCreateGuardItem[]): string {
  return items
    .map((item) => `${Number(item.productId)}x${Number(item.quantity)}`)
    .sort()
    .join('|');
}

/** Signed 32-bit lock key for (outlet, customer or walk-in, creator). */
export function orderCreateLockKey(guard: Pick<OrderCreateGuard, 'outletId' | 'customerId' | 'createdById'>): number {
  const scope = `${guard.outletId}:${guard.customerId ?? 'walk-in'}:${guard.createdById}`;
  return createHash('sha256').update(scope).digest().readInt32BE(0);
}

async function findRecentDuplicate(tx: any, guard: OrderCreateGuard, include: any, windowMs: number) {
  const candidates = await tx.order.findMany({
    where: {
      deletedAt: null,
      outletId: guard.outletId,
      customerId: guard.customerId ?? null,
      createdById: guard.createdById,
      orderType: guard.orderType,
      totalAmount: guard.totalAmount,
      pickupPlanAt: guard.pickupPlanAt ?? null,
      returnPlanAt: guard.returnPlanAt ?? null,
      status: { not: 'CANCELLED' },
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include,
  });
  const wanted = orderItemSignature(guard.items);
  return (
    candidates.find(
      (candidate: any) =>
        orderItemSignature(
          (candidate.orderItems || []).map((item: any) => ({
            productId: item.productId ?? 0,
            quantity: item.quantity,
          }))
        ) === wanted
    ) || null
  );
}

export type CreateOrderOnceOptions = {
  /**
   * #518: runs inside the transaction after the replay lookup and right before the insert. A non-null
   * result cancels the insert and is returned as `blocked` (with `order: null`). A retried create
   * therefore still replays its existing order instead of being blocked by it.
   */
  beforeInsert?: (tx: unknown) => Promise<unknown>;
};

/**
 * Create the order, or return the one this create already made.
 * `replay: true` means nothing was inserted; callers must skip create side effects (stock, loyalty, audit, push).
 * `blocked` (only with `options.beforeInsert`) means nothing was inserted because the hook refused.
 */
export async function createOrderOnce(
  guard: OrderCreateGuard,
  data: any,
  include: any,
  windowMs: number = ORDER_DUPLICATE_WINDOW_MS,
  options: CreateOrderOnceOptions = {}
): Promise<{ order: any; replay: boolean; blocked?: unknown }> {
  const lockKey = orderCreateLockKey(guard);
  const key = normalizeIdempotencyKey(guard.idempotencyKey);

  return prisma.$transaction(
    async (tx: any) => {
      // Held until this transaction commits or rolls back
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ORDER_CREATE_LOCK_NAMESPACE}::int4, ${lockKey}::int4)`;

      let keyTableReady = false;
      if (key) {
        // A missing OrderCreateKey table (migration not applied yet) must not abort the create:
        // roll back to the savepoint and use the duplicate window instead.
        await tx.$executeRaw`SAVEPOINT order_create_key`;
        try {
          const row = await tx.orderCreateKey.findUnique({
            where: { userId_key: { userId: guard.createdById, key } },
          });
          keyTableReady = true;
          if (row) {
            const existing = await tx.order.findFirst({ where: { id: row.orderId, deletedAt: null }, include });
            if (existing) return { order: existing, replay: true };
          }
        } catch (error) {
          keyTableReady = false;
          await tx.$executeRaw`ROLLBACK TO SAVEPOINT order_create_key`;
          console.warn('⚠️ OrderCreateKey unavailable, using the duplicate window:', (error as Error)?.message);
        }
      }

      if (!keyTableReady) {
        const existing = await findRecentDuplicate(tx, guard, include, windowMs);
        if (existing) return { order: existing, replay: true };
      }

      if (options.beforeInsert) {
        const blocked = await options.beforeInsert(tx);
        if (blocked != null) return { order: null, replay: false, blocked };
      }

      const order = await tx.order.create({ data, include });

      if (key && keyTableReady) {
        await tx.orderCreateKey.upsert({
          where: { userId_key: { userId: guard.createdById, key } },
          create: { userId: guard.createdById, key, orderId: order.id },
          update: { orderId: order.id },
        });
      }

      return { order, replay: false };
    },
    // A request may wait on the lock while the first create finishes
    { maxWait: 5000, timeout: 15000 }
  );
}
