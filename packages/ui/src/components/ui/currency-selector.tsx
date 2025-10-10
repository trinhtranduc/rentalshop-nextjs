// ============================================================================
// CURRENCY SELECTOR COMPONENT
// ============================================================================

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { useCurrency } from '@rentalshop/hooks';
import { CurrencyCode } from '@rentalshop/types';
import { getCurrencyDisplay } from '@rentalshop/utils';

interface CurrencySelectorProps {
  /** CSS class name for styling */
  className?: string;
  /** Whether to show currency symbols */
  showSymbols?: boolean;
  /** Whether to show currency codes */
  showCodes?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Callback when currency changes */
  onCurrencyChange?: (currency: CurrencyCode) => void;
}

export function CurrencySelector({
  className = '',
  showSymbols = true,
  showCodes = true,
  disabled = false,
  onCurrencyChange,
}: CurrencySelectorProps) {
  const { currentCurrency, setCurrency, settings } = useCurrency();

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyCode;
    setCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
  };

  // Get available currencies from settings
  const availableCurrencies = settings.availableCurrencies;

  return (
    <Select
      value={currentCurrency}
      onValueChange={handleCurrencyChange}
      disabled={disabled}
    >
      <SelectTrigger className={`w-auto min-w-[120px] ${className}`}>
        <SelectValue>
          <span className="flex items-center gap-2">
            {showSymbols && (
              <span className="text-sm font-medium">
                {currentCurrency === 'USD' ? '$' : 'đ'}
              </span>
            )}
            {showCodes && (
              <span className="text-sm">
                {currentCurrency}
              </span>
            )}
          </span>
        </SelectValue>
      </SelectTrigger>
      
      <SelectContent>
        {availableCurrencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <div className="flex items-center gap-2">
              {showSymbols && (
                <span className="font-medium">
                  {currency.symbol}
                </span>
              )}
              {showCodes && (
                <span>
                  {currency.code}
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                {currency.name}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CurrencySelector;
