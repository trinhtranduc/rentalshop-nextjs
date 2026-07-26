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
 * Recalculate balance — admin self-heal action (Req 12.5, §6c).
 *
 * Re-derives the ENTIRE CustomerLoyalty cache for the merchant from the two sources
 * of truth: points/earned/redeemed from the ledger, spent/orders from Order, tier
 * from metric (never downgrades). Because balance is ledger-derived (INV-1), this is
 * always safe and idempotent — use it to fix any drift between cache and ledger.
 */
export const POST = withPermissions(['loyalty.adjust'])(async (_request: NextRequest, { user, userScope }) => {
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

    const customersReconciled = await prisma.$transaction((tx) =>
      deriveMerchantLoyaltyCache(tx, merchantId, program, tiers)
    );

    return NextResponse.json(
      ResponseBuilder.success('RECALCULATE_SUCCESS', { customersReconciled })
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
