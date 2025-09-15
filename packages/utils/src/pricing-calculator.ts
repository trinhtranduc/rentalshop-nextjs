// ============================================================================
// PRICING CALCULATOR UTILITY
// ============================================================================

import { Plan } from '@rentalshop/types';
import { BillingInterval } from '@rentalshop/constants';

export interface PricingBreakdown {
  basePrice: number;
  totalPrice: number;
  discount: number;
  discountAmount: number;
  finalPrice: number;
  monthlyEquivalent: number;
  billingInterval: BillingInterval;
  totalMonths: number;
}

export interface PricingConfig {
  discounts: {
    month: number;
    quarter: number;
    semiAnnual: number;
    year: number;
  };
  intervals: {
    month: { interval: BillingInterval; intervalCount: number };
    quarter: { interval: BillingInterval; intervalCount: number };
    semiAnnual: { interval: BillingInterval; intervalCount: number };
    year: { interval: BillingInterval; intervalCount: number };
  };
}

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  discounts: {
    month: 0,        // 0% discount
    quarter: 10,     // 10% discount
    semiAnnual: 15,  // 15% discount
    year: 20         // 20% discount
  },
  intervals: {
    month: { interval: 'month' as const, intervalCount: 1 },
    quarter: { interval: 'month' as const, intervalCount: 3 },
    semiAnnual: { interval: 'month' as const, intervalCount: 6 },
    year: { interval: 'year' as const, intervalCount: 1 }
  }
};

export class PricingCalculator {
  private config: PricingConfig;

  constructor(config: PricingConfig = DEFAULT_PRICING_CONFIG) {
    this.config = config;
  }

  /**
   * Calculate subscription price based on plan and billing interval
   */
  calculateSubscriptionPrice(
    plan: Plan,
    billingInterval: BillingInterval
  ): number {
    const breakdown = this.getPricingBreakdown(plan, billingInterval);
    return breakdown.finalPrice;
  }

  /**
   * Get detailed pricing breakdown
   */
  getPricingBreakdown(
    plan: Plan,
    billingInterval: BillingInterval
  ): PricingBreakdown {
    const totalMonths = this.getTotalMonths(billingInterval);
    const totalPrice = plan.basePrice * totalMonths;
    const discount = this.getDiscount(billingInterval);
    const discountAmount = (totalPrice * discount) / 100;
    const finalPrice = totalPrice - discountAmount;
    const monthlyEquivalent = finalPrice / totalMonths;

    return {
      basePrice: plan.basePrice,
      totalPrice,
      discount,
      discountAmount,
      finalPrice,
      monthlyEquivalent,
      billingInterval,
      totalMonths
    };
  }

  /**
   * Get all pricing options for a plan
   */
  getAllPricingOptions(plan: Plan): Record<BillingInterval, PricingBreakdown> {
    const intervals: BillingInterval[] = ['month', 'quarter', 'semiAnnual', 'year'];
    const pricing: Record<BillingInterval, PricingBreakdown> = {} as any;

    for (const interval of intervals) {
      pricing[interval] = this.getPricingBreakdown(plan, interval);
    }

    return pricing;
  }

  /**
   * Get pricing comparison between two plans
   */
  getPricingComparison(
    plan1: Plan,
    plan2: Plan,
    billingInterval: BillingInterval
  ): {
    plan1: PricingBreakdown;
    plan2: PricingBreakdown;
    difference: number;
    savings: number;
  } {
    const plan1Pricing = this.getPricingBreakdown(plan1, billingInterval);
    const plan2Pricing = this.getPricingBreakdown(plan2, billingInterval);
    const difference = plan2Pricing.finalPrice - plan1Pricing.finalPrice;
    const savings = Math.abs(difference);

    return {
      plan1: plan1Pricing,
      plan2: plan2Pricing,
      difference,
      savings
    };
  }

  /**
   * Calculate prorated amount for plan changes
   */
  calculateProratedAmount(
    currentPlan: Plan,
    newPlan: Plan,
    billingInterval: BillingInterval,
    daysRemaining: number
  ): {
    currentPlanRefund: number;
    newPlanCharge: number;
    netAmount: number;
  } {
    const currentPricing = this.getPricingBreakdown(currentPlan, billingInterval);
    const newPricing = this.getPricingBreakdown(newPlan, billingInterval);

    // Calculate daily rates
    const currentDailyRate = currentPricing.finalPrice / currentPricing.totalMonths / 30;
    const newDailyRate = newPricing.finalPrice / newPricing.totalMonths / 30;

    // Calculate refund for current plan
    const currentPlanRefund = currentDailyRate * daysRemaining;

    // Calculate charge for new plan
    const newPlanCharge = newDailyRate * daysRemaining;

    // Net amount (positive means customer owes money, negative means refund)
    const netAmount = newPlanCharge - currentPlanRefund;

    return {
      currentPlanRefund,
      newPlanCharge,
      netAmount
    };
  }

  /**
   * Get total months for billing interval
   */
  private getTotalMonths(billingInterval: BillingInterval): number {
    const intervalMap = {
      month: 1,
      quarter: 3,
      semiAnnual: 6,
      year: 12
    };

    return intervalMap[billingInterval] || 1;
  }

  /**
   * Get discount percentage for billing interval
   */
  private getDiscount(billingInterval: BillingInterval): number {
    return this.config.discounts[billingInterval] || 0;
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(price);
  }

  /**
   * Format discount for display
   */
  static formatDiscount(discount: number): string {
    if (discount === 0) {
      return 'No discount';
    }
    return `${discount}% off`;
  }

  /**
   * Format billing interval for display
   */
  static formatBillingInterval(interval: BillingInterval): string {
    const intervalMap = {
      month: 'Monthly',
      quarter: 'Quarterly',
      semiAnnual: 'Semi-Annual',
      year: 'Yearly'
    };

    return intervalMap[interval] || interval;
  }
}

// Export default instance
export const pricingCalculator = new PricingCalculator();

// Export utility functions
export const calculateSubscriptionPrice = (plan: Plan, billingInterval: BillingInterval) =>
  pricingCalculator.calculateSubscriptionPrice(plan, billingInterval);

export const getPricingBreakdown = (plan: Plan, billingInterval: BillingInterval) =>
  pricingCalculator.getPricingBreakdown(plan, billingInterval);

export const getAllPricingOptions = (plan: Plan) =>
  pricingCalculator.getAllPricingOptions(plan);

export const getPricingComparison = (plan1: Plan, plan2: Plan, billingInterval: BillingInterval) =>
  pricingCalculator.getPricingComparison(plan1, plan2, billingInterval);

export const calculateProratedAmount = (
  currentPlan: Plan,
  newPlan: Plan,
  billingInterval: BillingInterval,
  daysRemaining: number
) => pricingCalculator.calculateProratedAmount(currentPlan, newPlan, billingInterval, daysRemaining);
