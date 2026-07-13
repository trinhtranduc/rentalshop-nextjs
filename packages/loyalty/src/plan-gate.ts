import { hasLoyaltyFeature } from '@rentalshop/constants';
import { prisma } from '@rentalshop/database';

export class LoyaltyPlanGateError extends Error {
  constructor(message = 'PLAN_UPGRADE_REQUIRED') {
    super(message);
    this.name = 'LoyaltyPlanGateError';
  }
}

export async function getMerchantPlanFeatures(merchantId: number): Promise<unknown> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      subscription: {
        include: { plan: true },
      },
      Plan: true,
    },
  });

  if (!merchant) return [];

  const plan = merchant.subscription?.plan || merchant.Plan;
  return plan?.features ?? [];
}

export async function assertLoyaltyFeature(merchantId: number): Promise<void> {
  const features = await getMerchantPlanFeatures(merchantId);
  if (!hasLoyaltyFeature(features)) {
    throw new LoyaltyPlanGateError('PLAN_UPGRADE_REQUIRED');
  }
}

export async function merchantHasLoyaltyFeature(merchantId: number): Promise<boolean> {
  const features = await getMerchantPlanFeatures(merchantId);
  return hasLoyaltyFeature(features);
}
