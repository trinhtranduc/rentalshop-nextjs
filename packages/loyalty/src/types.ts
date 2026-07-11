import type { LoyaltyRedeemReason } from './constants';

export interface LoyaltyProgramLike {
  id: number;
  merchantId: number;
  name: string;
  isActive: boolean;
  rentEarnEnabled: boolean;
  rentEarnRate: number;
  rentEarnPerAmount: number;
  saleEarnEnabled: boolean;
  saleEarnRate: number;
  saleEarnPerAmount: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  redeemOnRent: boolean;
  redeemOnSale: boolean;
  tierMetric: string;
  tierPeriod: string;
  tierDowngrade: string;
  pointsExpiryMode: string;
  pointsExpiryDays: number | null;
  yearlyResetMonth: number | null;
  yearlyResetDay: number | null;
}

export interface LoyaltyTierLike {
  id: number;
  programId: number;
  name: string;
  threshold: number;
  multiplier: number;
  benefits?: string;
  color?: string | null;
  icon?: string | null;
  sortOrder: number;
}

export interface CustomerLoyaltyLike {
  id: number;
  customerId: number;
  merchantId: number;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  totalSpent: number;
  totalOrders: number;
  currentTierId: number | null;
}

export interface OrderLoyaltyLike {
  id: number;
  orderNumber: string;
  orderType: 'RENT' | 'SALE';
  status: string;
  totalAmount: number;
  loyaltyDiscount?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
  customerId?: number | null;
  outletId: number;
}

export interface EarnInput {
  order: OrderLoyaltyLike;
  program: LoyaltyProgramLike;
  customerLoyalty: CustomerLoyaltyLike;
  currentTier: LoyaltyTierLike;
}

export interface RedeemInput {
  customerId: number;
  merchantId: number;
  points: number;
  orderTotalAmount: number;
  orderType: 'RENT' | 'SALE';
}

export interface RedeemResult {
  valid: boolean;
  reason?: LoyaltyRedeemReason;
  discount?: number;
  amountDue?: number;
  maxPoints?: number;
  maxDiscount?: number;
  currentBalance?: number;
  balanceAfterRedeem?: number;
  requestedPoints?: number;
}

export interface LoyaltyRedeemPayload {
  points: number;
}

export interface LoyaltyUserContext {
  id: number;
}
