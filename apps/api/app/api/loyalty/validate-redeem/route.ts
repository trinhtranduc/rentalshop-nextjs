import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import {
  assertCustomerInMerchantScope,
  getOrCreateCustomerLoyalty,
  validateRedeem,
} from '@rentalshop/loyalty';
import {
  handleApiError,
  loyaltyValidateRedeemSchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

export const POST = withPermissions(['orders.create'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const body = await request.json();
    const parsed = loyaltyValidateRedeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }

    await assertCustomerInMerchantScope(parsed.data.customerId, merchantId);

    const program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
    if (!program) {
      return NextResponse.json(
        ResponseBuilder.success('LOYALTY_VALIDATE_REDEEM', {
          valid: false,
          reason: 'PROGRAM_INACTIVE',
        })
      );
    }

    const loyalty = await getOrCreateCustomerLoyalty(
      parsed.data.customerId,
      merchantId,
      program.id
    );

    const result = validateRedeem(parsed.data, program, loyalty);
    return NextResponse.json(ResponseBuilder.success('LOYALTY_VALIDATE_REDEEM', result));
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
