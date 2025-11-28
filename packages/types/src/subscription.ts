// ============================================================================
// SUBSCRIPTION TYPES (Following Stripe/Shopify Patterns)
// ============================================================================

import { Plan } from './plans';
import type { SubscriptionStatus, BillingInterval } from '@rentalshop/constants';

// Re-export types from centralized constants (Single Source of Truth)
export type { SubscriptionStatus, BillingInterval };
export type BillingPeriod = 1 | 3 | 6 | 12; // months (1=monthly, 3=quarterly, 6=semi_annual, 12=annual)

export interface SubscriptionPeriod {
  startDate: Date;
  endDate: Date;
  duration: string;
  isActive: boolean;
  daysRemaining: number;
  nextBillingDate: Date;
  isTrial?: boolean;
}

/**
 * Complete Subscription interface matching Prisma model
 * This is the single source of truth for subscription data
 */
export interface Subscription {
  // Core identifiers
  id: number;
  merchantId: number;
  planId: number;
  
  // Status and billing
  status: SubscriptionStatus; // ✅ Type safe with enum
  billingInterval: BillingInterval; // monthly, quarterly, semi_annual, annual
  
  // Period information
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  trialStart?: Date | string;
  trialEnd?: Date | string;
  
  // Pricing information
  amount: number; // Calculated price based on plan and interval
  currency: string; // Currency code (USD, VND)
  interval: string; // 'month', 'quarter', 'year' (legacy field, use billingInterval)
  intervalCount: number; // Number of intervals (1, 3, 6, 12)
  period: number; // 1, 3, 6, 12 months (legacy field, use intervalCount)
  discount: number; // Discount percentage
  savings: number; // Calculated savings amount
  
  // Cancellation information
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | string;
  cancelReason?: string;
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Enhanced subscription period information (computed)
  subscriptionPeriod?: SubscriptionPeriod;
  
  // Relations (populated when needed)
  merchant?: {
    id: number;
    name: string;
    email: string;
  };
  plan?: Plan;
}

export interface SubscriptionCreateInput {
  merchantId: number;
  planId: number;
  billingInterval?: BillingInterval; // monthly, quarterly, semi_annual, annual
  status?: SubscriptionStatus;
  startDate?: Date;
}

export interface SubscriptionUpdateInput {
  id: number;
  planId?: number;
  billingInterval?: BillingInterval;
  status?: SubscriptionStatus;
  endDate?: Date | string;
}

export interface SubscriptionFilters {
  merchantId?: number;
  planId?: number;
  status?: SubscriptionStatus; // ✅ Type safe with enum
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  limit?: number;
  page?: number;
}

export interface SubscriptionsResponse {
  data?: Subscription[];
  subscriptions?: Subscription[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
}

// Subscription actions
export interface SubscriptionAction {
  type: 'change_plan' | 'pause' | 'resume' | 'cancel' | 'reactivate';
  planId?: number;
  reason?: string;
}

// Plan comparison for upgrades/downgrades
// PlanComparison interface moved to plans.ts

// Pricing calculation utilities
export interface PricingCalculation {
  basePrice: number;
  discount: number;
  finalPrice: number;
  savings: number;
  monthlyEquivalent: number;
  interval: BillingInterval;
  intervalCount: number;
}

// Modern SaaS pricing configuration
export const PRICING_CONFIG = {
  DISCOUNTS: {
    monthly: 0,       // 0% discount
    quarterly: 0,     // 0% discount
    semi_annual: 5,  // 5% discount
    annual: 10,       // 10% discount
  },
  INTERVALS: {
    monthly: { interval: 'monthly' as BillingInterval, intervalCount: 1 },
    quarterly: { interval: 'quarterly' as BillingInterval, intervalCount: 3 },
    semi_annual: { interval: 'semi_annual' as BillingInterval, intervalCount: 6 },
    annual: { interval: 'annual' as BillingInterval, intervalCount: 12 },
  }
} as const;

// Pricing calculation functions
export function calculatePricing(
  basePrice: number, 
  period: BillingPeriod
): PricingCalculation {
  let config, discount;
  
  if (period === 1) {
    config = PRICING_CONFIG.INTERVALS.monthly;
    discount = PRICING_CONFIG.DISCOUNTS.monthly;
  } else if (period === 3) {
    config = PRICING_CONFIG.INTERVALS.quarterly;
    discount = PRICING_CONFIG.DISCOUNTS.quarterly;
  } else if (period === 6) {
    config = PRICING_CONFIG.INTERVALS.semi_annual;
    discount = PRICING_CONFIG.DISCOUNTS.semi_annual;
  } else {
    config = PRICING_CONFIG.INTERVALS.annual;
    discount = PRICING_CONFIG.DISCOUNTS.annual;
  }
  
  const totalMonths = period;
  const totalBasePrice = basePrice * totalMonths;
  const discountAmount = (totalBasePrice * discount) / 100;
  const finalPrice = totalBasePrice - discountAmount;
  const monthlyEquivalent = finalPrice / totalMonths;
  
  return {
    basePrice: totalBasePrice,
    discount,
    finalPrice,
    savings: discountAmount,
    monthlyEquivalent,
    interval: config.interval,
    intervalCount: config.intervalCount
  };
}

// Example: calculatePricing(29, 3) = { basePrice: 87, discount: 10, finalPrice: 78.3, savings: 8.7, monthlyEquivalent: 26.1, interval: 'month', intervalCount: 3 }
