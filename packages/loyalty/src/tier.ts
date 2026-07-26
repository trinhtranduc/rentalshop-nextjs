import type { CustomerLoyaltyLike, LoyaltyProgramLike, LoyaltyTierLike } from './types';

export function evaluateTierUpgrade(
  customerLoyalty: CustomerLoyaltyLike,
  program: LoyaltyProgramLike,
  tiers: LoyaltyTierLike[]
): LoyaltyTierLike | null {
  const metricValue =
    program.tierMetric === 'total_orders'
      ? customerLoyalty.totalOrders
      : customerLoyalty.totalSpent;

  const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
  const qualifyingTier = sortedTiers.find((tier) => metricValue >= tier.threshold);
  if (!qualifyingTier) return null;

  if (!customerLoyalty.currentTierId) return qualifyingTier;

  const currentTier = tiers.find((tier) => tier.id === customerLoyalty.currentTierId);
  if (!currentTier) return qualifyingTier;

  if (qualifyingTier.threshold > currentTier.threshold) {
    return qualifyingTier;
  }

  return null;
}

export function getNextTier(
  customerLoyalty: CustomerLoyaltyLike,
  program: LoyaltyProgramLike,
  tiers: LoyaltyTierLike[]
): { tier: LoyaltyTierLike; remaining: number } | null {
  const metricValue =
    program.tierMetric === 'total_orders'
      ? customerLoyalty.totalOrders
      : customerLoyalty.totalSpent;

  const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
  const nextTier = sortedTiers.find((tier) => tier.threshold > metricValue);
  if (!nextTier) return null;

  return {
    tier: nextTier,
    remaining: Math.max(0, nextTier.threshold - metricValue),
  };
}
