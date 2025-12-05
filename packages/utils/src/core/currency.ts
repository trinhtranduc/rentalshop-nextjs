// ============================================================================
// CURRENCY UTILITIES
// ============================================================================

import { 
  CurrencyCode, 
  Currency, 
  CurrencySettings, 
  CurrencyFormatOptions 
} from '@rentalshop/types';

/**
 * Default currency configuration
 * USD is the base currency (exchangeRate: 1)
 * VND exchange rate is approximate (1 USD ≈ 24,500 VND)
 */
export const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    minFractionDigits: 2,
    maxFractionDigits: 2,
    symbolBefore: true,
    exchangeRate: 1,
  },
  {
    code: 'VND',
    symbol: 'đ',
    name: 'Vietnamese Dong',
    locale: 'vi-VN',
    minFractionDigits: 0,
    maxFractionDigits: 0,
    symbolBefore: false,
    exchangeRate: 24500, // 1 USD ≈ 24,500 VND
  },
];

/**
 * Default currency settings
 */
export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  currentCurrency: 'USD', // Default to USD
  baseCurrency: 'USD',
  availableCurrencies: DEFAULT_CURRENCIES,
  showSymbol: false,
  showCode: false,
};

/**
 * Get currency by code
 * @param code - Currency code
 * @returns Currency configuration or undefined if not found
 */
export function getCurrency(code: CurrencyCode): Currency | undefined {
  return DEFAULT_CURRENCIES.find(currency => currency.code === code);
}

/**
 * Get current currency configuration
 * @param settings - Currency settings (optional, uses default if not provided)
 * @returns Current currency configuration
 */
export function getCurrentCurrency(settings?: CurrencySettings): Currency {
  const currentSettings = settings || DEFAULT_CURRENCY_SETTINGS;
  const currency = getCurrency(currentSettings.currentCurrency);
  
  if (!currency) {
    // Fallback to USD if current currency not found
    return DEFAULT_CURRENCIES.find(c => c.code === 'USD')!;
  }
  
  return currency;
}

/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number, 
  fromCurrency: CurrencyCode, 
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);

  if (!from || !to) {
    throw new Error(`Invalid currency code: ${fromCurrency} or ${toCurrency}`);
  }

  // Convert to base currency (USD) first, then to target currency
  const amountInUSD = amount / from.exchangeRate;
  return amountInUSD * to.exchangeRate;
}

/**
 * Format amount as currency with advanced options
 * @param amount - Amount to format
 * @param options - Formatting options
 * @param settings - Currency settings (optional)
 * @returns Formatted currency string
 */
export function formatCurrencyAdvanced(
  amount: number | null | undefined,
  options: CurrencyFormatOptions = {},
  settings?: CurrencySettings
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  const currentSettings = settings || DEFAULT_CURRENCY_SETTINGS;
  const currencyCode = options.currency || currentSettings.currentCurrency;
  const currency = getCurrency(currencyCode);
  
  if (!currency) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }

  // Always use 'en-US' locale for consistent formatting with "," for thousands and "." for decimals
  const locale = 'en-US';
  const showSymbol = options.showSymbol ?? currentSettings.showSymbol;
  const showCode = options.showCode ?? currentSettings.showCode;

  // Smart decimal formatting:
  // - USD: Only show decimals if there are cents (e.g., $91 not $91.00, but $91.50 stays)
  // - VND: Never show decimals (always 0)
  const hasDecimals = amount % 1 !== 0; // Check if there's a fractional part
  
  // Determine fraction digits dynamically
  let minDecimals: number;
  let maxDecimals: number;
  
  if (currency.code === 'VND') {
    // VND: Never show decimals
    minDecimals = 0;
    maxDecimals = 0;
  } else if (hasDecimals) {
    // USD with decimals: Show up to 2 decimals
    minDecimals = 0; // Don't force trailing zeros
    maxDecimals = 2; // But allow up to 2 decimals
  } else {
    // USD whole number: No decimals
    minDecimals = 0;
    maxDecimals = 0;
  }
  
  // Format the number with en-US locale - always "," for thousands and "." for decimals
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(amount);

  // Build the result string
  let result = formattedNumber;

  if (showSymbol) {
    if (currency.symbolBefore) {
      result = `${currency.symbol}${result}`;
    } else {
      result = `${result}${currency.symbol}`;
    }
  }

  if (showCode) {
    result = `${result} ${currency.code}`;
  }

  return result;
}

/**
 * Format amount as currency (simplified version for backward compatibility)
 * @param amount - Amount to format
 * @param currency - Currency code (optional, uses current currency if not provided)
 * @param locale - Locale for formatting (optional)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | null | undefined, 
  currency: CurrencyCode = 'USD', 
  locale?: string
): string {
  return formatCurrencyAdvanced(amount, { currency, locale });
}

/**
 * Parse currency string to number
 * @param currencyString - Currency string to parse
 * @param currency - Currency code to parse from
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(currencyString: string, currency: CurrencyCode = 'USD'): number | null {
  if (!currencyString || typeof currencyString !== 'string') {
    return null;
  }

  const currencyConfig = getCurrency(currency);
  if (!currencyConfig) {
    return null;
  }

  // Remove currency symbol and code
  let cleanString = currencyString
    .replace(new RegExp(`[${currencyConfig.symbol}]`, 'g'), '')
    .replace(new RegExp(currencyConfig.code, 'gi'), '')
    .trim();

  // Remove thousand separators and convert decimal separator
  if (currencyConfig.locale === 'vi-VN') {
    // Vietnamese format: 1.234,56
    cleanString = cleanString.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56
    cleanString = cleanString.replace(/,/g, '');
  }

  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get currency display string (symbol + code)
 * @param currency - Currency code
 * @returns Display string (e.g., "$ USD" or "đ VND")
 */
export function getCurrencyDisplay(currency: CurrencyCode): string {
  const currencyConfig = getCurrency(currency);
  if (!currencyConfig) {
    return currency;
  }

  if (currencyConfig.symbolBefore) {
    return `${currencyConfig.symbol} ${currencyConfig.code}`;
  } else {
    return `${currencyConfig.code} ${currencyConfig.symbol}`;
  }
}

/**
 * Validate currency code
 * @param code - Currency code to validate
 * @returns True if valid, false otherwise
 */
export function isValidCurrencyCode(code: string): code is CurrencyCode {
  return ['USD', 'VND'].includes(code as CurrencyCode);
}

/**
 * Get exchange rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate
 */
export function getExchangeRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);

  if (!from || !to) {
    throw new Error(`Invalid currency code: ${fromCurrency} or ${toCurrency}`);
  }

  // Calculate exchange rate through base currency (USD)
  return to.exchangeRate / from.exchangeRate;
}
