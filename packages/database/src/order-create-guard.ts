import { createHash } from 'crypto';
import { prisma } from './client';

/**
 * #341 — one Save / Confirm must create one order.
 *
 * A client that sends an `Idempotency-Key` (iOS / Android from this release) gets exactly one order per
 * key: "find the order for (user, key) → else insert and store the key" runs in one transaction under a
 * Postgres advisory lock for (user, key), so a second in-flight or retried create returns the first order.
 *
 * Without a key (installed apps, web) the order is created exactly as before. Owner decision 2026-10-05:
 * no time-window matching of "identical" orders.
 */

/** First int of `pg_advisory_xact_lock(int, int)`, so these locks never collide with other features. */
export const ORDER_CREATE_LOCK_NAMESPACE = 341;

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** An `Idempotency-Key` header value we accept, or null (missing or malformed keys are ignored). */
export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  return IDEMPOTENCY_KEY_PATTERN.test(key) ? key : null;
}

/** Signed 32-bit lock key for one (user, key) pair. */
export function orderCreateLockKey(userId: number, key: string): number {
  return createHash('sha256').update(`${userId}:${key}`).digest().readInt32BE(0);
}

/**
 * Create the order, or return the one this key already made.
 * `replay: true` means nothing was inserted; callers must skip create side effects (stock, loyalty, audit, push).
 */
export async function createOrderOnce(
  createdById: number,
  rawIdempotencyKey: string | null | undefined,
  data: any,
  include: any
): Promise<{ order: any; replay: boolean }> {
  const key = normalizeIdempotencyKey(rawIdempotencyKey);
  if (!key) {
    return { order: await prisma.order.create({ data, include }), replay: false };
  }

  return prisma.$transaction(
    async (tx: any) => {
      // Held until this transaction commits or rolls back
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ORDER_CREATE_LOCK_NAMESPACE}::int4, ${orderCreateLockKey(createdById, key)}::int4)`;

      // A missing OrderCreateKey table (migration not applied yet) must not abort the create:
      // roll back to the savepoint and create without the key.
      let keyTableReady = false;
      await tx.$executeRaw`SAVEPOINT order_create_key`;
      try {
        const row = await tx.orderCreateKey.findUnique({ where: { userId_key: { userId: createdById, key } } });
        keyTableReady = true;
        if (row) {
          const existing = await tx.order.findFirst({ where: { id: row.orderId, deletedAt: null }, include });
          if (existing) return { order: existing, replay: true };
        }
      } catch (error) {
        keyTableReady = false;
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT order_create_key`;
        console.warn('⚠️ OrderCreateKey unavailable, creating without the key:', (error as Error)?.message);
      }

      const order = await tx.order.create({ data, include });

      if (keyTableReady) {
        await tx.orderCreateKey.upsert({
          where: { userId_key: { userId: createdById, key } },
          create: { userId: createdById, key, orderId: order.id },
          update: { orderId: order.id },
        });
      }

      return { order, replay: false };
    },
    // A retry may wait on the lock while the first create finishes
    { maxWait: 5000, timeout: 15000 }
  );
}
