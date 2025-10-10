// ============================================================================
// SIMPLE PRORATION CALCULATION
// ============================================================================

export interface ProrationCalculation {
  isUpgrade: boolean;
  isDowngrade: boolean;
  currentPlanPrice: number;
  newPlanPrice: number;
  daysRemaining: number;
  daysInPeriod: number;
  proratedAmount: number;
  creditAmount: number;
  chargeAmount: number;
  reason: string;
}

/**
 * Calculate proration for plan changes
 * Simple logic: Charge difference for upgrades, credit for downgrades
 */
export function calculateProration(
  currentSubscription: {
    amount: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  },
  newPlanPrice: number,
  changeDate: Date = new Date()
): ProrationCalculation {
  const currentPrice = currentSubscription.amount;
  const priceDifference = newPlanPrice - currentPrice;
  
  // Calculate days
  const periodStart = new Date(currentSubscription.currentPeriodStart);
  const periodEnd = new Date(currentSubscription.currentPeriodEnd);
  const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((periodEnd.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine if upgrade or downgrade
  const isUpgrade = priceDifference > 0;
  const isDowngrade = priceDifference < 0;
  
  // Calculate prorated amounts
  const dailyRate = Math.abs(priceDifference) / daysInPeriod;
  const proratedAmount = dailyRate * daysRemaining;
  
  let chargeAmount = 0;
  let creditAmount = 0;
  let reason = '';
  
  if (isUpgrade) {
    // Charge the prorated difference for upgrades
    chargeAmount = Math.round(proratedAmount * 100) / 100; // Round to 2 decimal places
    reason = `Upgrade proration: ${daysRemaining} days remaining at $${dailyRate.toFixed(2)}/day`;
  } else if (isDowngrade) {
    // Credit the prorated difference for downgrades
    creditAmount = Math.round(proratedAmount * 100) / 100;
    reason = `Downgrade credit: ${daysRemaining} days remaining at $${dailyRate.toFixed(2)}/day`;
  } else {
    // Same price - no proration needed
    reason = 'Same price - no proration needed';
  }
  
  return {
    isUpgrade,
    isDowngrade,
    currentPlanPrice: currentPrice,
    newPlanPrice,
    daysRemaining,
    daysInPeriod,
    proratedAmount,
    creditAmount,
    chargeAmount,
    reason
  };
}

/**
 * Check if proration should be applied
 * Simple rule: Only apply proration for upgrades (charge difference)
 */
export function shouldApplyProration(
  currentPrice: number,
  newPrice: number
): boolean {
  // Only charge proration for upgrades (new price > current price)
  return newPrice > currentPrice;
}

/**
 * Format proration for display
 */
export function formatProration(proration: ProrationCalculation): string {
  if (proration.chargeAmount > 0) {
    return `Charge $${proration.chargeAmount.toFixed(2)} (${proration.reason})`;
  } else if (proration.creditAmount > 0) {
    return `Credit $${proration.creditAmount.toFixed(2)} (${proration.reason})`;
  } else {
    return 'No proration needed';
  }
}
