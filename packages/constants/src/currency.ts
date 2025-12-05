/**
 * Currency Constants
 * 
 * Centralized currency-related constants for the rental shop application.
 * Supports USD and VND currencies at the merchant level.
 */

/**
 * Currency code type
 */
export type CurrencyCode = 'USD' | 'VND';

/**
 * Supported currency codes
 */
export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ['USD', 'VND'] as const;

/**
 * Default currency for new merchants
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

/**
 * Currency symbols mapped to currency codes
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  VND: 'đ',
};

/**
 * Currency names mapped to currency codes
 */
export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US Dollar',
  VND: 'Vietnamese Dong',
};

/**
 * Currency locales for formatting
 */
export const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  VND: 'vi-VN',
};

/**
 * Currency decimal places
 */
export const CURRENCY_DECIMALS: Record<CurrencyCode, number> = {
  USD: 2,
  VND: 0,
};

/**
 * Symbol position (before or after amount)
 */
export const CURRENCY_SYMBOL_POSITION: Record<CurrencyCode, 'before' | 'after'> = {
  USD: 'before',
  VND: 'after',
};

/**
 * Exchange rates to USD (base currency)
 * Note: These are approximate rates for reference only
 * In production, fetch real-time rates from an API
 */
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  VND: 24500,
};

/**
 * Currency configuration for easy access
 */
export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
  exchangeRate: number;
}

/**
 * Complete currency configurations
 */
export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: CURRENCY_SYMBOLS.USD,
    name: CURRENCY_NAMES.USD,
    locale: CURRENCY_LOCALES.USD,
    decimals: CURRENCY_DECIMALS.USD,
    symbolPosition: CURRENCY_SYMBOL_POSITION.USD,
    exchangeRate: EXCHANGE_RATES.USD,
  },
  VND: {
    code: 'VND',
    symbol: CURRENCY_SYMBOLS.VND,
    name: CURRENCY_NAMES.VND,
    locale: CURRENCY_LOCALES.VND,
    decimals: CURRENCY_DECIMALS.VND,
    symbolPosition: CURRENCY_SYMBOL_POSITION.VND,
    exchangeRate: EXCHANGE_RATES.VND,
  },
};

/**
 * Get currency configuration by code
 * @param code - Currency code
 * @returns Currency configuration
 */
export function getCurrencyConfig(code: CurrencyCode): CurrencyConfig {
  return CURRENCY_CONFIGS[code];
}

/**
 * Check if a currency code is valid
 * @param code - Currency code to check
 * @returns True if valid, false otherwise
 */
export function isValidCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(code as CurrencyCode);
}

/**
 * Get currency symbol
 * @param code - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCY_SYMBOLS[code];
}

/**
 * Get currency name
 * @param code - Currency code
 * @returns Currency name
 */
export function getCurrencyName(code: CurrencyCode): string {
  return CURRENCY_NAMES[code];
}

/**
 * Currency selection options for dropdowns
 */
export const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map(code => ({
  value: code,
  label: `${CURRENCY_SYMBOLS[code]} ${code} - ${CURRENCY_NAMES[code]}`,
  symbol: CURRENCY_SYMBOLS[code],
  name: CURRENCY_NAMES[code],
}));

/**
 * Default currency settings
 */
export const DEFAULT_CURRENCY_SETTINGS = {
  currentCurrency: DEFAULT_CURRENCY,
  baseCurrency: DEFAULT_CURRENCY,
  showSymbol: false,
  showCode: false,
};

