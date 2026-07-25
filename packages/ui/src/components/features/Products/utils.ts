// ============================================================================
// PRODUCT UTILITIES
// ============================================================================

import type { PricingType } from '@rentalshop/constants';

/**
 * Get rental price label based on pricing type
 * @param pricingType - The pricing type (FIXED, HOURLY, DAILY, or null)
 * @param t - Translation function from useProductTranslations
 * @returns The appropriate label for the rental price
 */
export function getRentalPriceLabel(
  pricingType: PricingType | null | undefined,
  t: (key: string) => string
): string {
  if (pricingType === 'HOURLY') {
    return t('pricing.pricePerHour');
  } else if (pricingType === 'DAILY') {
    return t('pricing.pricePerDay');
  } else {
    // FIXED or null (default to FIXED)
    return t('pricing.pricePerRental');
  }
}
    
/**
 * Get rental price unit suffix for display
 * @param pricingType - The pricing type (FIXED, HOURLY, DAILY, or null)
 * @param t - Translation function from useProductTranslations
 * @returns The unit suffix (e.g., "/giờ", "/ngày", "/lần")
 */
export function getRentalPriceUnit(
  pricingType: PricingType | null | undefined,
  t: (key: string) => string
): string {
  if (pricingType === 'HOURLY') {
    return `/${t('pricing.durationUnitHours')}`;
  } else if (pricingType === 'DAILY') {
    return `/${t('pricing.durationUnitDays')}`;
  }
  // FIXED (per rental): no unit suffix next to the price
  return '';
}

/**
 * Format rental price with unit
 * @param price - The rental price
 * @param pricingType - The pricing type
 * @param t - Translation function
 * @param formatCurrency - Currency formatting function
 * @returns Formatted price string with unit
 */
export function formatRentalPrice(
  price: number,
  pricingType: PricingType | null | undefined,
  t: (key: string) => string,
  formatCurrency: (value: number) => string
): string {
  const unit = getRentalPriceUnit(pricingType, t);
  return `${formatCurrency(price)}${unit}`;
}
