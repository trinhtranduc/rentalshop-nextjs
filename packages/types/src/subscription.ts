// ============================================================================
// SUBSCRIPTION TYPES (Following Stripe/Shopify Patterns)
// ============================================================================

import { Plan } from './plans';
import { SubscriptionStatus, BillingInterval } from '@rentalshop/constants';

// Re-export types from centralized constants
export type { SubscriptionStatus, BillingInterval };
export type BillingPeriod = 1 | 3 | 6 | 12; // months (1=monthly, 3=quarterly, 6=sixMonths, 12=yearly)

export interface SubscriptionPeriod {
  startDate: Date;
  endDate: Date;
  duration: string;
  isActive: boolean;
  daysRemaining: number;
  nextBillingDate: Date;
  isTrial?: boolean;
}

export interface Subscription {
  id: number;
  // Note: merchantId removed - tenant databases are already isolated per tenant
  planId: number;
  status: SubscriptionStatus;
  billingInterval: BillingInterval; // monthly, quarterly, sixMonths, yearly
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amount: number; // Calculated price based on plan and interval
  createdAt: Date;
  updatedAt: Date;
  
  // Enhanced subscription period information
  subscriptionPeriod?: SubscriptionPeriod;
  
  // Relations
  // Note: merchant removed - tenant databases don't have merchant model
  plan: Plan;
}

export interface SubscriptionCreateInput {
  // Note: merchantId removed - tenant databases are already isolated per tenant
  planId: number;
  billingInterval?: BillingInterval; // month, quarter, semiAnnual, year
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
  // Note: merchantId removed - tenant databases are already isolated per tenant
  planId?: number;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  offset?: number;
}

export interface SubscriptionsResponse {
  data: Subscription[];
  pagination: {
    total: number;
    hasMore: boolean;
    limit: number;
    offset: number;
  };
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
    monthly: 0,      // 0% discount
    quarterly: 10,   // 10% discount
    sixMonths: 15,   // 15% discount
    yearly: 20,      // 20% discount
  },
  INTERVALS: {
    monthly: { interval: 'monthly' as const, intervalCount: 1 },
    quarterly: { interval: 'quarterly' as const, intervalCount: 3 },
    sixMonths: { interval: 'sixMonths' as const, intervalCount: 6 },
    yearly: { interval: 'yearly' as const, intervalCount: 1 },
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
    config = PRICING_CONFIG.INTERVALS.sixMonths;
    discount = PRICING_CONFIG.DISCOUNTS.sixMonths;
  } else {
    config = PRICING_CONFIG.INTERVALS.yearly;
    discount = PRICING_CONFIG.DISCOUNTS.yearly;
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
