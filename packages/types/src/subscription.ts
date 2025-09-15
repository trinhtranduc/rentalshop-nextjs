// ============================================================================
// SUBSCRIPTION TYPES (Following Stripe/Shopify Patterns)
// ============================================================================

import { Plan } from './plans';
import { SubscriptionStatus, BillingInterval } from '@rentalshop/constants';

// Re-export types from centralized constants
export type { SubscriptionStatus, BillingInterval };
export type BillingPeriod = 1 | 3 | 6 | 12; // months

export interface Subscription {
  id: string;
  publicId: number;
  merchantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval; // month, quarter, semiAnnual, year
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amount: number; // Calculated price based on plan and interval
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  merchant: {
    id: string;
    publicId: number;
    name: string;
    email: string;
    subscriptionStatus: string;
  };
  plan: Plan;
}

export interface SubscriptionCreateInput {
  merchantId: number;
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
  merchantId?: number;
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
    yearly: 20,      // 20% discount
  },
  INTERVALS: {
    monthly: { interval: 'month' as const, intervalCount: 1 },
    quarterly: { interval: 'month' as const, intervalCount: 3 },
    yearly: { interval: 'year' as const, intervalCount: 1 },
  }
} as const;

// Pricing calculation functions
export function calculatePricing(
  basePrice: number, 
  period: BillingPeriod
): PricingCalculation {
  const config = PRICING_CONFIG.INTERVALS[period === 1 ? 'monthly' : period === 3 ? 'quarterly' : 'yearly'];
  const discount = PRICING_CONFIG.DISCOUNTS[period === 1 ? 'monthly' : period === 3 ? 'quarterly' : 'yearly'];
  
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
