import { prisma } from '@rentalshop/database';
import { deriveMerchantLoyaltyCache } from '@/lib/loyalty-derive';

/**
 * Backfill loyalty points from historical orders — LEDGER-AUTHORITATIVE.
 *
 * INV-1: points === SUM(LoyaltyTransaction.points)
 * INV-2: re-run only deletes prior sync-backfill rows (metadata.source='sync')
 * INV-3: tier metric derived from Order
 * INV-4: skip orders that already have an earn tx
 */

const SYNC_SOURCE_MARKER = '"source":"sync"';

interface OrderPointStat {
  customerId: number;
  orderType: string;
  totalAmount: number;
  orderCount: number;
}

export async function syncLoyaltyHistoryForMerchant(
  merchantId: number,
  createdById: number
): Promise<{ customersProcessed: number; totalPointsIssued: number }> {
  const program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
  if (!program) {
    throw new Error('LOYALTY_PROGRAM_NOT_FOUND');
  }
  if (!program.isActive) {
    throw new Error('LOYALTY_PROGRAM_INACTIVE');
  }

  const tiers = await prisma.loyaltyTier.findMany({
    where: { programId: program.id },
    orderBy: { threshold: 'desc' },
  });

  const firstOutlet = await prisma.outlet.findFirst({
    where: { merchantId },
    select: { id: true },
  });

  const syncedAt = new Date().toISOString();

  return prisma.$transaction(async (tx) => {
    await tx.loyaltyTransaction.deleteMany({
      where: {
        merchantId,
        type: 'adjust',
        metadata: { contains: SYNC_SOURCE_MARKER },
      },
    });

    const orderStats = await tx.$queryRaw<OrderPointStat[]>`
      SELECT o."customerId",
             o."orderType",
             SUM(o."totalAmount")::float8 AS "totalAmount",
             COUNT(*)::int              AS "orderCount"
      FROM "Order" o
      JOIN "Outlet" out ON o."outletId" = out.id
      WHERE out."merchantId" = ${merchantId}
        AND o.status IN ('COMPLETED', 'RETURNED')
        AND o."customerId" IS NOT NULL
        AND o."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "LoyaltyTransaction" t
          WHERE t."orderId" = o.id AND t.type = 'earn'
        )
      GROUP BY o."customerId", o."orderType"
    `;

    const backfillPoints = new Map<number, number>();
    for (const stat of orderStats) {
      const amount = Number(stat.totalAmount);
      let perAmount = 0;
      let rate = 0;
      if (stat.orderType === 'RENT' && program.rentEarnEnabled) {
        perAmount = program.rentEarnPerAmount;
        rate = program.rentEarnRate;
      } else if (stat.orderType === 'SALE' && program.saleEarnEnabled) {
        perAmount = program.saleEarnPerAmount;
        rate = program.saleEarnRate;
      }
      const points = perAmount > 0 && rate > 0 ? Math.floor(amount / perAmount) * rate : 0;
      backfillPoints.set(stat.customerId, (backfillPoints.get(stat.customerId) || 0) + points);
    }

    const existingLedger = await tx.loyaltyTransaction.groupBy({
      by: ['customerId'],
      where: { merchantId },
      _sum: { points: true },
    });
    const runningBalance = new Map<number, number>();
    for (const row of existingLedger) {
      runningBalance.set(row.customerId, row._sum.points || 0);
    }

    let issued = 0;
    for (const [customerId, points] of backfillPoints) {
      if (points <= 0) continue;

      const balanceAfter = (runningBalance.get(customerId) || 0) + points;
      runningBalance.set(customerId, balanceAfter);

      await tx.customerLoyalty.upsert({
        where: { customerId_merchantId: { customerId, merchantId } },
        create: { customerId, merchantId, points: 0 },
        update: {},
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          merchantId,
          outletId: firstOutlet?.id ?? null,
          type: 'adjust',
          points,
          balanceAfter,
          description: 'Đồng bộ lịch sử đơn hàng',
          metadata: JSON.stringify({ source: 'sync', syncedAt }),
          createdById,
        },
      });

      issued += points;
    }

    const customersProcessed = await deriveMerchantLoyaltyCache(tx, merchantId, program, tiers);
    return { customersProcessed, totalPointsIssued: issued };
  });
}
