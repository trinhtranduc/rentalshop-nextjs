// ============================================================================
// REFACTORED PRICING CALCULATOR SYSTEM
// ============================================================================

import { Plan, Product, Merchant, PricingType, BusinessType, PricingDurationLimits, PricingBusinessRules } from '@rentalshop/types';
import { BillingInterval, BUSINESS_TYPE_DEFAULTS } from '@rentalshop/constants';

// ============================================================================
// TYPES
// ============================================================================

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
    monthly: number;
    quarterly: number;
    sixMonths: number;
    yearly: number;
  };
  intervals: {
    monthly: { interval: BillingInterval; intervalCount: number };
    quarterly: { interval: BillingInterval; intervalCount: number };
    sixMonths: { interval: BillingInterval; intervalCount: number };
    yearly: { interval: BillingInterval; intervalCount: number };
  };
}

// ============================================================================
// PRICING RESOLUTION INTERFACES (from pricing-resolver.ts)
// ============================================================================

export interface PricingInfo {
  pricingType: PricingType;
  pricePerUnit: number;
  minDuration: number;
  maxDuration: number;
  requireRentalDates: boolean;
  showPricingOptions: boolean;
}

export interface CalculatedPricing {
  unitPrice: number;
  totalPrice: number;
  deposit: number;
  pricingType: PricingType;
  duration?: number;
  durationUnit?: string;
}

// ============================================================================
// VALIDATION INTERFACES (from pricing-validation.ts)
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestions?: string[];
}

export interface RentalPeriodValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// DISCOUNT CALCULATOR
// ============================================================================

export class DiscountCalculator {
  private config: PricingConfig;

  constructor(config: PricingConfig) {
    this.config = config;
  }

  /**
   * Calculate discount amount for billing interval
   */
  calculateDiscount(totalPrice: number, billingInterval: BillingInterval): {
    discount: number;
    discountAmount: number;
  } {
    const discountPercentage = this.getDiscountPercentage(billingInterval);
    const discountAmount = (totalPrice * discountPercentage) / 100;

    return {
      discount: discountPercentage,
      discountAmount
    };
  }

  /**
   * Get discount percentage for billing interval
   */
  private getDiscountPercentage(billingInterval: BillingInterval): number {
    return this.config.discounts[billingInterval] || 0;
  }
}

// ============================================================================
// BILLING INTERVAL CALCULATOR
// ============================================================================

export class BillingIntervalCalculator {
  private config: PricingConfig;

  constructor(config: PricingConfig) {
    this.config = config;
  }

  /**
   * Get total months for billing interval
   */
  getTotalMonths(billingInterval: BillingInterval): number {
    const intervalMap: Record<BillingInterval, number> = {
      monthly: 1,
      quarterly: 3,
      sixMonths: 6,
      yearly: 12
    };

    return intervalMap[billingInterval] || 1;
  }

  /**
   * Get all available billing intervals
   */
  getAllIntervals(): BillingInterval[] {
    return ['monthly', 'quarterly', 'sixMonths', 'yearly'];
  }
}

// ============================================================================
// PRORATION CALCULATOR
// ============================================================================

export class ProrationCalculator {
  private discountCalculator: DiscountCalculator;
  private intervalCalculator: BillingIntervalCalculator;

  constructor(config: PricingConfig) {
    this.discountCalculator = new DiscountCalculator(config);
    this.intervalCalculator = new BillingIntervalCalculator(config);
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
    // Calculate total months for the billing interval
    const totalMonths = this.intervalCalculator.getTotalMonths(billingInterval);

    // Calculate daily rates
    const currentDailyRate = (currentPlan.basePrice * totalMonths) / (totalMonths * 30);
    const newDailyRate = (newPlan.basePrice * totalMonths) / (totalMonths * 30);

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
}

// ============================================================================
// PRICE FORMATTER
// ============================================================================

export class PriceFormatter {
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
    const intervalMap: Record<BillingInterval, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      sixMonths: 'Six Months',
      yearly: 'Yearly'
    };

    return intervalMap[interval] || interval;
  }
}

// ============================================================================
// PRICING COMPARISON ENGINE
// ============================================================================

export class PricingComparisonEngine {
  private discountCalculator: DiscountCalculator;
  private intervalCalculator: BillingIntervalCalculator;

  constructor(config: PricingConfig) {
    this.discountCalculator = new DiscountCalculator(config);
    this.intervalCalculator = new BillingIntervalCalculator(config);
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
    const plan1Pricing = this.calculatePricingBreakdown(plan1, billingInterval);
    const plan2Pricing = this.calculatePricingBreakdown(plan2, billingInterval);
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
   * Calculate pricing breakdown for a plan
   */
  private calculatePricingBreakdown(plan: Plan, billingInterval: BillingInterval): PricingBreakdown {
    const totalMonths = this.intervalCalculator.getTotalMonths(billingInterval);
    const totalPrice = plan.basePrice * totalMonths;
    const discountInfo = this.discountCalculator.calculateDiscount(totalPrice, billingInterval);
    const finalPrice = totalPrice - discountInfo.discountAmount;
    const monthlyEquivalent = finalPrice / totalMonths;

    return {
      basePrice: plan.basePrice,
      totalPrice,
      discount: discountInfo.discount,
      discountAmount: discountInfo.discountAmount,
      finalPrice,
      monthlyEquivalent,
      billingInterval,
      totalMonths
    };
  }
}

// ============================================================================
// MAIN PRICING CALCULATOR (SIMPLIFIED)
// ============================================================================

export class PricingCalculator {
  private config: PricingConfig;
  private discountCalculator: DiscountCalculator;
  private intervalCalculator: BillingIntervalCalculator;
  private prorationCalculator: ProrationCalculator;
  private comparisonEngine: PricingComparisonEngine;

