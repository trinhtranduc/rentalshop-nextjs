import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

interface OrderStat {
  customerId: number;
  orderType: string;
  totalAmount: bigint | number;
  orderCount: number;
}

export const POST = withPermissions(['loyalty.manage'])(async (_request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    // 1. Get the loyalty program — must exist and be active
    const program = await prisma.loyaltyProgram.findUnique({
      where: { merchantId },
    });

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

    // 2. Get all tiers for tier assignment
    const tiers = await prisma.loyaltyTier.findMany({
      where: { programId: program.id },
      orderBy: { threshold: 'desc' },
    });

    // 3. Clean slate — delete existing loyalty data for this merchant (idempotent)
    await prisma.loyaltyPointLot.deleteMany({
      where: { customerLoyalty: { merchantId } },
    });
    await prisma.loyaltyTransaction.deleteMany({
      where: { merchantId },
    });
    await prisma.customerLoyalty.deleteMany({
      where: { merchantId },
    });

    // 4. Query all completed/returned orders grouped by customer + orderType
    const orderStats = await prisma.$queryRaw<OrderStat[]>`
      SELECT o."customerId",
             o."orderType",
             SUM(o."totalAmount")::bigint as "totalAmount",
             COUNT(*)::int as "orderCount"
      FROM "Order" o
      JOIN "Outlet" out ON o."outletId" = out.id
      WHERE out."merchantId" = ${merchantId}
        AND o.status IN ('COMPLETED', 'RETURNED')
        AND o."customerId" IS NOT NULL
        AND o."deletedAt" IS NULL
      GROUP BY o."customerId", o."orderType"
    `;

    // 5. Aggregate per customer
    const customerMap = new Map<number, {
      totalSpent: number;
      totalOrders: number;
      points: number;
    }>();

    for (const stat of orderStats) {
      const existing = customerMap.get(stat.customerId) || {
        totalSpent: 0,
        totalOrders: 0,
        points: 0,
      };

      const amount = Number(stat.totalAmount);
      const orders = Number(stat.orderCount);
      existing.totalSpent += amount;
      existing.totalOrders += orders;

      // Calculate points based on order type
      let earnPerAmount = 0;
      let earnRate = 0;

      if (stat.orderType === 'RENT' && program.rentEarnEnabled) {
        earnPerAmount = program.rentEarnPerAmount;
        earnRate = program.rentEarnRate;
      } else if (stat.orderType === 'SALE' && program.saleEarnEnabled) {
        earnPerAmount = program.saleEarnPerAmount;
        earnRate = program.saleEarnRate;
      }

      if (earnPerAmount > 0 && earnRate > 0) {
        existing.points += Math.floor(amount / earnPerAmount) * earnRate;
      }

      customerMap.set(stat.customerId, existing);
    }

    // 6. Get first outlet for transaction record
    const firstOutlet = await prisma.outlet.findFirst({
      where: { merchantId },
      select: { id: true },
    });

    // 7. Create loyalty records for each customer
    let customersProcessed = 0;
    let totalPointsIssued = 0;

    for (const [customerId, stats] of customerMap) {
      // Determine tier based on tierMetric
      let assignedTierId: number | null = null;
      if (tiers.length > 0) {
        const metricValue = program.tierMetric === 'total_orders'
          ? stats.totalOrders
          : stats.totalSpent;

        const matchedTier = tiers.find((tier: { threshold: number; id: number }) => metricValue >= tier.threshold);
        if (matchedTier) {
          assignedTierId = matchedTier.id;
        }
      }

      // Create CustomerLoyalty
      await prisma.customerLoyalty.create({
        data: {
          customerId,
          merchantId,
          points: stats.points,
          totalEarned: stats.points,
          totalRedeemed: 0,
          totalSpent: stats.totalSpent,
          totalOrders: stats.totalOrders,
          currentTierId: assignedTierId,
        },
      });

      // Create LoyaltyTransaction
      if (stats.points > 0) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId,
            merchantId,
            outletId: firstOutlet?.id ?? null,
            type: 'adjust',
            points: stats.points,
            balanceAfter: stats.points,
            description: 'Đồng bộ lịch sử đơn hàng',
          },
        });
      }

      customersProcessed++;
      totalPointsIssued += stats.points;
    }

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
