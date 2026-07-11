import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { assertCustomerInMerchantScope, estimateEarnPoints } from '@rentalshop/loyalty';
import {
  handleApiError,
  loyaltyCalculateEarnSchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '../../../lib/loyalty-route-helpers';

export const POST = withPermissions(['orders.view'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const body = await request.json();
    const parsed = loyaltyCalculateEarnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }

    await assertCustomerInMerchantScope(parsed.data.customerId, merchantId);

    const estimate = await estimateEarnPoints({
      customerId: parsed.data.customerId,
      merchantId,
      orderType: parsed.data.orderType,
      orderTotalAmount: parsed.data.orderTotalAmount,
      loyaltyDiscount: parsed.data.loyaltyDiscount,
    });

    return NextResponse.json(ResponseBuilder.success('LOYALTY_EARN_ESTIMATE', estimate));
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
