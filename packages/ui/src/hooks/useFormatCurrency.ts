/**
 * useFormatCurrency Hook
 * 
 * Custom hook that automatically uses merchant's currency from context
 * to format amounts without having to pass currency every time.
 * 
 * @example
 * ```tsx
 * const format = useFormatCurrency();
 * 
 * // Simple usage
 * <div>{format(100)}</div>  // Output: $100.00 or 100,000đ
 * 
 * // With calculations
 * <div>{format(quantity * price)}</div>
 * ```
 */

import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '@rentalshop/utils';

export function useFormatCurrency() {
  const { currency } = useCurrency();
  
  /**
   * Format amount with merchant's currency
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  return (amount: number | null | undefined): string => {
    return formatCurrency(amount, currency);
  };
}

