import type { Prisma } from '@prisma/client';

/**
 * Shared loyalty cache derivation (see .kiro/specs/loyalty-program/architecture.md §6).
 *
 * Two sources of truth, never mixed:
 *   - points / totalEarned / totalRedeemed  <-  LoyaltyTransaction ledger (INV-1)
 *   - totalSpent / totalOrders              <-  Order (gross, completed/returned) (INV-3)
 *   - tier                                  <-  metric, NEVER downgrades in V1 (INV-3)
 *
 * Reused by: sync-history (backfill), recalculate (fix cache), reevaluate-tiers.
 */

interface LedgerAggregate {
  customerId: number;
  balance: number;
  earned: number;
  redeemed: number;
}

interface OrderAggregate {
  customerId: number;
  spent: number;
  orders: number;
}

export interface TierLike {
  id: number;
  threshold: number;
  name?: string;
}

interface ProgramMetricLike {
  tierMetric: string;
}

/** Ledger aggregate per customer for a merchant: balance, positive-earned, redeemed. */
async function aggregateLedger(
  tx: Prisma.TransactionClient,
  merchantId: number
): Promise<Map<number, LedgerAggregate>> {
  const rows = await tx.$queryRaw<LedgerAggregate[]>`
    SELECT t."customerId",
           SUM(t.points)::int                                             AS balance,
           SUM(CASE WHEN t.points > 0 THEN t.points ELSE 0 END)::int      AS earned,
           SUM(CASE WHEN t.type = 'redeem' THEN -t.points ELSE 0 END)::int AS redeemed
    FROM "LoyaltyTransaction" t
    WHERE t."merchantId" = ${merchantId}
    GROUP BY t."customerId"
  `;
  const map = new Map<number, LedgerAggregate>();
  for (const r of rows) map.set(r.customerId, r);
  return map;
}

/** Order aggregate per customer for a merchant: gross spent, order count (completed/returned). */
async function aggregateOrders(
  tx: Prisma.TransactionClient,
  merchantId: number
): Promise<Map<number, OrderAggregate>> {
  const rows = await tx.$queryRaw<OrderAggregate[]>`
    SELECT o."customerId",
           SUM(o."totalAmount")::float8 AS spent,
           COUNT(*)::int                AS orders
    FROM "Order" o
    JOIN "Outlet" out ON o."outletId" = out.id
    WHERE out."merchantId" = ${merchantId}
      AND o.status IN ('COMPLETED', 'RETURNED')
      AND o."customerId" IS NOT NULL
      AND o."deletedAt" IS NULL
    GROUP BY o."customerId"
  `;
  const map = new Map<number, OrderAggregate>();
  for (const r of rows) map.set(r.customerId, r);
  return map;
}

/**
 * Pick the tier a customer qualifies for by metric, honoring NEVER-DOWNGRADE (INV-3):
 * the result is the higher of {current tier, newly-qualifying tier}.
 * `tiers` must be sorted by threshold DESC.
 */
function resolveTierNeverDowngrade(
  metricValue: number,
  currentTierId: number | null,
  tiers: TierLike[]
): number | null {
  const qualifying = tiers.find((t) => metricValue >= t.threshold) ?? null;
  const current = currentTierId ? tiers.find((t) => t.id === currentTierId) ?? null : null;

  if (current && qualifying) {
    return current.threshold >= qualifying.threshold ? current.id : qualifying.id;
  }
  return qualifying?.id ?? current?.id ?? null;
}

/**
 * Full authoritative rebuild of the loyalty cache for EVERY customer of a merchant.
 * Idempotent: run it any time to reconcile CustomerLoyalty with the ledger + orders.
 * Returns number of customers reconciled.
 */
