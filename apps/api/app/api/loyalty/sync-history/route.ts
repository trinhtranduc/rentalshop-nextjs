import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';
import { deriveMerchantLoyaltyCache } from '@/lib/loyalty-derive';

/**
 * Backfill loyalty points from historical orders — LEDGER-AUTHORITATIVE.
 *
 * Architecture guarantees (see .kiro/specs/loyalty-program/architecture.md):
 *  - INV-1: points === SUM(LoyaltyTransaction.points). We NEVER assign `points`
 *    from an order-derived number; we create ledger rows then DERIVE the cache.
 *  - INV-2: ledger is append-only. Re-running only deletes PRIOR sync-backfill rows
 *    (identified by metadata.source='sync'), never real earn/redeem/refund/adjust.
 *  - INV-3: tier metric (totalSpent/totalOrders) is derived from Order, gross.
 *  - INV-4: never double-count — backfill skips orders that already have an `earn` tx.
 *
 * Result: running this repeatedly is idempotent and correct even when real-time
 * earn/redeem happened between runs (no phantom points, no double-count).
 */

const SYNC_SOURCE_MARKER = '"source":"sync"';

interface OrderPointStat {
  customerId: number;
  orderType: string;
  totalAmount: number;
  orderCount: number;
}

export const POST = withPermissions(['loyalty.manage'])(async (_request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
    if (!program) {
      return NextResponse.json(
        ResponseBuilder.error('Chưa tạo chương trình loyalty.'),
        { status: 400 }
      );
    }
    if (!program.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('Chương trình loyalty chưa được kích hoạt.'),
        { status: 400 }
      );
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

    const { customersProcessed, totalPointsIssued } = await prisma.$transaction(async (tx) => {
      // 1. Remove ONLY prior sync-backfill rows. Real earn/redeem/refund/adjust stay intact.
      await tx.loyaltyTransaction.deleteMany({
        where: {
          merchantId,
          type: 'adjust',
          metadata: { contains: SYNC_SOURCE_MARKER },
        },
      });

      // 2. Historical points per customer — ONLY from orders WITHOUT an existing earn tx
      //    (INV-4: avoid double-counting orders that already earned in real time).
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

      // 3. Existing ledger balance per customer (after deletion, before inserting backfill)
      const existingLedger = await tx.loyaltyTransaction.groupBy({
        by: ['customerId'],
        where: { merchantId },
        _sum: { points: true },
      });
      const runningBalance = new Map<number, number>();
      for (const row of existingLedger) {
        runningBalance.set(row.customerId, row._sum.points || 0);
      }

      // 4. Create ONE backfill `adjust` per customer; balanceAfter = SUM(ledger) after insert (INV-1)
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
            createdById: user.id,
          },
        });

        issued += points;
      }

      // 5. DERIVE cache from the two sources of truth (shared with recalculate; never-downgrade).
      const customersProcessed = await deriveMerchantLoyaltyCache(tx, merchantId, program, tiers);

      return { customersProcessed, totalPointsIssued: issued };
    });

    return NextResponse.json(
      ResponseBuilder.success('SYNC_HISTORY_SUCCESS', {
        customersProcessed,
        totalPointsIssued,
      })
    );
  } catch (error) {
    const gateResponse = loyaltyErrorResponse(error);
    if (
      error instanceof Error &&
      ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)
    ) {
      return gateResponse;
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
