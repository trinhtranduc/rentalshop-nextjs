// ============================================================================
// CURRENCY TYPES
// ============================================================================

/**
 * Supported currency codes
 */
export type CurrencyCode = 'USD' | 'VND';

/**
 * Currency configuration interface
 */
export interface Currency {
  /** Currency code (e.g., 'USD', 'VND') */
  code: CurrencyCode;
  /** Currency symbol (e.g., '$', 'đ') */
  symbol: string;
  /** Currency name (e.g., 'US Dollar', 'Vietnamese Dong') */
  name: string;
  /** Locale for formatting (e.g., 'en-US', 'vi-VN') */
  locale: string;
  /** Minimum fraction digits */
  minFractionDigits: number;
  /** Maximum fraction digits */
  maxFractionDigits: number;
  /** Whether to show currency symbol before amount */
  symbolBefore: boolean;
  /** Exchange rate to base currency (USD) */
  exchangeRate: number;
}

/**
 * Currency settings for the application
 */
export interface CurrencySettings {
  /** Currently selected currency */
  currentCurrency: CurrencyCode;
  /** Base currency for the system (always USD) */
  baseCurrency: CurrencyCode;
  /** Available currencies */
  availableCurrencies: Currency[];
  /** Whether to show currency symbol */
  showSymbol: boolean;
  /** Whether to show currency code */
  showCode: boolean;
}

/**
 * Currency formatting options
 */
export interface CurrencyFormatOptions {
  /** Currency to format in */
  currency?: CurrencyCode;
  /** Locale for formatting */
  locale?: string;
  /** Whether to show currency symbol */
  showSymbol?: boolean;
  /** Whether to show currency code */
  showCode?: boolean;
  /** Custom fraction digits */
  fractionDigits?: number;
}
