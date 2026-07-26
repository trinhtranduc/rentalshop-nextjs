import { LOYALTY_REDEEM_REASONS } from './constants';
import type {
  CustomerLoyaltyLike,
  LoyaltyProgramLike,
  RedeemInput,
  RedeemResult,
} from './types';
import { calculateAmountDue } from './earn';

export function validateRedeem(
  input: RedeemInput,
  program: LoyaltyProgramLike,
  loyalty: CustomerLoyaltyLike | null
): RedeemResult {
  if (!program.isActive) {
    return { valid: false, reason: LOYALTY_REDEEM_REASONS.PROGRAM_INACTIVE };
  }

  if (input.orderType === 'RENT' && !program.redeemOnRent) {
    return { valid: false, reason: LOYALTY_REDEEM_REASONS.REDEEM_DISABLED_FOR_ORDER_TYPE };
  }

  if (input.orderType === 'SALE' && !program.redeemOnSale) {
    return { valid: false, reason: LOYALTY_REDEEM_REASONS.REDEEM_DISABLED_FOR_ORDER_TYPE };
  }

  if (!loyalty) {
    return { valid: false, reason: LOYALTY_REDEEM_REASONS.NO_LOYALTY_RECORD };
  }

  const maxByPercent = Math.floor(
    (input.orderTotalAmount * program.maxRedeemPercent) / 100 / program.pointValue
  );
  const maxByRemaining = Math.floor(input.orderTotalAmount / program.pointValue);
  const maxPoints = Math.min(loyalty.points, maxByPercent, maxByRemaining);

  if (input.points < program.minRedeemPoints) {
    return {
      valid: false,
      reason: LOYALTY_REDEEM_REASONS.BELOW_MINIMUM,
      currentBalance: loyalty.points,
      requestedPoints: input.points,
      maxPoints,
    };
  }

  if (loyalty.points < input.points) {
    return {
      valid: false,
      reason: LOYALTY_REDEEM_REASONS.INSUFFICIENT_POINTS,
      currentBalance: loyalty.points,
      requestedPoints: input.points,
      maxPoints,
    };
  }

  if (input.points > maxByPercent) {
    return {
      valid: false,
      reason: LOYALTY_REDEEM_REASONS.EXCEEDS_MAX_PERCENT,
      currentBalance: loyalty.points,
      requestedPoints: input.points,
      maxPoints,
    };
  }

  if (input.points > maxByRemaining) {
    return {
      valid: false,
      reason: LOYALTY_REDEEM_REASONS.EXCEEDS_REMAINING_AMOUNT,
      currentBalance: loyalty.points,
      requestedPoints: input.points,
      maxPoints,
    };
  }

  const discount = input.points * program.pointValue;
  const amountDue = calculateAmountDue(input.orderTotalAmount, discount);

  return {
    valid: true,
    discount,
    amountDue,
    maxPoints,
    maxDiscount: maxPoints * program.pointValue,
    currentBalance: loyalty.points,
    balanceAfterRedeem: loyalty.points - input.points,
    requestedPoints: input.points,
  };
}
