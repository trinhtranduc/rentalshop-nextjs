import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import {
  assertCustomerInMerchantScope,
  buildCustomerSummary,
  getOrCreateCustomerLoyalty,
} from '@rentalshop/loyalty';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '../../../../../lib/loyalty-route-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  return withPermissions(['loyalty.view'])(async (_request, { user, userScope }) => {
    try {
      const merchantId = await resolveLoyaltyMerchantId(user, userScope);
      await withLoyaltyPlanGate(merchantId);

      const customerId = parseInt(id, 10);
      if (Number.isNaN(customerId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_CUSTOMER_ID'), { status: 400 });
      }

      await assertCustomerInMerchantScope(customerId, merchantId);

      const program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
      if (!program) {
        return NextResponse.json(
          ResponseBuilder.success('LOYALTY_SUMMARY_FOUND', {
            customerId,
            points: 0,
            totalEarned: 0,
            totalRedeemed: 0,
            totalSpent: 0,
            totalOrders: 0,
            tier: null,
            nextTier: null,
            canRedeem: false,
            maxRedeemPoints: 0,
          })
        );
      }

      await getOrCreateCustomerLoyalty(customerId, merchantId, program.id);
      const summary = await buildCustomerSummary(customerId, merchantId);

      return NextResponse.json(ResponseBuilder.success('LOYALTY_SUMMARY_FOUND', summary));
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
  })(request);
}