  constructor(config: PricingConfig = DEFAULT_PRICING_CONFIG) {
    this.config = config;
    this.discountCalculator = new DiscountCalculator(config);
    this.intervalCalculator = new BillingIntervalCalculator(config);
    this.prorationCalculator = new ProrationCalculator(config);
    this.comparisonEngine = new PricingComparisonEngine(config);
  }

  /**
   * Calculate subscription price based on plan and billing interval
   */
  calculateSubscriptionPrice(plan: Plan, billingInterval: BillingInterval): number {
    const breakdown = this.getPricingBreakdown(plan, billingInterval);
    return breakdown.finalPrice;
  }

  /**
   * Get detailed pricing breakdown
   */
  getPricingBreakdown(plan: Plan, billingInterval: BillingInterval): PricingBreakdown {
    const totalMonths = this.intervalCalculator.getTotalMonths(billingInterval);
    const totalPrice = plan.basePrice * totalMonths;
    const discountInfo = this.discountCalculator.calculateDiscount(totalPrice, billingInterval);
    const finalPrice = totalPrice - discountInfo.discountAmount;
    const monthlyEquivalent = finalPrice / totalMonths;

    return {
      basePrice: plan.basePrice,
      totalPrice,
      discount: discountInfo.discount,
      discountAmount: discountInfo.discountAmount,
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
    const intervals = this.intervalCalculator.getAllIntervals();
    const pricing: Record<BillingInterval, PricingBreakdown> = {} as any;

    for (const interval of intervals) {
      pricing[interval] = this.getPricingBreakdown(plan, interval);
    }

    return pricing;
  }

  /**
   * Get pricing comparison between two plans
   */
  getPricingComparison(plan1: Plan, plan2: Plan, billingInterval: BillingInterval) {
    return this.comparisonEngine.getPricingComparison(plan1, plan2, billingInterval);
  }

  /**
   * Calculate prorated amount for plan changes
   */
  calculateProratedAmount(
    currentPlan: Plan,
    newPlan: Plan,
    billingInterval: BillingInterval,
    daysRemaining: number
  ) {
    return this.prorationCalculator.calculateProratedAmount(
      currentPlan,
      newPlan,
      billingInterval,
      daysRemaining
    );
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: PricingConfig): void {
    this.config = newConfig;
    this.discountCalculator = new DiscountCalculator(newConfig);
    this.intervalCalculator = new BillingIntervalCalculator(newConfig);
    this.prorationCalculator = new ProrationCalculator(newConfig);
    this.comparisonEngine = new PricingComparisonEngine(newConfig);
  }

  getConfig(): PricingConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createPricingCalculator(config?: PricingConfig): PricingCalculator {
  return new PricingCalculator(config);
}

export function createDiscountCalculator(config: PricingConfig): DiscountCalculator {
  return new DiscountCalculator(config);
}

export function createBillingIntervalCalculator(config: PricingConfig): BillingIntervalCalculator {
  return new BillingIntervalCalculator(config);
}

export function createProrationCalculator(config: PricingConfig): ProrationCalculator {
  return new ProrationCalculator(config);
}

export function createPricingComparisonEngine(config: PricingConfig): PricingComparisonEngine {
  return new PricingComparisonEngine(config);
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  discounts: {
    monthly: 0,        // 0% discount
    quarterly: 10,     // 10% discount
    sixMonths: 15,     // 15% discount
    yearly: 20         // 20% discount
  },
  intervals: {
    monthly: { interval: 'monthly' as const, intervalCount: 1 },
    quarterly: { interval: 'quarterly' as const, intervalCount: 3 },
    sixMonths: { interval: 'sixMonths' as const, intervalCount: 6 },
    yearly: { interval: 'yearly' as const, intervalCount: 1 }
  }
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

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

// ============================================================================
// ADDITIONAL UTILITY FUNCTIONS (for UI components)
// ============================================================================

/**
 * Format billing cycle for display
 */
export const formatBillingCycle = (billingInterval: BillingInterval): string => {
  switch (billingInterval) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'sixMonths':
      return 'Six Months';
    case 'yearly':
      return 'Yearly';
    default:
      return billingInterval;
  }
};

/**
 * Get billing cycle discount percentage
 */
export const getBillingCycleDiscount = (billingInterval: BillingInterval): number => {
  return DEFAULT_PRICING_CONFIG.discounts[billingInterval] || 0;
};

/**
 * Calculate renewal price
 */
export const calculateRenewalPrice = (plan: Plan, billingInterval: BillingInterval): number => {
  return calculateSubscriptionPrice(plan, billingInterval);
};

/**
 * Calculate savings amount
 */
export const calculateSavings = (originalPrice: number, discountedPrice: number): number => {
  return Math.max(0, originalPrice - discountedPrice);
};

/**
 * Get discount percentage
 */
export const getDiscountPercentage = (billingInterval: BillingInterval): number => {
  return DEFAULT_PRICING_CONFIG.discounts[billingInterval] || 0;
};

/**
 * Calculate discounted price
 */
export const calculateDiscountedPrice = (originalPrice: number, discountPercentage: number): number => {
  const discountAmount = originalPrice * (discountPercentage / 100);
  return Math.max(0, originalPrice - discountAmount);
};

// ============================================================================
// PRICING RESOLVER CLASS (from pricing-resolver.ts)
// ============================================================================

export class PricingResolver {
  /**
   * Resolve pricing type cho product dựa trên merchant config
   * Simple: Chỉ dùng pricingType từ merchant (không cần pricingConfig object)
   */
  static resolvePricingType(
    product: Product,
    merchant: Merchant
  ): PricingType {
    // Use pricingType directly from merchant
    return (merchant.pricingType as PricingType) || 'FIXED';
  }
  
  /**
   * Get effective pricing config cho product
   */
  static getEffectivePricingConfig(
    product: Product,
    merchant: Merchant
  ): PricingInfo {
    const pricingType = this.resolvePricingType(product, merchant);
    
    return {
      pricingType,
      pricePerUnit: product.rentPrice || 0,
      minDuration: 1,
      maxDuration: 365,
      requireRentalDates: false,
      showPricingOptions: true
    };
  }

  /**
   * Calculate pricing cho product
   */
  static calculatePricing(
    product: Product,
    merchant: Merchant,
    duration?: number,
    quantity: number = 1
  ): CalculatedPricing {
    const config = this.getEffectivePricingConfig(product, merchant);
    const unitPrice = config.pricePerUnit;
    const totalPrice = unitPrice * quantity * (duration || 1);
    
    return {
      unitPrice,
      totalPrice,
      deposit: product.deposit || 0,
      pricingType: config.pricingType,
      duration,
      durationUnit: 'days'
    };
  }
}

// ============================================================================
// PRICING VALIDATOR CLASS (from pricing-validation.ts)
// ============================================================================

export class PricingValidator {
  /**
   * Validate rental period for a product
   */
  static validateRentalPeriod(
    product: Product,
    merchant: Merchant,
    rentalStartAt: Date,
    rentalEndAt: Date,
    quantity: number = 1
  ): RentalPeriodValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Get pricing type from merchant (simplified - no need for pricingConfig object)
    const pricingType = merchant.pricingType || 'FIXED';
    const businessType = merchant.businessType || 'GENERAL';

    // Validate rental dates
    if (rentalStartAt >= rentalEndAt) {
      errors.push('Rental start date must be before end date');
    }

    // Calculate duration in days
    const durationMs = rentalEndAt.getTime() - rentalStartAt.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    // Use default duration limits (simplified)
    const minDuration = 1;
    const maxDuration = 365;
    
    if (durationDays < minDuration) {
      errors.push(`Minimum rental duration is ${minDuration} day`);
      suggestions.push(`Please select at least ${minDuration} day`);
    }

    if (durationDays > maxDuration) {
      warnings.push(`Rental duration (${durationDays} days) exceeds recommended maximum (${maxDuration} days)`);
      suggestions.push('Consider splitting into multiple rentals');
    }

    // Validate quantity
    if (quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (quantity > 100) {
      warnings.push('Large quantity rental detected');
      suggestions.push('Consider bulk pricing or contact for custom quote');
    }

    // Validate product availability
    if (product.stock < quantity) {
      errors.push(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
    }

    // Validate pricing
    if (!product.rentPrice || product.rentPrice <= 0) {
      errors.push('Invalid product pricing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate pricing configuration
   */
  static validatePricingConfig(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.defaultPricingType) {
      errors.push('Default pricing type is required');
    }

    if (!config.durationLimits) {
      errors.push('Duration limits are required');
    } else {
      if (!config.durationLimits.minDays || config.durationLimits.minDays < 1) {
        errors.push('Minimum duration must be at least 1 day');
      }
      if (!config.durationLimits.maxDays || config.durationLimits.maxDays < 1) {
        errors.push('Maximum duration must be at least 1 day');
      }
      if (config.durationLimits.minDays >= config.durationLimits.maxDays) {
        errors.push('Minimum duration must be less than maximum duration');
      }
    }

    // Check business rules
    if (config.businessRules) {
      if (config.businessRules.requireDeposit && config.businessRules.depositPercentage <= 0) {
        errors.push('Deposit percentage must be greater than 0 when deposits are required');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warning: warnings.length > 0 ? warnings.join('; ') : undefined,
      suggestions: errors.length > 0 ? ['Review pricing configuration'] : undefined
    };
  }
}
