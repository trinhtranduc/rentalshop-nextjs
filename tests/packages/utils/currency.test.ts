/**
 * Unit tests for @rentalshop/utils - Currency Utilities
 */

// Mock @rentalshop/types to provide CurrencyCode type
jest.mock('@rentalshop/types', () => ({}), { virtual: true });

import {
  getCurrency,
  getCurrentCurrency,
  convertCurrency,
  formatCurrency,
  formatCurrencyAdvanced,
  parseCurrency,
  getCurrencyDisplay,
  isValidCurrencyCode,
  getExchangeRate,
  DEFAULT_CURRENCIES,
  DEFAULT_CURRENCY_SETTINGS,
} from '../../../packages/utils/src/core/currency';

describe('@rentalshop/utils - Currency Utilities', () => {
  describe('getCurrency', () => {
    it('should return USD currency config', () => {
      const usd = getCurrency('USD' as any);
      expect(usd).toBeDefined();
      expect(usd!.code).toBe('USD');
      expect(usd!.symbol).toBe('$');
      expect(usd!.exchangeRate).toBe(1);
    });

    it('should return VND currency config', () => {
      const vnd = getCurrency('VND' as any);
      expect(vnd).toBeDefined();
      expect(vnd!.code).toBe('VND');
      expect(vnd!.symbol).toBe('đ');
      expect(vnd!.exchangeRate).toBe(24500);
    });

    it('should return undefined for invalid currency', () => {
      const result = getCurrency('XYZ' as any);
      expect(result).toBeUndefined();
    });
  });

  describe('getCurrentCurrency', () => {
    it('should return default currency (USD)', () => {
      const currency = getCurrentCurrency();
      expect(currency.code).toBe('USD');
    });

    it('should return specified currency from settings', () => {
      const settings = { ...DEFAULT_CURRENCY_SETTINGS, currentCurrency: 'VND' as any };
      const currency = getCurrentCurrency(settings);
      expect(currency.code).toBe('VND');
    });
  });

  describe('convertCurrency', () => {
    it('should return same amount for same currency', () => {
      expect(convertCurrency(100, 'USD' as any, 'USD' as any)).toBe(100);
    });

    it('should convert USD to VND', () => {
      const result = convertCurrency(1, 'USD' as any, 'VND' as any);
      expect(result).toBe(24500);
    });

    it('should convert VND to USD', () => {
      const result = convertCurrency(24500, 'VND' as any, 'USD' as any);
      expect(result).toBe(1);
    });

    it('should throw for invalid currency code', () => {
      expect(() => convertCurrency(100, 'XYZ' as any, 'USD' as any)).toThrow();
    });
  });

  describe('formatCurrency', () => {
    it('should format USD amount', () => {
      const result = formatCurrency(1000, 'USD' as any);
      expect(result).toBe('1,000');
    });

    it('should format USD with decimals', () => {
      const result = formatCurrency(99.5, 'USD' as any);
      expect(result).toContain('99');
      expect(result).toContain('5');
    });

    it('should handle null amount', () => {
      expect(formatCurrency(null as any)).toBe('0');
    });

    it('should handle undefined amount', () => {
      expect(formatCurrency(undefined as any)).toBe('0');
    });

    it('should handle NaN', () => {
      expect(formatCurrency(NaN)).toBe('0');
    });
  });

  describe('formatCurrencyAdvanced', () => {
    it('should format with symbol', () => {
      const result = formatCurrencyAdvanced(100, { currency: 'USD' as any, showSymbol: true });
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should format VND with symbol after', () => {
      const result = formatCurrencyAdvanced(50000, { currency: 'VND' as any, showSymbol: true });
      expect(result).toContain('đ');
      expect(result).toContain('50,000');
    });

    it('should format with currency code', () => {
      const result = formatCurrencyAdvanced(100, { currency: 'USD' as any, showCode: true });
      expect(result).toContain('USD');
    });

    it('should not show decimals for whole USD amounts', () => {
      const result = formatCurrencyAdvanced(91, { currency: 'USD' as any });
      expect(result).toBe('91');
      expect(result).not.toContain('.');
    });

    it('should show decimals for fractional USD amounts', () => {
      const result = formatCurrencyAdvanced(91.5, { currency: 'USD' as any });
      expect(result).toContain('91.5');
    });

    it('should never show decimals for VND', () => {
      const result = formatCurrencyAdvanced(50000.5, { currency: 'VND' as any });
      expect(result).not.toContain('.');
    });
  });

  describe('parseCurrency', () => {
    it('should parse USD formatted string', () => {
      expect(parseCurrency('1,234.56', 'USD' as any)).toBe(1234.56);
    });

    it('should parse string with currency symbol', () => {
      expect(parseCurrency('$100', 'USD' as any)).toBe(100);
    });

    it('should return null for invalid string', () => {
      expect(parseCurrency('', 'USD' as any)).toBeNull();
      expect(parseCurrency('abc', 'USD' as any)).toBeNull();
    });

    it('should return null for null input', () => {
      expect(parseCurrency(null as any, 'USD' as any)).toBeNull();
    });
  });

  describe('getCurrencyDisplay', () => {
    it('should return display string for USD', () => {
      const display = getCurrencyDisplay('USD' as any);
      expect(display).toContain('$');
      expect(display).toContain('USD');
    });

    it('should return display string for VND', () => {
      const display = getCurrencyDisplay('VND' as any);
      expect(display).toContain('đ');
      expect(display).toContain('VND');
    });
  });

  describe('isValidCurrencyCode', () => {
    it('should return true for valid codes', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
      expect(isValidCurrencyCode('VND')).toBe(true);
    });

    it('should return false for invalid codes', () => {
      expect(isValidCurrencyCode('EUR')).toBe(false);
      expect(isValidCurrencyCode('XYZ')).toBe(false);
      expect(isValidCurrencyCode('')).toBe(false);
    });
  });

  describe('getExchangeRate', () => {
    it('should return 1 for same currency', () => {
      expect(getExchangeRate('USD' as any, 'USD' as any)).toBe(1);
    });

    it('should return correct rate for USD to VND', () => {
      expect(getExchangeRate('USD' as any, 'VND' as any)).toBe(24500);
    });

    it('should return correct rate for VND to USD', () => {
      const rate = getExchangeRate('VND' as any, 'USD' as any);
      expect(rate).toBeCloseTo(1 / 24500, 10);
    });

    it('should throw for invalid currency', () => {
      expect(() => getExchangeRate('XYZ' as any, 'USD' as any)).toThrow();
    });
  });
});
