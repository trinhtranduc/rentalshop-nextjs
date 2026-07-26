import type { EarnInput } from './types';

export function calculateEarn(input: EarnInput): number {
  const { order, program, currentTier } = input;

  const config =
    order.orderType === 'RENT'
      ? {
          enabled: program.rentEarnEnabled,
          rate: program.rentEarnRate,
          perAmount: program.rentEarnPerAmount,
        }
      : {
          enabled: program.saleEarnEnabled,
          rate: program.saleEarnRate,
          perAmount: program.saleEarnPerAmount,
        };

  if (!config.enabled || config.perAmount <= 0) return 0;

  const loyaltyDiscount = order.loyaltyDiscount || 0;
  const eligibleAmount = Math.max(0, order.totalAmount - loyaltyDiscount);
  if (eligibleAmount <= 0) return 0;

  const basePoints = Math.floor(eligibleAmount / config.perAmount) * config.rate;
  return Math.floor(basePoints * (currentTier.multiplier || 1));
}

export function calculateEligibleAmount(orderTotalAmount: number, loyaltyDiscount = 0): number {
  return Math.max(0, orderTotalAmount - loyaltyDiscount);
}

export function calculateAmountDue(orderTotalAmount: number, loyaltyDiscount = 0): number {
  return Math.max(0, orderTotalAmount - loyaltyDiscount);
}
