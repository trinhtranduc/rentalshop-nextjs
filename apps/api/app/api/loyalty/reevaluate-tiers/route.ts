import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';
import { reevaluateMerchantTiers } from '@/lib/loyalty-derive';

/**
 * Re-evaluate membership tiers for all customers (§6b).
 *
 * Use case: merchant added/edited a tier and wants existing customers re-assigned.
 * This ONLY recomputes tier metrics (totalSpent/totalOrders) from orders and moves
 * customers UP to a newly-qualifying tier. It NEVER touches the point balance and
 * NEVER downgrades (INV-3). This is the correct action for "added a new tier on day 10".
 */
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

    const tiers = await prisma.loyaltyTier.findMany({
      where: { programId: program.id },
      orderBy: { threshold: 'desc' },
    });

    const upgrades = await prisma.$transaction((tx) =>
      reevaluateMerchantTiers(tx, merchantId, program, tiers)
    );

    return NextResponse.json(
      ResponseBuilder.success('REEVALUATE_TIERS_SUCCESS', { upgrades })
    );
  } catch (error) {
    if (
      error instanceof Error &&
      ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)
    ) {
      return loyaltyErrorResponse(error);
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
