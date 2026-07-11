import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import {
  assertCustomerInMerchantScope,
  getOrCreateCustomerLoyalty,
  LOYALTY_TRANSACTION_TYPES,
} from '@rentalshop/loyalty';
import {
  handleApiError,
  loyaltyAdjustSchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

export const POST = withPermissions(['loyalty.adjust'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const body = await request.json();
    const parsed = loyaltyAdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }

    await assertCustomerInMerchantScope(parsed.data.customerId, merchantId);

    const program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
    if (!program) {
      return NextResponse.json(ResponseBuilder.error('LOYALTY_PROGRAM_NOT_FOUND'), { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loyalty = await getOrCreateCustomerLoyalty(
        parsed.data.customerId,
        merchantId,
        program.id
      );

      if (parsed.data.points < 0 && loyalty.points < Math.abs(parsed.data.points)) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      const updated = await tx.customerLoyalty.update({
        where: { id: loyalty.id },
        data: {
          points: { increment: parsed.data.points },
          totalEarned:
            parsed.data.points > 0
              ? { increment: parsed.data.points }
              : undefined,
        },
      });

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          customerId: parsed.data.customerId,
          merchantId,
          type: LOYALTY_TRANSACTION_TYPES.ADJUST,
          points: parsed.data.points,
          balanceAfter: updated.points,
          description: parsed.data.reason,
          metadata: JSON.stringify({ reason: parsed.data.reason }),
          createdById: user.id,
        },
      });

      return { transaction, newBalance: updated.points };
    });

    return NextResponse.json(ResponseBuilder.success('LOYALTY_ADJUSTED', result));
  } catch (error) {
    const gateResponse = loyaltyErrorResponse(error);
    if (
      error instanceof Error &&
      ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED', 'CUSTOMER_NOT_FOUND'].includes(
        error.message
      )
    ) {
      return gateResponse;
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
