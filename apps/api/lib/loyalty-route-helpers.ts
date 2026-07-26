import { NextResponse } from 'next/server';
import { USER_ROLE } from '@rentalshop/constants';
import { ResponseBuilder } from '@rentalshop/utils';
import { LoyaltyPlanGateError, assertLoyaltyFeature } from '@rentalshop/loyalty';

export async function resolveLoyaltyMerchantId(
  user: { role: string },
  userScope: { merchantId?: number }
): Promise<number> {
  if (user.role === USER_ROLE.ADMIN) {
    if (!userScope.merchantId) {
      throw new Error('MERCHANT_ID_REQUIRED');
    }
    return userScope.merchantId;
  }

  if (!userScope.merchantId) {
    throw new Error('MERCHANT_ASSOCIATION_REQUIRED');
  }

  return userScope.merchantId;
}

export async function withLoyaltyPlanGate(merchantId: number): Promise<void> {
  await assertLoyaltyFeature(merchantId);
}

export function loyaltyErrorResponse(error: unknown) {
  if (error instanceof LoyaltyPlanGateError) {
    return NextResponse.json(ResponseBuilder.error('PLAN_UPGRADE_REQUIRED'), { status: 403 });
  }

  const message = error instanceof Error ? error.message : 'LOYALTY_ERROR';
  const status =
    message === 'MERCHANT_ASSOCIATION_REQUIRED' ||
    message === 'MERCHANT_ID_REQUIRED'
      ? 403
      : message === 'CUSTOMER_NOT_FOUND'
        ? 404
        : 400;

  return NextResponse.json(ResponseBuilder.error(message), { status });
}
