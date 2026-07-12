// ============================================================================
// LOYALTY ENTITY TYPES
// ============================================================================

export interface LoyaltyProgram {
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
  tierMetric: 'total_spend' | 'total_orders';
  tierPeriod: 'lifetime' | 'yearly';
  tierDowngrade: 'never' | 'immediate' | 'grace_30d';
  pointsExpiryMode: 'never' | 'per_transaction' | 'yearly_reset';
  pointsExpiryDays?: number | null;
  yearlyResetMonth?: number | null;
  yearlyResetDay?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LoyaltyTier {
  id: number;
  programId: number;
  name: string;
  threshold: number;
  multiplier: number;
  benefits?: string;
  color?: string | null;
  icon?: string | null;
  sortOrder: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CustomerLoyalty {
  id: number;
  customerId: number;
  merchantId: number;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  totalSpent: number;
  totalOrders: number;
  currentTierId?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CustomerLoyaltySnapshot {
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  totalSpent: number;
  totalOrders: number;
  tier: Pick<LoyaltyTier, 'id' | 'name' | 'color' | 'icon' | 'multiplier'> | null;
}

export interface LoyaltyTransaction {
  id: number;
  customerId: number;
  merchantId: number;
  outletId?: number | null;
  orderId?: number | null;
  type: 'earn' | 'redeem' | 'adjust' | 'refund' | 'expire' | 'tier_upgrade';
  points: number;
  balanceAfter: number;
  description?: string | null;
  metadata?: string | null;
  createdAt: Date | string;
  createdById?: number | null;
  outletName?: string | null;
}

export interface LoyaltyCustomerSummary {
  customerId: number;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  totalSpent: number;
  totalOrders: number;
  tier: Pick<LoyaltyTier, 'id' | 'name' | 'color' | 'icon' | 'multiplier'> | null;
  nextTier?: {
    name: string;
    threshold: number;
    remaining: number;
  } | null;
  canRedeem: boolean;
  maxRedeemPoints: number;
}

export interface LoyaltyRedeemInput {
  points: number;
}

export interface LoyaltyValidateRedeemInput {
  customerId: number;
  points: number;
  orderTotalAmount: number;
  orderType: 'RENT' | 'SALE';
}

export interface LoyaltyCalculateEarnInput {
  customerId: number;
  orderType: 'RENT' | 'SALE';
  orderTotalAmount: number;
  loyaltyDiscount?: number;
}

export interface LoyaltyAdjustInput {
  customerId: number;
  points: number;
  reason: string;
}
