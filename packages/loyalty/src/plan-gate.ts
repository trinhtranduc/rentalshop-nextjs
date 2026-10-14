import { MODULE_KEY } from '@rentalshop/constants';
import { getActiveMerchantModuleKeys, prisma } from '@rentalshop/database';

export class LoyaltyPlanGateError extends Error {
  constructor(message = 'PLAN_UPGRADE_REQUIRED') {
    super(message);
    this.name = 'LoyaltyPlanGateError';
  }
}

/** Plan `features` of the merchant (subscription plan, else legacy `merchant.Plan`). Kept for callers; not the gate. */
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

/**
 * #967 the one loyalty check: the plan includes `loyalty` OR the shop has an un-ended `loyalty` feature add-on
 * (`getActiveMerchantModuleKeys`, the same list as `merchant.modules`). Every loyalty gate goes through here.
 */
export async function merchantHasLoyaltyFeature(merchantId: number): Promise<boolean> {
  const keys = await getActiveMerchantModuleKeys(merchantId);
  return keys.includes(MODULE_KEY.LOYALTY);
}

/** Throws `PLAN_UPGRADE_REQUIRED` (403 in the routes, unchanged) when loyalty is off. */
export async function assertLoyaltyFeature(merchantId: number): Promise<void> {
  if (!(await merchantHasLoyaltyFeature(merchantId))) {
    throw new LoyaltyPlanGateError('PLAN_UPGRADE_REQUIRED');
  }
}
