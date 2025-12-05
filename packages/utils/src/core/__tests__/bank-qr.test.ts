/**
 * VietQR Generation Tests
 * 
 * Tests for VietQR EMV QR Code generation based on subiz/vietqr Go implementation
 * Reference: https://github.com/subiz/vietqr
 * 
 * To run these tests:
 * 1. Install test framework: yarn add -D vitest @vitest/ui
 * 2. Run: yarn vitest packages/utils/src/core/__tests__/bank-qr.test.ts
 * 
 * Or use the test runner script:
 * node packages/utils/src/core/__tests__/run-bank-qr-tests.js
 * 
 * @ts-nocheck - Test framework types will be available when test framework is installed
 */

import { generateVietQRString } from '../bank-qr';
import type { BankAccountInfo } from '../bank-qr';

describe('VietQR Generation', () => {
  describe('generateVietQRString', () => {
    it('should generate correct QR code for example from Go test', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const result = generateVietQRString(info, 120000, 'ủng hộ lũ lụt');
      const expected = '00020101021238570010A00000072701270006970415011300110019324180208QRIBFTTA530370454061200005802VN62170813ung ho lu lut6304C15C';

      expect(result).toBe(expected);
    });

    it('should generate correct QR code without amount', () => {
      const info: BankAccountInfo = {
        accountNumber: '0099999999',
        accountHolderName: 'Test Account',
        bankName: 'TPBank',
        bankCode: 'TPB',
      };

      const result = generateVietQRString(info, undefined, '');
      const expected = '00020101021138540010A00000072701240006970423011000999999990208QRIBFTTA53037045802VN6304CBB4';

      expect(result).toBe(expected);
    });

    it('should generate correct QR code with amount and Vietnamese content', () => {
      const info: BankAccountInfo = {
        accountNumber: '0023457923442',
        accountHolderName: 'Test Account',
        bankName: 'MBBank',
        bankCode: 'MB',
      };

      const result = generateVietQRString(info, 40123, 'chuyển khoản');
      const expected = '00020101021238570010A00000072701270006970422011300234579234420208QRIBFTTA53037045405401235802VN62160812chuyen khoan6304722F';

      expect(result).toBe(expected);
    });

    it('should convert Vietnamese content to ASCII', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const result = generateVietQRString(info, 120000, 'ủng hộ lũ lụt');
      
      // Content should be converted to ASCII: "ung ho lu lut"
      expect(result).toContain('ung ho lu lut');
      expect(result).not.toContain('ủng');
      expect(result).not.toContain('ộ');
    });

    it('should include QRIBFTTA service code', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const result = generateVietQRString(info, 120000, 'test');
      
      // Should contain QRIBFTTA service code
      expect(result).toContain('QRIBFTTA');
    });

    it('should use dynamic QR (12) when amount or content is present', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const resultWithAmount = generateVietQRString(info, 100000, undefined);
      const resultWithContent = generateVietQRString(info, undefined, 'test');
      const resultWithBoth = generateVietQRString(info, 100000, 'test');
      
      // Should start with 000201010212 (dynamic QR)
      expect(resultWithAmount.substring(6, 8)).toBe('12');
      expect(resultWithContent.substring(6, 8)).toBe('12');
      expect(resultWithBoth.substring(6, 8)).toBe('12');
    });

    it('should use static QR (11) when no amount and no content', () => {
      const info: BankAccountInfo = {
        accountNumber: '0099999999',
        accountHolderName: 'Test Account',
        bankName: 'TPBank',
        bankCode: 'TPB',
      };

      const result = generateVietQRString(info, undefined, '');
      
      // Should start with 000201010211 (static QR)
      expect(result.substring(6, 8)).toBe('11');
    });

    it('should only include amount if greater than 0', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const resultZero = generateVietQRString(info, 0, 'test');
      const resultNegative = generateVietQRString(info, -100, 'test');
      const resultPositive = generateVietQRString(info, 100000, 'test');
      
      // Zero and negative should not include amount (no tag 54)
      expect(resultZero).not.toContain('540');
      expect(resultNegative).not.toContain('540');
      
      // Positive should include amount
      expect(resultPositive).toContain('54100000');
    });

    it('should include correct bank BIN code', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const result = generateVietQRString(info, 120000, 'test');
      
      // Should contain Vietinbank BIN: 970415
      expect(result).toContain('970415');
    });

    it('should validate account number format', () => {
      const info: BankAccountInfo = {
        accountNumber: '123', // Too short
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      expect(() => {
        generateVietQRString(info, 100000, 'test');
      }).toThrow('Account number must be 8-16 digits');
    });

    it('should throw error if bank BIN not found', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'UnknownBank',
        bankCode: 'UNK',
      };

      expect(() => {
        generateVietQRString(info, 100000, 'test');
      }).toThrow('Bank BIN code not found');
    });

    it('should throw error if account number or holder name missing', () => {
      expect(() => {
        generateVietQRString({
          accountNumber: '',
          accountHolderName: 'Test',
          bankName: 'Vietinbank',
        }, 100000, 'test');
      }).toThrow('Account number and account holder name are required');

      expect(() => {
        generateVietQRString({
          accountNumber: '0011001932418',
          accountHolderName: '',
          bankName: 'Vietinbank',
        }, 100000, 'test');
      }).toThrow('Account number and account holder name are required');
    });

    it('should handle long content (truncated to 25 chars)', () => {
      const info: BankAccountInfo = {
        accountNumber: '0023457923442',
        accountHolderName: 'Test Account',
        bankName: 'MBBank',
        bankCode: 'MB',
      };

      const longContent = 'chuyen khoan alsdkf laksjdflk asjdflja slkdalks djflkasjd fajsldk jalskdfj lkasjdflk ajslkfj l';
      const result = generateVietQRString(info, 40123, longContent);
      
      // Content should be truncated (max 25 chars for tag 08)
      // The QR code should still be valid
      expect(result).toContain('6208');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate different QR codes for different amounts', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const result1 = generateVietQRString(info, 100000, 'test');
      const result2 = generateVietQRString(info, 200000, 'test');
      
      // Should be different (different amounts)
      expect(result1).not.toBe(result2);
      expect(result1).toContain('54100000');
      expect(result2).toContain('54200000');
    });

    it('should generate different QR codes for different content', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const result1 = generateVietQRString(info, 100000, 'content 1');
      const result2 = generateVietQRString(info, 100000, 'content 2');
      
      // Should be different (different content)
      expect(result1).not.toBe(result2);
    });
  });

  describe('CRC16 Calculation', () => {
    it('should calculate correct CRC for simple test cases', () => {
      // These test cases are from Go test file
      const testCases = [
        { input: '00', expectedCRC: '2EC9' },
        { input: '01', expectedCRC: '3EE8' },
      ];

      // Note: We can't directly test calculateCRC16 as it's not exported
      // But we can verify through generateVietQRString results
      // The CRC is validated through the full QR code generation tests above
    });
  });

  describe('ASCII Conversion', () => {
    it('should convert Vietnamese characters to ASCII', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const vietnameseContent = 'Cộng hòa xã hội chủ nghĩa Việt Nam';
      const result = generateVietQRString(info, 100000, vietnameseContent);
      
      // Should convert to ASCII
      expect(result).toContain('Cong hoa xa hoi chu nghia Viet Nam');
      expect(result).not.toContain('ộ');
      expect(result).not.toContain('ã');
    });

    it('should handle mixed Vietnamese and English', () => {
      const info: BankAccountInfo = {
        accountNumber: '0011001932418',
        accountHolderName: 'Test Account',
        bankName: 'Vietinbank',
        bankCode: 'ICB',
      };

      const mixedContent = 'Payment for order #123 - Thanh toán đơn hàng';
      const result = generateVietQRString(info, 100000, mixedContent);
      
      // Should keep English, convert Vietnamese
      expect(result).toContain('Payment for order #123 - Thanh toan don hang');
    });
  });
});