export async function deriveMerchantLoyaltyCache(
  tx: Prisma.TransactionClient,
  merchantId: number,
  program: ProgramMetricLike,
  tiers: TierLike[]
): Promise<number> {
  const [ledger, orders, existing] = await Promise.all([
    aggregateLedger(tx, merchantId),
    aggregateOrders(tx, merchantId),
    tx.customerLoyalty.findMany({
      where: { merchantId },
      select: { customerId: true, currentTierId: true },
    }),
  ]);

  const currentTierByCustomer = new Map<number, number | null>();
  for (const e of existing) currentTierByCustomer.set(e.customerId, e.currentTierId);

  const affected = new Set<number>([...ledger.keys(), ...orders.keys()]);

  for (const customerId of affected) {
    const l = ledger.get(customerId);
    const o = orders.get(customerId);

    const points = Number(l?.balance ?? 0);
    const totalEarned = Number(l?.earned ?? 0);
    const totalRedeemed = Number(l?.redeemed ?? 0);
    const totalSpent = Number(o?.spent ?? 0);
    const totalOrders = Number(o?.orders ?? 0);

    const metricValue = program.tierMetric === 'total_orders' ? totalOrders : totalSpent;
    const currentTierId = resolveTierNeverDowngrade(
      metricValue,
      currentTierByCustomer.get(customerId) ?? null,
      tiers
    );

    await tx.customerLoyalty.upsert({
      where: { customerId_merchantId: { customerId, merchantId } },
      create: {
        customerId,
        merchantId,
        points,
        totalEarned,
        totalRedeemed,
        totalSpent,
        totalOrders,
        currentTierId,
      },
      update: {
        points,
        totalEarned,
        totalRedeemed,
        totalSpent,
        totalOrders,
        currentTierId,
      },
    });
  }

  return affected.size;
}

/**
 * Re-evaluate tiers ONLY (§6b). Recomputes totalSpent/totalOrders from orders and moves
 * customers UP to a newly-qualifying tier. Never touches points balance. Never downgrades.
 * Logs a `tier_upgrade` transaction for each upgrade. Returns number of upgrades.
 */
export async function reevaluateMerchantTiers(
  tx: Prisma.TransactionClient,
  merchantId: number,
  program: ProgramMetricLike,
  tiers: TierLike[]
): Promise<number> {
  const orders = await aggregateOrders(tx, merchantId);
  const existing = await tx.customerLoyalty.findMany({
    where: { merchantId },
    select: { id: true, customerId: true, currentTierId: true, points: true },
  });

  const existingByCustomer = new Map<number, (typeof existing)[number]>(
    existing.map((e) => [e.customerId, e])
  );
  const affected = new Set<number>([...existingByCustomer.keys(), ...orders.keys()]);
  const tierById = new Map<number, TierLike>(tiers.map((t) => [t.id, t]));

  let upgrades = 0;

  for (const customerId of affected) {
    const o = orders.get(customerId);
    const row = existingByCustomer.get(customerId);

    const totalSpent = Number(o?.spent ?? 0);
    const totalOrders = Number(o?.orders ?? 0);
    const metricValue = program.tierMetric === 'total_orders' ? totalOrders : totalSpent;

    const currentTierId = row?.currentTierId ?? null;
    const nextTierId = resolveTierNeverDowngrade(metricValue, currentTierId, tiers);

    // Ensure a record exists; refresh the tier-metric fields (safe, order-derived).
    const cl = await tx.customerLoyalty.upsert({
      where: { customerId_merchantId: { customerId, merchantId } },
      create: {
        customerId,
        merchantId,
        totalSpent,
        totalOrders,
        currentTierId: nextTierId,
      },
      update: {
        totalSpent,
        totalOrders,
        currentTierId: nextTierId,
      },
    });

    if (nextTierId && nextTierId !== currentTierId) {
      upgrades += 1;
      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          merchantId,
          type: 'tier_upgrade',
          points: 0,
          balanceAfter: cl.points,
          description: `Cập nhật hạng: ${tierById.get(nextTierId)?.name ?? `#${nextTierId}`}`,
          metadata: JSON.stringify({
            source: 'reevaluate',
            fromTierId: currentTierId,
            toTierId: nextTierId,
          }),
        },
      });
    }
  }

  return upgrades;
}
