/**
 * Unit tests for @rentalshop/utils - String Utilities
 */
import {
  formatPhoneNumber,
  formatPhoneNumberMasked,
  generateSlug,
  truncateText,
  isValidEmail,
  validateEmail,
  isValidPhone,
  capitalizeWords,
  normalizeWhitespace,
  generateRandomString,
  isEmpty,
  getInitials,
  removeEmptyFields,
  removeVietnameseDiacritics,
  formatFullName,
} from '../../../packages/utils/src/core/string-utils';

describe('@rentalshop/utils - String Utilities', () => {
  describe('formatPhoneNumber', () => {
    it('should format 10-digit Vietnamese phone number', () => {
      expect(formatPhoneNumber('0912345678')).toBe('091 234 5678');
    });

    it('should format 11-digit phone number', () => {
      expect(formatPhoneNumber('09123456789')).toBe('0912 345 6789');
    });

    it('should return N/A for null or undefined', () => {
      expect(formatPhoneNumber(null)).toBe('N/A');
      expect(formatPhoneNumber(undefined)).toBe('N/A');
    });

    it('should return original for non-standard length', () => {
      expect(formatPhoneNumber('12345')).toBe('12345');
    });
  });

  describe('formatPhoneNumberMasked', () => {
    it('should mask 10-digit phone number', () => {
      expect(formatPhoneNumberMasked('0912345678')).toBe('091***678');
    });

    it('should return N/A for null', () => {
      expect(formatPhoneNumberMasked(null)).toBe('N/A');
    });

    it('should handle short phone numbers', () => {
      expect(formatPhoneNumberMasked('12345')).toBe('12345');
    });

    it('should mask 6-9 digit numbers with 2+2 pattern', () => {
      expect(formatPhoneNumberMasked('123456')).toBe('12***56');
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from English text', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should handle Vietnamese text', () => {
      expect(generateSlug('Hàng trăm người')).toBe('hang-tram-nguoi');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello! @World#')).toBe('hello-world');
    });

    it('should handle numbers with dots', () => {
      expect(generateSlug('1.200 cây mai')).toBe('1200-cay-mai');
    });

    it('should return empty string for empty input', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('hello   world')).toBe('hello-world');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug(' -hello world- ')).toBe('hello-world');
    });
  });

  describe('truncateText', () => {
    it('should truncate text longer than maxLength', () => {
      expect(truncateText('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate text shorter than maxLength', () => {
      expect(truncateText('Hi', 10)).toBe('Hi');
    });

    it('should handle exact length', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return undefined for valid email', () => {
      expect(validateEmail('test@example.com')).toBeUndefined();
    });

    it('should return error for invalid email', () => {
      expect(validateEmail('invalid')).toBeDefined();
    });

    it('should return required message when required and empty', () => {
      expect(validateEmail('', { required: true })).toBe('Email is required');
    });

    it('should return undefined when not required and empty', () => {
      expect(validateEmail('', { required: false })).toBeUndefined();
    });

    it('should use custom error messages', () => {
      expect(validateEmail('', { required: true, requiredMessage: 'Bắt buộc' })).toBe('Bắt buộc');
    });
  });

  describe('isValidPhone', () => {
    it('should validate Vietnamese phone numbers', () => {
      expect(isValidPhone('0912345678')).toBe(true);
      expect(isValidPhone('0312345678')).toBe(true);
      expect(isValidPhone('+84912345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('12345')).toBe(false);
      expect(isValidPhone('0112345678')).toBe(false);
    });
  });

  describe('capitalizeWords', () => {
    it('should capitalize first letter of each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('should handle already capitalized text', () => {
      expect(capitalizeWords('HELLO WORLD')).toBe('Hello World');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces', () => {
      expect(normalizeWhitespace('hello   world')).toBe('hello world');
    });

    it('should trim leading and trailing spaces', () => {
      expect(normalizeWhitespace('  hello  ')).toBe('hello');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\nworld')).toBe('hello world');
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of specified length', () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(32)).toHaveLength(32);
    });

    it('should generate different strings each time', () => {
      const str1 = generateRandomString(20);
      const str2 = generateRandomString(20);
      expect(str1).not.toBe(str2);
    });

    it('should only contain alphanumeric characters', () => {
      const str = generateRandomString(100);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should limit to 2 characters', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });
  });

  describe('removeEmptyFields', () => {
    it('should remove empty strings', () => {
      const result = removeEmptyFields({ name: 'John', email: '' });
      expect(result).toEqual({ name: 'John' });
    });

    it('should remove null and undefined', () => {
      const result = removeEmptyFields({ name: 'John', age: null, city: undefined });
      expect(result).toEqual({ name: 'John' });
    });

    it('should keep zero and false', () => {
      const result = removeEmptyFields({ count: 0, active: false });
      expect(result).toEqual({ count: 0, active: false });
    });

    it('should remove empty arrays', () => {
      const result = removeEmptyFields({ items: [], name: 'test' });
      expect(result).toEqual({ name: 'test' });
    });

    it('should remove NaN numbers', () => {
      const result = removeEmptyFields({ value: NaN, name: 'test' });
      expect(result).toEqual({ name: 'test' });
    });
  });

  describe('removeVietnameseDiacritics', () => {
    it('should remove Vietnamese diacritics', () => {
      expect(removeVietnameseDiacritics('Nguyễn Văn A')).toBe('Nguyen Van A');
    });

    it('should handle đ character', () => {
      expect(removeVietnameseDiacritics('Đà Nẵng')).toBe('Da Nang');
    });

    it('should keep non-Vietnamese characters unchanged', () => {
      expect(removeVietnameseDiacritics('Hello World 123')).toBe('Hello World 123');
    });

    it('should handle empty string', () => {
      expect(removeVietnameseDiacritics('')).toBe('');
    });
  });

  describe('formatFullName', () => {
    it('should format full name from first and last', () => {
      expect(formatFullName('Trinh', 'Duc')).toBe('Trinh Duc');
    });

    it('should handle null lastName', () => {
      expect(formatFullName('Trinh', null)).toBe('Trinh');
    });

    it('should handle null firstName', () => {
      expect(formatFullName(null, 'Duc')).toBe('Duc');
    });

    it('should return null when both are null', () => {
      expect(formatFullName(null, null)).toBeNull();
    });

    it('should return null when both are empty strings', () => {
      expect(formatFullName('', '')).toBeNull();
    });

    it('should trim whitespace', () => {
      expect(formatFullName('  Trinh  ', '  Duc  ')).toBe('Trinh Duc');
    });
  });
});
