// ============================================================================
// SUBSCRIPTION PRICING CONFIGURATION
// ============================================================================
// Centralized pricing and discount configuration for subscription renewals
// Used across: Admin UI, Client UI, API calculations

/**
 * Subscription renewal duration options with discount rates
 */
export const RENEWAL_DURATIONS = [
  {
    months: 1,
    name: '1 Month',
    label: 'Monthly',
    discount: 0,      // No discount
    description: 'Pay monthly, cancel anytime'
  },
  {
    months: 3,
    name: '3 Months',
    label: 'Quarterly',
    discount: 0.10,   // 10% off
    description: 'Save 10% with quarterly billing'
  },
  {
    months: 6,
    name: '6 Months',
    label: 'Semi-Annual',
    discount: 0.15,   // 15% off
    description: 'Save 15% with semi-annual billing'
  },
  {
    months: 12,
    name: '12 Months',
    label: 'Yearly',
    discount: 0.20,   // 20% off
    description: 'Save 20% with annual billing'
  }
] as const;

/**
 * Get discount rate for a specific duration
 * @param months - Number of months
 * @returns Discount rate (0-1)
 */
export function getDiscountRate(months: number): number {
  const option = RENEWAL_DURATIONS.find(d => d.months === months);
  return option?.discount || 0;
}

/**
 * Get discount percentage for display
 * @param months - Number of months
 * @returns Percentage (e.g., 10 for 10%)
 */
export function getDiscountPercentage(months: number): number {
  return getDiscountRate(months) * 100;
}

/**
 * Calculate total price with discount
 * @param basePrice - Monthly base price
 * @param months - Number of months
 * @returns Total price after discount
 */
export function calculateRenewalPrice(basePrice: number, months: number): number {
  const discount = getDiscountRate(months);
  const baseTotal = basePrice * months;
  return baseTotal * (1 - discount);
}

/**
 * Calculate savings amount
 * @param basePrice - Monthly base price
 * @param months - Number of months
 * @returns Savings amount
 */
export function calculateSavings(basePrice: number, months: number): number {
  const baseTotal = basePrice * months;
  const discountedTotal = calculateRenewalPrice(basePrice, months);
  return baseTotal - discountedTotal;
}

/**
 * Get renewal option details
 * @param months - Number of months
 * @returns Full option details or null
 */
export function getRenewalOption(months: number) {
  return RENEWAL_DURATIONS.find(d => d.months === months) || null;
}

/**
 * Format discount for display
 * @param months - Number of months
 * @returns Formatted string (e.g., "Save 10%")
 */
export function formatDiscount(months: number): string {
  const percentage = getDiscountPercentage(months);
  return percentage > 0 ? `Save ${percentage}%` : '';
}

// Export type for TypeScript
export type RenewalDuration = typeof RENEWAL_DURATIONS[number];
export type RenewalMonths = 1 | 3 | 6 | 12;

