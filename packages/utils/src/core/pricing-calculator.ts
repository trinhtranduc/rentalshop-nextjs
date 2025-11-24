// ============================================================================
// REFACTORED PRICING CALCULATOR SYSTEM
// ============================================================================

import { Plan, Product, Merchant, PricingType, PricingDurationLimits } from '@rentalshop/types';
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
    semi_annual: number;
    annual: number;
  };
  intervals: {
    monthly: { interval: BillingInterval; intervalCount: number };
    quarterly: { interval: BillingInterval; intervalCount: number };
    semi_annual: { interval: BillingInterval; intervalCount: number };
    annual: { interval: BillingInterval; intervalCount: number };
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
      semi_annual: 6,
      annual: 12
    };

    return intervalMap[billingInterval] || 1;
  }

  /**
   * Get all available billing intervals
   */
  getAllIntervals(): BillingInterval[] {
    return ['monthly', 'quarterly', 'semi_annual', 'annual'];
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
      semi_annual: 'Semi-Annual',
      annual: 'Annual'
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
    quarterly: 0,      // 0% discount
    semi_annual: 5,    // 5% discount
    annual: 10         // 10% discount
  },
  intervals: {
    monthly: { interval: 'monthly' as BillingInterval, intervalCount: 1 },
    quarterly: { interval: 'quarterly' as BillingInterval, intervalCount: 3 },
    semi_annual: { interval: 'semi_annual' as BillingInterval, intervalCount: 6 },
    annual: { interval: 'annual' as BillingInterval, intervalCount: 12 }
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
    case 'semi_annual':
      return 'Semi-Annual';
    case 'annual':
      return 'Annual';
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
// HELPER FUNCTIONS FOR DURATION CONFIGURATION
// ============================================================================

/**
 * Parse product duration limits from durationConfig
 * Returns duration limits or null if not found
 */
export function parseProductDurationLimits(product: Product): PricingDurationLimits | null {
  try {
    if (!product.durationConfig) {
      return null;
    }

    // Parse durationConfig if it's a string
    let config: any = null;
    if (typeof product.durationConfig === 'string') {
      config = JSON.parse(product.durationConfig);
    } else {
      config = product.durationConfig;
    }

    // Extract duration limits from config
    if (config && (config.minDuration !== undefined || config.maxDuration !== undefined || config.defaultDuration !== undefined)) {
      return {
        minDuration: config.minDuration || 1,
        maxDuration: config.maxDuration || 365,
        defaultDuration: config.defaultDuration || 1
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing product duration limits:', error);
    return null;
  }
}

/**
 * Get effective duration limits from product only (no merchant fallback)
 * Only required for HOURLY/DAILY pricing types
 */
export function getEffectiveDurationLimits(product: Product, merchant: Merchant): PricingDurationLimits {
  // Get pricing type directly from product (defaults to FIXED if null)
  const pricingType = (product.pricingType as PricingType) || 'FIXED';
  
  // FIXED pricing doesn't need duration limits
  if (pricingType === 'FIXED') {
    return {
      minDuration: 1,
      maxDuration: 1,
      defaultDuration: 1
    };
  }
  
  // HOURLY/DAILY require durationConfig
  const productLimits = parseProductDurationLimits(product);
  if (productLimits) {
    return productLimits;
  }

  // If HOURLY/DAILY but no durationConfig, throw error
  throw new Error(
    `Product ${product.id} (${product.name}) has pricingType ${pricingType} but missing durationConfig. ` +
    `Duration configuration is required for HOURLY and DAILY pricing types.`
  );
}

/**
 * Calculate duration in the correct unit based on pricing type
 * Returns duration and unit
 */
export function calculateDurationInUnit(
  start: Date,
  end: Date,
  pricingType: PricingType
): { duration: number; unit: 'hour' | 'day' | 'rental' } {
  const durationMs = end.getTime() - start.getTime();

  switch (pricingType) {
    case 'HOURLY':
      return {
        duration: Math.ceil(durationMs / (1000 * 60 * 60)), // hours
        unit: 'hour'
      };
    case 'DAILY':
      return {
        duration: Math.ceil(durationMs / (1000 * 60 * 60 * 24)), // days
        unit: 'day'
      };
    case 'FIXED':
    default:
      return {
        duration: 1, // 1 rental
        unit: 'rental'
      };
  }
}

/**
 * Get duration unit label for pricing type
 */
export function getDurationUnitLabel(pricingType: PricingType): string {
  switch (pricingType) {
    case 'HOURLY':
      return 'hour';
    case 'DAILY':
      return 'day';
    case 'FIXED':
      return 'rental';
    default:
      return 'unit';
  }
}

// ============================================================================
// PRICING RESOLVER CLASS (from pricing-resolver.ts)
// ============================================================================

export class PricingResolver {
  /**
   * Resolve pricing type cho product
   * Default to FIXED if product.pricingType is null (minimal changes, backward compatible)
   */
  static resolvePricingType(
    product: Product,
    merchant: Merchant
  ): PricingType {
    // Product pricingType is source of truth
    // NULL or undefined → Default to FIXED (backward compatible)
    if (product.pricingType) {
      return product.pricingType as PricingType;
    }
    
    // Default to FIXED if null (minimal changes, backward compatible)
    return 'FIXED';
  }
  
  /**
   * Get effective pricing config cho product
   * Uses product config only, defaults to FIXED if not set
   */
  static getEffectivePricingConfig(
    product: Product,
    merchant: Merchant
  ): PricingInfo {
    const pricingType = this.resolvePricingType(product, merchant);
    
    // Get duration limits from product (only for HOURLY/DAILY)
    let minDuration = 1;
    let maxDuration = 365;
    
    if (pricingType !== 'FIXED') {
      try {
        const durationLimits = getEffectiveDurationLimits(product, merchant);
        minDuration = durationLimits.minDuration;
        maxDuration = durationLimits.maxDuration;
      } catch (error) {
        // If HOURLY/DAILY but no durationConfig, will throw error
        // This is handled by validation
        console.error('Error getting duration limits:', error);
      }
    }
    
    return {
      pricingType,
      pricePerUnit: product.rentPrice || 0,
      minDuration,
      maxDuration,
      requireRentalDates: pricingType !== 'FIXED',
      showPricingOptions: pricingType !== 'FIXED'
    };
  }

  /**
   * Calculate pricing cho product
   * Now calculates duration in correct unit based on pricing type
   */
  static calculatePricing(
    product: Product,
    merchant: Merchant,
    duration?: number,
    quantity: number = 1
  ): CalculatedPricing {
    const config = this.getEffectivePricingConfig(product, merchant);
    const unitPrice = config.pricePerUnit;
    
    // Calculate total price based on pricing type
    let totalPrice: number;
    let durationUnit: string;
    let effectiveDuration = duration || 1;
    
    if (config.pricingType === 'FIXED') {
      // Fixed pricing: don't multiply by duration
      totalPrice = unitPrice * quantity;
      durationUnit = 'rental';
    } else {
      // Time-based pricing: apply minimum charge if duration < minDuration
      // Minimum Charge: If duration < minDuration, charge for minDuration
      if (duration && duration < config.minDuration) {
        effectiveDuration = config.minDuration;
      }
      
      totalPrice = unitPrice * quantity * effectiveDuration;
      durationUnit = getDurationUnitLabel(config.pricingType);
    }
    
    return {
      unitPrice,
      totalPrice,
      deposit: product.deposit || 0,
      pricingType: config.pricingType,
      duration: effectiveDuration, // Return effective duration (may be adjusted for minimum charge)
      durationUnit
    };
  }

  /**
   * Calculate price with rental dates
   * Calculates duration and price based on start/end dates
   */
  static calculatePrice(
    product: Product,
    merchant: Merchant,
    rentalStartAt: Date,
    rentalEndAt: Date,
    quantity: number = 1
  ): CalculatedPricing {
    const pricingType = this.resolvePricingType(product, merchant);
    const { duration, unit } = calculateDurationInUnit(rentalStartAt, rentalEndAt, pricingType);
    
    return this.calculatePricing(product, merchant, duration, quantity);
  }
}

// ============================================================================
// PRICING VALIDATOR CLASS (from pricing-validation.ts)
// ============================================================================

export class PricingValidator {
  /**
   * Validate rental period for a product
   * Only validates duration for HOURLY/DAILY, skips for FIXED
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

    // Get pricing type from product (defaults to FIXED if null)
    const pricingType = PricingResolver.resolvePricingType(product, merchant);

    // For FIXED pricing, skip duration validation
    if (pricingType === 'FIXED') {
      // Only validate quantity and stock for FIXED
      if (quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      if (quantity > 100) {
        warnings.push('Large quantity rental detected');
        suggestions.push('Consider bulk pricing or contact for custom quote');
      }
      if (product.stock < quantity) {
        errors.push(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
      }
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

    // For HOURLY/DAILY, validate duration
    // Validate rental dates
    if (rentalStartAt >= rentalEndAt) {
      errors.push('Rental start date must be before end date');
    }

    // Calculate duration in correct unit based on pricing type
    const { duration, unit } = calculateDurationInUnit(rentalStartAt, rentalEndAt, pricingType);

    // Get duration limits from product (required for HOURLY/DAILY)
    try {
      const durationLimits = getEffectiveDurationLimits(product, merchant);
      const minDuration = durationLimits.minDuration;
      const maxDuration = durationLimits.maxDuration;
    
      // Validate duration against limits
      // Minimum Charge: Show warning (not error) if duration < minDuration
      // System will automatically charge for minDuration
      if (duration < minDuration) {
        const unitLabel = unit === 'hour' ? 'hour' : unit === 'day' ? 'day' : 'rental';
        const unitLabelPlural = minDuration === 1 ? unitLabel : `${unitLabel}s`;
        warnings.push(
          `Rental duration (${duration} ${unitLabelPlural}) is less than minimum (${minDuration} ${unitLabelPlural}). ` +
          `You will be charged for the minimum duration of ${minDuration} ${unitLabelPlural}.`
        );
        suggestions.push(`Consider selecting at least ${minDuration} ${unitLabelPlural} to get full value`);
    }

      if (duration > maxDuration) {
        const unitLabel = unit === 'hour' ? 'hour' : unit === 'day' ? 'day' : 'rental';
        const unitLabelPlural = duration === 1 ? unitLabel : `${unitLabel}s`;
        warnings.push(`Rental duration (${duration} ${unitLabelPlural}) exceeds maximum (${maxDuration} ${unitLabelPlural})`);
        suggestions.push('Consider splitting into multiple rentals or contact for custom quote');
      }
    } catch (error: any) {
      // If HOURLY/DAILY but no durationConfig, add error
      errors.push(error.message || 'Duration configuration is required for this pricing type');
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
