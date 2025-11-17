/**
 * Money Component
 * 
 * Automatically formats and displays money using merchant's currency from context.
 * No need to manually get currency or call formatCurrency.
 * 
 * @example
 * ```tsx
 * // Simple display
 * <Money amount={100} />  // Output: $100.00 or 100,000đ
 * 
 * // With calculation
 * <Money amount={quantity * price} />
 * 
 * // With custom className
 * <Money amount={total} className="text-lg font-bold text-green-600" />
 * 
 * // As inline text
 * Total: <Money amount={1000} /> (no wrapper div)
 * ```
 */

import React from 'react';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

interface MoneyProps {
  /** Amount to display */
  amount: number | null | undefined;
  /** Optional className for styling */
  className?: string;
  /** If true, renders as span instead of div (for inline usage) */
  inline?: boolean;
}

export const Money: React.FC<MoneyProps> = ({ 
  amount, 
  className = '',
  inline = false 
}) => {
  const format = useFormatCurrency();
  const formatted = format(amount);
  
  if (inline) {
    return <span className={className}>{formatted}</span>;
  }
  
  return <div className={className}>{formatted}</div>;
};

/**
 * MoneyBold - Money component with bold styling
 */
export const MoneyBold: React.FC<Omit<MoneyProps, 'className'>> = ({ amount, inline }) => (
  <Money amount={amount} className="font-bold" inline={inline} />
);

/**
 * MoneyLarge - Money component with larger text
 */
export const MoneyLarge: React.FC<Omit<MoneyProps, 'className'>> = ({ amount, inline }) => (
  <Money amount={amount} className="text-lg font-semibold" inline={inline} />
);

export default Money;

